export interface LedgerRecord {
  ledgerId: string;
  txHash: string;
  chainId: number;
  blockNumber: number;
  blockTimestamp: string;
  senderAddress: string;
  recipientAddress: string;
  tokenSymbol: string;
  rawAmount: string;
  fiatRateUsd: string;
  fiatAmountUsd: string;
  customerId: string;
  invoiceId: string;
  status: 'RECONCILED' | 'UNDERPAID' | 'OVERPAID' | 'PENDING_FINALITY';
  accountingSyncStatus: 'SYNCED' | 'UNSYNCED' | 'RETRY_PENDING';
}
