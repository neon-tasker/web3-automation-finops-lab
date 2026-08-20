import Ajv from 'ajv';
import { ethers } from 'ethers';
import crypto from 'crypto';
import { INTENT_SCHEMA } from './schema';
import { AgentIntent, EvaluationResult, IStateStore } from './types';

const ajv = new Ajv({ allErrors: true, removeAdditional: false });

export class AgenticFirewall {
  private validateSchema = ajv.compile(INTENT_SCHEMA);

  constructor(private store: IStateStore) {}

  public computeIdempotencyHash(intent: AgentIntent): string {
    return crypto.createHash('sha256').update(`${intent.agentId}:${intent.policyId}:${intent.nonce}:${intent.chainId}`).digest('hex');
  }

  public async evaluate(intentPayload: unknown): Promise<EvaluationResult> {
    const isValid = this.validateSchema(intentPayload);
    if (!isValid) {
      const errorDetails = this.validateSchema.errors?.map(e => `${e.instancePath} ${e.message}`).join('; ');
      return { decision: 'BLOCKED', reason: `SCHEMA_VIOLATION: ${errorDetails}`, idempotencyHash: 'INVALID_PAYLOAD' };
    }

    const intent = intentPayload as AgentIntent;
    const idempotencyHash = this.computeIdempotencyHash(intent);

    const currentUnix = Math.floor(Date.now() / 1000);
    if (Math.abs(currentUnix - intent.timestamp) > 300) {
      return { decision: 'BLOCKED', reason: 'TIMESTAMP_DRIFT_EXCEEDED_300_SECONDS', idempotencyHash };
    }

    if (await this.store.isDuplicateNonce(idempotencyHash)) {
      return { decision: 'BLOCKED', reason: 'DUPLICATE_NONCE_REPLAY_ATTACK_PREVENTED', idempotencyHash };
    }

    const policy = await this.store.getPolicy(intent.policyId);
    if (!policy || !policy.isActive) {
      return { decision: 'BLOCKED', reason: `POLICY_INACTIVE_OR_UNAVAILABLE: ${intent.policyId}`, idempotencyHash };
    }

    const selector = ethers.id(intent.functionSignature).substring(0, 10);
    const allowlisted = await this.store.isAllowlisted({
      policyId: intent.policyId,
      targetContract: intent.targetContract,
      allowedSelector: selector,
      allowedRecipient: intent.recipientAddress,
      chainId: intent.chainId
    });

    if (!allowlisted) {
      return { decision: 'BLOCKED', reason: `ALLOWLIST_REJECT: Function selector ${selector} or target not authorized`, idempotencyHash };
    }

    if (intent.estimatedValueUsd > policy.maxValuePerTxUsd) {
      return { decision: 'BLOCKED', reason: `EXCEEDS_SINGLE_TX_CAP: $${intent.estimatedValueUsd} > $${policy.maxValuePerTxUsd}`, idempotencyHash };
    }

    const hourlySpend = await this.store.getHourlySpend(intent.policyId);
    if (hourlySpend + intent.estimatedValueUsd > policy.hourlyVelocityLimitUsd) {
      return { decision: 'BLOCKED', reason: `HOURLY_VELOCITY_BREACHED: Spent $${hourlySpend + intent.estimatedValueUsd} > Limit $${policy.hourlyVelocityLimitUsd}`, idempotencyHash };
    }

    if (this.store.getDailySpend) {
      const dailySpend = await this.store.getDailySpend(intent.policyId);
      if (dailySpend + intent.estimatedValueUsd > policy.dailySpendingLimitUsd) {
        return { decision: 'BLOCKED', reason: `DAILY_LIMIT_BREACHED: Spent $${dailySpend + intent.estimatedValueUsd} > Limit $${policy.dailySpendingLimitUsd}`, idempotencyHash };
      }
    }

    let finalDecision: 'APPROVED' | 'AWAITING_2FA' = 'APPROVED';
    if (intent.estimatedValueUsd >= policy.humanApprovalThresholdUsd) {
      finalDecision = 'AWAITING_2FA';
    }

    const abiCoder = new ethers.AbiCoder();
    let calldata = selector;
    if (intent.functionSignature === 'transfer(address,uint256)') {
      calldata += abiCoder.encode(['address', 'uint256'], [intent.recipientAddress, intent.amountWei]).substring(2);
    } else if (intent.functionSignature === 'approve(address,uint256)') {
      calldata += abiCoder.encode(['address', 'uint256'], [intent.recipientAddress, intent.amountWei]).substring(2);
    }

    await this.store.recordExecution(intent, finalDecision, idempotencyHash);

    return {
      decision: finalDecision,
      idempotencyHash,
      computedCalldata: calldata,
      executedValueUsd: intent.estimatedValueUsd
    };
  }
}
