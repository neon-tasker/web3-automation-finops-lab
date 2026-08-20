import React from 'react';
import { DollarSign, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { LedgerRecord } from '../types';

export const StatsOverview: React.FC<{ records: LedgerRecord[] }> = ({ records }) => {
  const total = records.reduce((acc, r) => acc + parseFloat(r.fiatAmountUsd || '0'), 0);
  const reconciledCount = records.filter(r => r.status === 'RECONCILED').length;
  const underpaidCount = records.filter(r => r.status === 'UNDERPAID').length;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex justify-between text-xs text-slate-400"><span>Reconciled Volume</span><DollarSign className="h-4 w-4 text-indigo-400" /></div>
        <div className="text-2xl font-bold text-white font-mono mt-2">${total.toFixed(2)}</div>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex justify-between text-xs text-slate-400"><span>Exact Matches</span><CheckCircle2 className="h-4 w-4 text-emerald-400" /></div>
        <div className="text-2xl font-bold text-emerald-400 font-mono mt-2">{reconciledCount}</div>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex justify-between text-xs text-slate-400"><span>Discrepancies</span><AlertTriangle className="h-4 w-4 text-amber-400" /></div>
        <div className="text-2xl font-bold text-amber-400 font-mono mt-2">{underpaidCount}</div>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex justify-between text-xs text-slate-400"><span>ERP Synced</span><Layers className="h-4 w-4 text-blue-400" /></div>
        <div className="text-2xl font-bold text-blue-400 font-mono mt-2">{records.length} Synced</div>
      </div>
    </div>
  );
};
