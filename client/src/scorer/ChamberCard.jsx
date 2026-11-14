import { fmtPoints } from '../settings.js';
import { recentFor } from '../entries.js';
import ChamberLogo from '../ChamberLogo.jsx';

export default function ChamberCard({ chamber, total, medal = 0, live, selected, recentCount, unsentText, onSelect, onUndo }) {
  const recent = recentFor(live, chamber.id, recentCount);
  return (
    <div className={`card${selected ? ' selected' : ''}`} style={{ '--chamber': chamber.colour }}>
      <button className="card-main" onClick={onSelect} aria-pressed={selected}>
        <ChamberLogo chamber={chamber} />
        <span className="card-name">{chamber.name}</span>
        {medal > 0 && <span className={`card-medal medal-${medal}`} aria-label={`Place ${medal}`}>{medal}</span>}
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
