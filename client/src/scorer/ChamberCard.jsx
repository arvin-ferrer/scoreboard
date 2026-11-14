import { fmtPoints } from '../settings.js';
import { recentFor } from '../entries.js';

export default function ChamberCard({ chamber, total, live, selected, recentCount, unsentText, onSelect, onUndo }) {
  const recent = recentFor(live, chamber.id, recentCount);
  return (
    <div className={`card${selected ? ' selected' : ''}`} style={{ '--chamber': chamber.colour }}>
      <button className="card-main" onClick={onSelect} aria-pressed={selected}>
        <span className="card-name">{chamber.name}</span>
        <span className="card-total">{total}</span>
      </button>
      <ul className="recent">
        {recent.map((e) => (
          <li key={e.id} className={e.pending ? 'pending' : ''}>
            <span className={e.points < 0 ? 'neg' : 'pos'}>{fmtPoints(e.points)}</span>
            <span className="why">{e.label}{e.pending ? ` (${unsentText})` : ''}</span>
            <button className="mini" onClick={() => onUndo(e.id)} aria-label={`Undo ${fmtPoints(e.points)}`}>Undo</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
