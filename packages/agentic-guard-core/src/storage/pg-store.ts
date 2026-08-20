import { Pool } from 'pg';
import { IStateStore, PolicyRule, AllowlistEntry, AgentIntent, FirewallDecision } from '../types';

export class PostgresStore implements IStateStore {
  constructor(private pool: Pool) {}

  async getPolicy(policyId: string): Promise<PolicyRule | null> {
    const res = await this.pool.query(
      'SELECT policy_id as "policyId", max_value_per_tx_usd as "maxValuePerTxUsd", hourly_velocity_limit_usd as "hourlyVelocityLimitUsd", daily_spending_limit_usd as "dailySpendingLimitUsd", human_approval_threshold_usd as "humanApprovalThresholdUsd", is_active as "isActive" FROM agentic_guard.policies WHERE policy_id = $1',
      [policyId]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      policyId: r.policyId,
      maxValuePerTxUsd: Number(r.maxValuePerTxUsd),
      hourlyVelocityLimitUsd: Number(r.hourlyVelocityLimitUsd),
      dailySpendingLimitUsd: Number(r.dailySpendingLimitUsd),
      humanApprovalThresholdUsd: Number(r.humanApprovalThresholdUsd),
      isActive: r.isActive
    };
  }

  async isAllowlisted(entry: Omit<AllowlistEntry, 'policyId'> & { policyId: string }): Promise<boolean> {
    const res = await this.pool.query(
      `SELECT entry_id FROM agentic_guard.allowlists 
       WHERE policy_id = $1 AND target_contract = $2 AND allowed_selector = $3 AND chain_id = $4
         AND (allowed_recipient IS NULL OR allowed_recipient = $5)`,
      [
        entry.policyId,
        entry.targetContract.toLowerCase(),
        entry.allowedSelector,
        entry.chainId,
        entry.allowedRecipient ? entry.allowedRecipient.toLowerCase() : null
      ]
    );
    return res.rows.length > 0;
  }

  async getHourlySpend(policyId: string): Promise<number> {
    const res = await this.pool.query(
      `SELECT COALESCE(SUM(computed_value_usd), 0) as spend 
       FROM agentic_guard.intent_executions 
       WHERE policy_id = $1 AND evaluation_status IN ('APPROVED', 'EXECUTED') AND created_at >= NOW() - interval '1 hour'`,
      [policyId]
    );
    return Number(res.rows[0].spend);
  }

  async getDailySpend(policyId: string): Promise<number> {
    const res = await this.pool.query(
      `SELECT COALESCE(SUM(computed_value_usd), 0) as spend 
       FROM agentic_guard.intent_executions 
       WHERE policy_id = $1 AND evaluation_status IN ('APPROVED', 'EXECUTED') AND created_at >= NOW() - interval '24 hours'`,
      [policyId]
    );
    return Number(res.rows[0].spend);
  }

  async recordExecution(intent: AgentIntent, decision: FirewallDecision, hash: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO agentic_guard.intent_executions 
       (policy_id, agent_id, target_contract, function_selector, raw_calldata, computed_value_usd, evaluation_status, idempotency_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (idempotency_hash) DO NOTHING`,
      [
        intent.policyId,
        intent.agentId,
        intent.targetContract.toLowerCase(),
        intent.functionSignature.substring(0, 10),
        '0x',
        intent.estimatedValueUsd,
        decision,
        hash
      ]
    );
  }

  async isDuplicateNonce(idempotencyHash: string): Promise<boolean> {
    const res = await this.pool.query(
      'SELECT intent_id FROM agentic_guard.intent_executions WHERE idempotency_hash = $1',
      [idempotencyHash]
    );
    return res.rows.length > 0;
  }
}
