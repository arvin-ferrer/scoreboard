import { useState } from 'react';
import { fmtPoints } from '../settings.js';
import { historyRows } from '../history.js';
import './history.css';

const time = (ms) => (ms ? new Date(ms).toLocaleTimeString([], { hour12: false }) : '—');

// Every entry with a chamber filter. Pass onUndo to show an Undo button (admin only).
export default function HistoryTable({ data, entries, onUndo }) {
  const [filter, setFilter] = useState('all');
  const chamber = Object.fromEntries(data.chambers.map((c) => [c.id, c]));
  const rows = historyRows(entries, filter);

  return (
    <div className="history">
      <label className="history-filter">
        Chamber{' '}
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All chambers</option>
          {data.chambers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <div className="history-scroll">
        <table>
          <thead>
            <tr><th>Time</th><th>Chamber</th><th>Points</th><th>Why</th><th>Round</th><th>Device</th>{onUndo && <th />}</tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className={e.voided ? 'voided' : ''}>
                <td>{time(e.host_time)}</td>
                <td><span className="dot" style={{ background: chamber[e.chamber]?.colour }} />{chamber[e.chamber]?.name ?? e.chamber}</td>
                <td className={e.points > 0 ? 'pos' : 'neg'}>{fmtPoints(e.points)}</td>
                <td>{e.label}{e.pending && ' (not sent yet)'}{e.voided && ' — voided'}</td>
                <td>{data.scoring.rounds[e.round]?.name ?? e.round}</td>
                <td>{(e.device ?? '').replace(/^dev-/, '').toUpperCase()}</td>
                {onUndo && <td><button className="mini" disabled={e.voided} onClick={() => onUndo(e.id)}>Undo</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="hint">No entries yet.</p>}
      </div>
    </div>
  );
}
