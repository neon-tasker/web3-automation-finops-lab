import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { StatsOverview } from './components/StatsOverview';
import { ContractConfigForm } from './components/ContractConfigForm';
import { ReconciliationTable } from './components/ReconciliationTable';
import { LedgerRecord } from './types';

export function App() {
  const [records, setRecords] = useState<LedgerRecord[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLedger = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/ledger');
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch {
      // offline fallback
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLedger();
    const interval = setInterval(fetchLedger, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <Navbar onRefresh={fetchLedger} isRefreshing={isRefreshing} />
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        <StatsOverview records={records} />
        <ContractConfigForm />
        <ReconciliationTable records={records} />
      </main>
    </div>
  );
}
export default App;
