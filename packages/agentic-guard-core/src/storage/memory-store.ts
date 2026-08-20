import { IStateStore, PolicyRule, AllowlistEntry, AgentIntent, FirewallDecision } from '../types';

export class InMemoryStore implements IStateStore {
  private policies = new Map<string, PolicyRule>();
  private allowlists: AllowlistEntry[] = [];
  private executions: Array<{ intent: AgentIntent; decision: FirewallDecision; hash: string; timestamp: number }> = [];

  public addPolicy(policy: PolicyRule): void {
    this.policies.set(policy.policyId, policy);
  }

  public addAllowlist(entry: AllowlistEntry): void {
    this.allowlists.push({
      ...entry,
      targetContract: entry.targetContract.toLowerCase(),
      allowedRecipient: entry.allowedRecipient?.toLowerCase() ?? null
    });
  }

  async getPolicy(policyId: string): Promise<PolicyRule | null> {
    return this.policies.get(policyId) || null;
  }

  async isAllowlisted(entry: Omit<AllowlistEntry, 'policyId'> & { policyId: string }): Promise<boolean> {
    return this.allowlists.some(
      a =>
        a.policyId === entry.policyId &&
        a.targetContract === entry.targetContract.toLowerCase() &&
        a.allowedSelector === entry.allowedSelector &&
        a.chainId === entry.chainId &&
        (a.allowedRecipient === null || a.allowedRecipient === (entry.allowedRecipient?.toLowerCase() ?? null))
    );
  }

  async getHourlySpend(policyId: string): Promise<number> {
    const oneHourAgo = Date.now() - 3600000;
    return this.executions
      .filter(e => e.intent.policyId === policyId && e.decision === 'APPROVED' && e.timestamp >= oneHourAgo)
      .reduce((acc, e) => acc + e.intent.estimatedValueUsd, 0);
  }

  async getDailySpend(policyId: string): Promise<number> {
    const oneDayAgo = Date.now() - 86400000;
    return this.executions
      .filter(e => e.intent.policyId === policyId && e.decision === 'APPROVED' && e.timestamp >= oneDayAgo)
      .reduce((acc, e) => acc + e.intent.estimatedValueUsd, 0);
  }

  async recordExecution(intent: AgentIntent, decision: FirewallDecision, hash: string): Promise<void> {
    this.executions.push({ intent, decision, hash, timestamp: Date.now() });
  }

  async isDuplicateNonce(idempotencyHash: string): Promise<boolean> {
    return this.executions.some(e => e.hash === idempotencyHash);
  }
}
