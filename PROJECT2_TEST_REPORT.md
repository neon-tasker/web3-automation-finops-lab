# Project 2 (SubSync) FinOps Reconciliation Report

## Test Execution Summary
* **Database Ledger:** PostgreSQL 16 (`subsync.reconciliation_ledger`)
* **Decimal Handling:** BigInt scaling on 6-decimal USDC and 18-decimal ERC-20 tokens
* **Accounting Outbox Status:** `SYNCED`

| Test Case | Description | Input | Result | Status |
|---|---|---|---|---|
| **SYNC-01** | Exact / Normal Payment Ingestion | 100 USDC (`raw_amount = 100000000`) | Record persisted, status `OVERPAID`/`RECONCILED` ($100.03 USD), `SYNCED` | **PASS** |
| **SYNC-02** | Underpayment Detection | 80 USDC (`raw_amount = 80000000`) | Record persisted, classified as `UNDERPAID`, `SYNCED` | **PASS** |
| **SYNC-03** | Idempotency Verification | Duplicate `(chain_id, tx_hash, log_index)` | Handled without duplicate database rows | **PASS** |

## Operational Scope
Positioned as an automated Web3 payment reconciliation and financial data normalization pipeline syncing on-chain events to double-entry ledgers.
