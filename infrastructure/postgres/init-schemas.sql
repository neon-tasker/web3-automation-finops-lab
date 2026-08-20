CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE SCHEMA IF NOT EXISTS secops;
CREATE SCHEMA IF NOT EXISTS subsync;
CREATE SCHEMA IF NOT EXISTS agentic_guard;

CREATE TABLE IF NOT EXISTS secops.incidents (
    incident_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_chain_id BIGINT NOT NULL,
    contract_address VARCHAR(42) NOT NULL,
    event_signature VARCHAR(255) NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    severity_level VARCHAR(20) NOT NULL CHECK (severity_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status VARCHAR(30) NOT NULL CHECK (status IN ('DETECTED', 'SIMULATED', 'AWAITING_APPROVAL', 'EXECUTING', 'EXECUTED', 'RECOVERED', 'FAILED', 'REJECTED')),
    anomaly_payload JSONB NOT NULL,
    simulation_result JSONB,
    approval_token VARCHAR(64),
    approval_deadline TIMESTAMPTZ,
    remediation_tx_hash VARCHAR(66),
    CONSTRAINT uq_secops_tx_event UNIQUE (tx_hash, event_signature)
);

CREATE TABLE IF NOT EXISTS secops.audit_log (
    audit_id BIGSERIAL PRIMARY KEY,
    incident_id UUID NOT NULL REFERENCES secops.incidents(incident_id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    state_before VARCHAR(30),
    state_after VARCHAR(30),
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_secops_status_chain ON secops.incidents(source_chain_id, status);

CREATE TABLE IF NOT EXISTS subsync.reconciliation_ledger (
    ledger_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    chain_id BIGINT NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    log_index INTEGER NOT NULL,
    block_number BIGINT NOT NULL,
    block_timestamp TIMESTAMPTZ NOT NULL,
    sender_address VARCHAR(42) NOT NULL,
    recipient_address VARCHAR(42) NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    raw_amount NUMERIC(78, 0) NOT NULL,
    token_decimals INTEGER NOT NULL,
    token_symbol VARCHAR(20) NOT NULL,
    fiat_rate_usd NUMERIC(18, 6) NOT NULL,
    fiat_amount_usd NUMERIC(18, 2) NOT NULL,
    customer_id VARCHAR(100) NOT NULL DEFAULT 'CUST_ANONYMOUS',
    invoice_id VARCHAR(100) NOT NULL DEFAULT 'INV_UNASSIGNED',
    status VARCHAR(30) NOT NULL CHECK (status IN ('PENDING_FINALITY', 'CONFIRMED', 'RECONCILED', 'UNDERPAID', 'OVERPAID', 'ORPHANED', 'FAILED')),
    accounting_sync_status VARCHAR(30) NOT NULL DEFAULT 'UNSYNCED' CHECK (accounting_sync_status IN ('UNSYNCED', 'SYNCED', 'RETRY_PENDING', 'PERMANENT_FAILURE')),
    accounting_sync_response JSONB,
    retry_count INTEGER NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_subsync_event_unique UNIQUE (chain_id, tx_hash, log_index)
);

CREATE INDEX IF NOT EXISTS idx_subsync_outbox_queue ON subsync.reconciliation_ledger(accounting_sync_status, next_retry_at) 
WHERE accounting_sync_status = 'RETRY_PENDING' OR accounting_sync_status = 'UNSYNCED';

CREATE TABLE IF NOT EXISTS agentic_guard.policies (
    policy_id VARCHAR(64) PRIMARY KEY,
    description TEXT NOT NULL,
    max_value_per_tx_usd NUMERIC(18, 2) NOT NULL,
    hourly_velocity_limit_usd NUMERIC(18, 2) NOT NULL,
    daily_spending_limit_usd NUMERIC(18, 2) NOT NULL,
    human_approval_threshold_usd NUMERIC(18, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS agentic_guard.allowlists (
    entry_id BIGSERIAL PRIMARY KEY,
    policy_id VARCHAR(64) NOT NULL REFERENCES agentic_guard.policies(policy_id) ON DELETE CASCADE,
    target_contract VARCHAR(42) NOT NULL,
    allowed_selector VARCHAR(10) NOT NULL,
    allowed_recipient VARCHAR(42),
    chain_id BIGINT NOT NULL,
    CONSTRAINT uq_guard_allowlist_entry UNIQUE (policy_id, target_contract, allowed_selector, allowed_recipient, chain_id)
);

CREATE TABLE IF NOT EXISTS agentic_guard.intent_executions (
    intent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id VARCHAR(64) NOT NULL REFERENCES agentic_guard.policies(policy_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    agent_id VARCHAR(100) NOT NULL,
    target_contract VARCHAR(42) NOT NULL,
    function_selector VARCHAR(10) NOT NULL,
    raw_calldata TEXT NOT NULL,
    computed_value_usd NUMERIC(18, 2) NOT NULL,
    evaluation_status VARCHAR(30) NOT NULL CHECK (evaluation_status IN ('EVALUATING', 'APPROVED', 'BLOCKED', 'AWAITING_2FA', 'EXECUTED', 'REVERTED')),
    rejection_reason TEXT,
    simulation_output JSONB,
    submitted_tx_hash VARCHAR(66),
    idempotency_hash VARCHAR(64) NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_guard_velocity_check ON agentic_guard.intent_executions(policy_id, created_at, evaluation_status);

INSERT INTO agentic_guard.policies (policy_id, description, max_value_per_tx_usd, hourly_velocity_limit_usd, daily_spending_limit_usd, human_approval_threshold_usd, is_active)
VALUES ('DEF-AGENT-POLICY-V1', 'Production Default Rebalance and Transfer Policy', 500.00, 1500.00, 5000.00, 250.00, TRUE)
ON CONFLICT (policy_id) DO NOTHING;

INSERT INTO agentic_guard.allowlists (policy_id, target_contract, allowed_selector, allowed_recipient, chain_id)
VALUES 
('DEF-AGENT-POLICY-V1', '0x5fbdb2315678afecb367f032d93f642f64180aa3', '0xa9059cbb', '0x70997970c51812dc3a010c7d01b50e0d17dc79c8', 31337),
('DEF-AGENT-POLICY-V1', '0x5fbdb2315678afecb367f032d93f642f64180aa3', '0x6d4ce63c', NULL, 31337)
ON CONFLICT DO NOTHING;
