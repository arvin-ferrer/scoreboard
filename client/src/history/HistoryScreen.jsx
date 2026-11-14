import { useScoreboard } from '../useScoreboard.js';
import HistoryTable from './HistoryTable.jsx';

// Read-only list of every entry. Undo lives on the admin screen.
export default function HistoryScreen() {
  const { data, entries } = useScoreboard({ role: 'history' });
  if (!data) return <p className="connecting">Connecting…</p>;
  return (
    <div className="page">
      <header className="topbar"><h1>History</h1></header>
      <main className="page-body"><HistoryTable data={data} entries={entries} /></main>
    </div>
  );
}
