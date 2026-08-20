import React, { useState } from 'react';
import { Settings, Save } from 'lucide-react';

export const ContractConfigForm: React.FC = () => {
  const [addr, setAddr] = useState('0x5FbDB2315678afecb367f032d93F642f64180aa3');
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
        <Settings className="h-4 w-4 text-indigo-400" />
        <h2 className="text-sm font-semibold text-white">Reconciliation Contract Configuration</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Target Receiver Contract</label>
          <input type="text" value={addr} onChange={(e) => setAddr(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200" />
        </div>
        <div className="flex items-end">
          <button className="flex items-center gap-2 bg-indigo-600 text-white text-xs font-semibold py-2 px-4 rounded-lg"><Save className="h-4 w-4" /> Save Pipeline</button>
        </div>
      </div>
    </div>
  );
};
