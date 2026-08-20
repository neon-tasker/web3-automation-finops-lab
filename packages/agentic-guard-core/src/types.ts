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

export interface PolicyRule {
  policyId: string;
  maxValuePerTxUsd: number;
  hourlyVelocityLimitUsd: number;
  dailySpendingLimitUsd: number;
  humanApprovalThresholdUsd: number;
  isActive: boolean;
}

export interface AllowlistEntry {
  policyId: string;
  targetContract: string;
  allowedSelector: string;
  allowedRecipient?: string | null;
  chainId: number;
}

export type FirewallDecision = 'APPROVED' | 'AWAITING_2FA' | 'BLOCKED';

export interface EvaluationResult {
  decision: FirewallDecision;
  reason?: string;
  idempotencyHash: string;
  computedCalldata?: string;
  executedValueUsd?: number;
}

export interface IStateStore {
  getPolicy(policyId: string): Promise<PolicyRule | null>;
  isAllowlisted(entry: Omit<AllowlistEntry, 'policyId'> & { policyId: string }): Promise<boolean>;
  getHourlySpend(policyId: string): Promise<number>;
  getDailySpend?(policyId: string): Promise<number>;
  recordExecution(intent: AgentIntent, decision: FirewallDecision, hash: string): Promise<void>;
  isDuplicateNonce(idempotencyHash: string): Promise<boolean>;
}
