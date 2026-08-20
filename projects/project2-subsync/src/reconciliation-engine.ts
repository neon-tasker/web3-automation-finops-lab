import { Pool } from 'pg';
import axios from 'axios';
import BigNumber from 'bignumber.js';
import { SubSyncNormalizer } from './normalizer';

export interface RawPaymentEvent {
  chainId: number;
  txHash: string;
  logIndex: number;
  blockNumber: number;
  senderAddress: string;
  recipientAddress: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  rawAmountWei: string;
  customerId?: string;
  invoiceId?: string;
  expectedAmountUsd?: number;
}

export class HardenedReconciliationEngine {
  constructor(private pool: Pool, private webhookSinkUrl: string) {}

  public async ingestPaymentEvent(event: RawPaymentEvent, spotPriceUsd: number) {
    const normalizedUnits = SubSyncNormalizer.normalizeTokenUnits(event.rawAmountWei, event.tokenDecimals);
    const fiatValue = normalizedUnits.multipliedBy(spotPriceUsd);
    const status = SubSyncNormalizer.evaluatePaymentStatus(fiatValue, event.expectedAmountUsd);

    const client = await this.pool.connect();
    try {
      const insertQuery = `
        INSERT INTO subsync.reconciliation_ledger (
          chain_id, tx_hash, log_index, block_number, block_timestamp,
          sender_address, recipient_address, token_address, raw_amount,
          token_decimals, token_symbol, fiat_rate_usd, fiat_amount_usd,
          customer_id, invoice_id, status, accounting_sync_status
        ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'UNSYNCED')
        ON CONFLICT (chain_id, tx_hash, log_index) DO NOTHING
        RETURNING ledger_id;
      `;

      const res = await client.query(insertQuery, [
        event.chainId, event.txHash.toLowerCase(), event.logIndex, event.blockNumber,
        event.senderAddress.toLowerCase(), event.recipientAddress.toLowerCase(),
        event.tokenAddress.toLowerCase(), event.rawAmountWei, event.tokenDecimals,
        event.tokenSymbol.toUpperCase(), spotPriceUsd.toFixed(6), fiatValue.toFixed(2),
        event.customerId || 'CUST_ANONYMOUS', event.invoiceId || 'INV_UNASSIGNED', status
      ]);

      if (res.rows.length === 0) {
        return { status: 'DUPLICATE_IGNORED', message: 'Event already recorded in ledger.' };
      }

      const ledgerId = res.rows[0].ledger_id;
      setImmediate(() => this.flushOutboxEntry(ledgerId, event.invoiceId || 'INV', fiatValue.toFixed(2), status));

      return { status: 'PROCESSED', ledgerId, fiatAmountUsd: fiatValue.toFixed(2), reconciliationStatus: status };
    } finally {
      client.release();
    }
  }

  public async flushOutboxEntry(ledgerId: string, invoiceId: string, amountUsd: string, status: string) {
    const client = await this.pool.connect();
    try {
      await axios.post(this.webhookSinkUrl, {
        eventType: 'PAYMENT_RECONCILED',
        ledgerId,
        invoiceId,
        fiatAmountUsd: amountUsd,
        status,
        timestamp: new Date().toISOString()
      }, { timeout: 3000 });

      await client.query("UPDATE subsync.reconciliation_ledger SET accounting_sync_status = 'SYNCED' WHERE ledger_id = $1", [ledgerId]);
    } catch {
      await client.query(
        `UPDATE subsync.reconciliation_ledger 
         SET accounting_sync_status = 'RETRY_PENDING', retry_count = retry_count + 1,
             next_retry_at = NOW() + (interval '1 second' * power(2, LEAST(retry_count, 6)))
         WHERE ledger_id = $1`,
        [ledgerId]
      );
    } finally {
      client.release();
    }
  }
}
