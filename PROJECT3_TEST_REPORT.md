# Project 3 (Agentic Guard) Policy Firewall Report

## Test Execution Summary
* **Policy Engine:** n8n Orchestrator + PostgreSQL 16 Pessimistic Locking
* **Active Policy:** `DEF-AGENT-POLICY-V1` ($500.00 max per tx cap)
* **Allowlist Enforcement:** Strict relational join against `agentic_guard.allowlists`

| Test Case | Description | Input | Result | Status |
|---|---|---|---|---|
| **GRD-01** | Valid Authorized Micro-Intent | 1 ETH ($100 USD) to allowlisted target | Decision `APPROVED` | **PASS** |
| **GRD-02** | Transaction Cap Breach | $5,000.00 USD request | Decision `BLOCKED` (`EXCEEDS_SINGLE_TX_CAP`) | **PASS** |
| **GRD-03** | Unauthorized Target Rejection | Target `0x...dEaD` (unlisted address) | Decision `BLOCKED` (`UNAUTHORIZED_TARGET_CONTRACT`) | **PASS** |

## Operational Scope
Positioned as a deterministic pre-execution policy firewall between autonomous AI agents and EVM transaction signing/execution layers.
