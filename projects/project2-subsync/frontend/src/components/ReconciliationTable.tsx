import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { LedgerRecord } from '../types';

export const ReconciliationTable: React.FC<{ records: LedgerRecord[] }> = ({ records }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
    <div className="p-4 border-b border-slate-800 text-sm font-semibold text-white">Reconciled Financial Ledger</div>
    <table className="w-full text-left text-xs">
      <thead className="bg-slate-950 text-slate-400 uppercase font-mono">
        <tr><th className="py-3 px-4">Tx Hash</th><th className="py-3 px-4">Customer</th><th className="py-3 px-4">Token</th><th className="py-3 px-4">Amount USD</th><th className="py-3 px-4">Status</th></tr>
      </thead>
      <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
        {records.length === 0 ? (
          <tr><td colSpan={5} className="py-6 text-center text-slate-500">No transactions recorded yet. Listening on webhook...</td></tr>
        ) : (
          records.map((r) => (
            <tr key={r.ledgerId}>
              <td className="py-3 px-4 text-indigo-400">{r.txHash ? `${r.txHash.substring(0, 10)}...` : 'N/A'}</td>
              <td className="py-3 px-4">{r.customerId || 'CUST_DIRECT'}</td>
              <td className="py-3 px-4">{r.tokenSymbol || 'USDC'}</td>
              <td className="py-3 px-4 font-bold text-white">$${r.fiatAmountUsd}</td>
              <td className="py-3 px-4">
                <span className={`flex items-center gap-1 ${r.status === 'UNDERPAID' ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {r.status === 'UNDERPAID' ? <AlertCircle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                  {r.status}
                </span>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);
