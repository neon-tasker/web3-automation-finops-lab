# Baseline Functional Test Report (Phase 1)

## Executive Summary
All three core systems passed baseline functional validation under local orchestration.

| Test ID | Project | Expected | Actual | Status | Evidence |
|---|---|---|---|---|---|
| BASE-01 | **SecOps** | Trigger breaker -> On-chain `paused = true` | `status: EXECUTED`, `paused = true` | **PASS** | Anvil storage slot updated, response `txHash` issued |
| BASE-02 | **SubSync** | Process payment event -> Generate ledger UUID | `ledger_id: <UUID>`, DB status `SYNCED` | **PASS** | PostgreSQL `subsync.reconciliation_ledger` row recorded |
| BASE-03 | **Agentic Guard** | Validate micro-intent -> Return `APPROVED` | `decision: APPROVED` | **PASS** | Evaluated against policy `DEF-AGENT-POLICY-V1` |

## Checkpoint Baseline
* System healthy, containers running, baseline tests green.
