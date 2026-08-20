import React from 'react';
import { Layers, ShieldCheck, RefreshCw } from 'lucide-react';

export const Navbar: React.FC<{ onRefresh: () => void; isRefreshing: boolean }> = ({ onRefresh, isRefreshing }) => (
  <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-30">
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg">
        <Layers className="h-5 w-5 text-white" />
      </div>
      <div>
        <h1 className="text-lg font-bold text-white flex items-center gap-2">SubSync</h1>
        <p className="text-xs text-slate-400">Web3-to-Web2 Revenue Reconciliation</p>
      </div>
    </div>
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-3 py-1.5 rounded-md font-mono">
        <ShieldCheck className="h-4 w-4" />
        <span>Idempotent Outbox: Active</span>
      </div>
      <button onClick={onRefresh} disabled={isRefreshing} className="flex items-center gap-2 text-xs bg-slate-800 text-slate-200 px-3 py-1.5 rounded-md">
        <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        <span>Sync</span>
      </button>
    </div>
  </header>
);
