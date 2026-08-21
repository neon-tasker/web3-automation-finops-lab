import { Pool } from 'pg';

interface AgentIntent {
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
interface PolicyRule {
    policyId: string;
    maxValuePerTxUsd: number;
    hourlyVelocityLimitUsd: number;
    dailySpendingLimitUsd: number;
    humanApprovalThresholdUsd: number;
    isActive: boolean;
}
interface AllowlistEntry {
    policyId: string;
    targetContract: string;
    allowedSelector: string;
    allowedRecipient?: string | null;
    chainId: number;
}
type FirewallDecision = 'APPROVED' | 'AWAITING_2FA' | 'BLOCKED';
interface EvaluationResult {
    decision: FirewallDecision;
    reason?: string;
    idempotencyHash: string;
    computedCalldata?: string;
    executedValueUsd?: number;
}
interface IStateStore {
    getPolicy(policyId: string): Promise<PolicyRule | null>;
    isAllowlisted(entry: Omit<AllowlistEntry, 'policyId'> & {
        policyId: string;
    }): Promise<boolean>;
    getHourlySpend(policyId: string): Promise<number>;
    getDailySpend?(policyId: string): Promise<number>;
    recordExecution(intent: AgentIntent, decision: FirewallDecision, hash: string): Promise<void>;
    isDuplicateNonce(idempotencyHash: string): Promise<boolean>;
}

declare const INTENT_SCHEMA: {
    readonly $schema: "http://json-schema.org/draft-07/schema#";
    readonly type: "object";
    readonly required: readonly ["agentId", "policyId", "chainId", "targetContract", "functionSignature", "recipientAddress", "amountWei", "estimatedValueUsd", "nonce", "timestamp"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly agentId: {
            readonly type: "string";
            readonly pattern: "^agent-[a-zA-Z0-9_-]{3,32}$";
        };
        readonly policyId: {
            readonly type: "string";
            readonly minLength: 3;
            readonly maxLength: 64;
        };
        readonly chainId: {
            readonly type: "integer";
            readonly minimum: 1;
        };
        readonly targetContract: {
            readonly type: "string";
            readonly pattern: "^0x[a-fA-F0-9]{40}$";
        };
        readonly functionSignature: {
            readonly type: "string";
            readonly enum: readonly ["transfer(address,uint256)", "approve(address,uint256)", "emergencyPause(string)"];
        };
        readonly recipientAddress: {
            readonly type: "string";
            readonly pattern: "^0x[a-fA-F0-9]{40}$";
        };
        readonly amountWei: {
            readonly type: "string";
            readonly pattern: "^[0-9]{1,78}$";
        };
        readonly estimatedValueUsd: {
            readonly type: "number";
            readonly minimum: 0.01;
            readonly maximum: 1000000;
        };
        readonly nonce: {
            readonly type: "string";
            readonly pattern: "^[a-fA-F0-9]{16,64}$";
        };
        readonly timestamp: {
            readonly type: "integer";
            readonly minimum: 1700000000;
        };
    };
};

declare class AgenticFirewall {
    private store;
    private validateSchema;
    constructor(store: IStateStore);
    computeIdempotencyHash(intent: AgentIntent): string;
    evaluate(intentPayload: unknown): Promise<EvaluationResult>;
}

declare class InMemoryStore implements IStateStore {
    private policies;
    private allowlists;
    private executions;
    addPolicy(policy: PolicyRule): void;
    addAllowlist(entry: AllowlistEntry): void;
    getPolicy(policyId: string): Promise<PolicyRule | null>;
    isAllowlisted(entry: Omit<AllowlistEntry, 'policyId'> & {
        policyId: string;
    }): Promise<boolean>;
    getHourlySpend(policyId: string): Promise<number>;
    getDailySpend(policyId: string): Promise<number>;
    recordExecution(intent: AgentIntent, decision: FirewallDecision, hash: string): Promise<void>;
    isDuplicateNonce(idempotencyHash: string): Promise<boolean>;
}

declare class PostgresStore implements IStateStore {
    private pool;
    constructor(pool: Pool);
    getPolicy(policyId: string): Promise<PolicyRule | null>;
    isAllowlisted(entry: Omit<AllowlistEntry, 'policyId'> & {
        policyId: string;
    }): Promise<boolean>;
    getHourlySpend(policyId: string): Promise<number>;
    getDailySpend(policyId: string): Promise<number>;
    recordExecution(intent: AgentIntent, decision: FirewallDecision, hash: string): Promise<void>;
    isDuplicateNonce(idempotencyHash: string): Promise<boolean>;
}

export { type AgentIntent, AgenticFirewall, type AllowlistEntry, type EvaluationResult, type FirewallDecision, INTENT_SCHEMA, type IStateStore, InMemoryStore, type PolicyRule, PostgresStore };
