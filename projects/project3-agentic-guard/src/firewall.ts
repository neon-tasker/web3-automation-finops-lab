import Ajv from 'ajv';
import { ethers } from 'ethers';
import crypto from 'crypto';
import { Pool } from 'pg';

const ajv = new Ajv({ allErrors: true, removeAdditional: false });
import schemaJson from '../policies/default-rules.json';

export interface AgentIntent {
  agentId: string;
  policyId: string;
  chainId: number;
  targetContract: string;
  functionSignature: string;
  recipientAddress: string;
  amountWei: string;
  estimatedValueUsd: number;
  nonce: string;
  timestamp: number;
}

export class HardenedAgenticFirewall {
  private validateSchema = ajv.compile(schemaJson);

  constructor(private pool: Pool) {}

  public computeIdempotencyHash(intent: AgentIntent): string {
    return crypto.createHash('sha256').update(`${intent.agentId}:${intent.policyId}:${intent.nonce}:${intent.chainId}`).digest('hex');
  }

  public async evaluate(intentPayload: unknown) {
    const isValid = this.validateSchema(intentPayload);
    if (!isValid) {
      const errs = this.validateSchema.errors?.map(e => `${e.instancePath} ${e.message}`).join('; ');
      return { decision: 'BLOCKED', reason: `SCHEMA_VIOLATION: ${errs}`, idempotencyHash: 'INVALID' };
    }

    const intent = intentPayload as AgentIntent;
    const idempotencyHash = this.computeIdempotencyHash(intent);

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - intent.timestamp) > 300) {
      return { decision: 'BLOCKED', reason: 'TIMESTAMP_DRIFT_EXCEEDED_300S', idempotencyHash };
    }

    const selector = ethers.id(intent.functionSignature).substring(0, 10);
    const abiCoder = new ethers.AbiCoder();
    let computedCalldata = selector;

    if (intent.functionSignature === 'transfer(address,uint256)') {
      computedCalldata += abiCoder.encode(['address', 'uint256'], [intent.recipientAddress, intent.amountWei]).substring(2);
      if (computedCalldata.length !== 138) {
        return { decision: 'BLOCKED', reason: 'MALFORMED_CALLDATA_LENGTH', idempotencyHash };
      }
    } else if (intent.functionSignature === 'approve(address,uint256)') {
      computedCalldata += abiCoder.encode(['address', 'uint256'], [intent.recipientAddress, intent.amountWei]).substring(2);
    } else if (intent.functionSignature === 'emergencyPause(string)') {
      computedCalldata += abiCoder.encode(['string'], ['Emergency Breaker Trigger']).substring(2);
    } else {
      return { decision: 'BLOCKED', reason: 'UNAUTHORIZED_FUNCTION_SIGNATURE', idempotencyHash };
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const dupCheck = await client.query('SELECT intent_id FROM agentic_guard.intent_executions WHERE idempotency_hash = $1', [idempotencyHash]);
      if (dupCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return { decision: 'BLOCKED', reason: 'DUPLICATE_NONCE_REPLAY_BLOCKED', idempotencyHash };
      }

      const policyRes = await client.query('SELECT * FROM agentic_guard.policies WHERE policy_id = $1 AND is_active = TRUE FOR UPDATE', [intent.policyId]);
      if (policyRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return { decision: 'BLOCKED', reason: `POLICY_NOT_FOUND: ${intent.policyId}`, idempotencyHash };
      }
      const policy = policyRes.rows[0];

      const allowlistRes = await client.query(
        `SELECT * FROM agentic_guard.allowlists 
         WHERE policy_id = $1 AND target_contract = $2 AND allowed_selector = $3 AND chain_id = $4
           AND (allowed_recipient IS NULL OR allowed_recipient = $5)`,
        [intent.policyId, intent.targetContract.toLowerCase(), selector, intent.chainId, intent.recipientAddress.toLowerCase()]
      );
      if (allowlistRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return { decision: 'BLOCKED', reason: 'ALLOWLIST_REJECT', idempotencyHash };
      }

      if (intent.estimatedValueUsd > Number(policy.max_value_per_tx_usd)) {
        await client.query('ROLLBACK');
        return { decision: 'BLOCKED', reason: `EXCEEDS_SINGLE_TX_CAP: $${intent.estimatedValueUsd} > $${policy.max_value_per_tx_usd}`, idempotencyHash };
      }

      const velocityRes = await client.query(
        `SELECT COALESCE(SUM(computed_value_usd), 0) as current_spend 
         FROM agentic_guard.intent_executions 
         WHERE policy_id = $1 AND evaluation_status IN ('APPROVED', 'EXECUTED') AND created_at >= NOW() - interval '1 hour'`,
        [intent.policyId]
      );
      const currentSpend = Number(velocityRes.rows[0].current_spend);
      if (currentSpend + intent.estimatedValueUsd > Number(policy.hourly_velocity_limit_usd)) {
        await client.query('ROLLBACK');
        return { decision: 'BLOCKED', reason: `HOURLY_VELOCITY_BREACHED: $${currentSpend + intent.estimatedValueUsd} > $${policy.hourly_velocity_limit_usd}`, idempotencyHash };
      }

      const dailyRes = await client.query(
        `SELECT COALESCE(SUM(computed_value_usd), 0) as daily_spend 
         FROM agentic_guard.intent_executions 
         WHERE policy_id = $1 AND evaluation_status IN ('APPROVED', 'EXECUTED') AND created_at >= NOW() - interval '24 hours'`,
        [intent.policyId]
      );
      const currentDailySpend = Number(dailyRes.rows[0].daily_spend);
      if (currentDailySpend + intent.estimatedValueUsd > Number(policy.daily_spending_limit_usd)) {
        await client.query('ROLLBACK');
        return { decision: 'BLOCKED', reason: `DAILY_LIMIT_BREACHED: $${currentDailySpend + intent.estimatedValueUsd} > $${policy.daily_spending_limit_usd}`, idempotencyHash };
      }

      let decision: 'APPROVED' | 'AWAITING_2FA' = 'APPROVED';
      if (intent.estimatedValueUsd >= Number(policy.human_approval_threshold_usd)) {
        decision = 'AWAITING_2FA';
      }

      await client.query(
        `INSERT INTO agentic_guard.intent_executions 
         (policy_id, agent_id, target_contract, function_selector, raw_calldata, computed_value_usd, evaluation_status, idempotency_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [intent.policyId, intent.agentId, intent.targetContract.toLowerCase(), selector, computedCalldata, intent.estimatedValueUsd, decision, idempotencyHash]
      );

      await client.query('COMMIT');
      return { decision, idempotencyHash, computedCalldata, executedValueUsd: intent.estimatedValueUsd };
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
