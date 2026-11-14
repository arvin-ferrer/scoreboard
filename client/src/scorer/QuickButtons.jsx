import { fmtPoints } from '../settings.js';
import { countFor } from '../entries.js';

export default function QuickButtons({ groups, roundId, chamber, live, disabled, onScore }) {
  return (
    <div className="groups">
      {groups.map((g) => (
        <div key={g.label} className="group">
          <h3>
            {g.label}
            {g.counter && chamber && <span className="counter">× {countFor(live, chamber.id, roundId, g.label)}</span>}
          </h3>
          <div className="btn-row">
            {g.values.map((v) => (
              <button key={v} className={`score-btn ${v < 0 ? 'sub' : 'add'}`} disabled={disabled} onClick={() => onScore(v, g.label)}>
                {fmtPoints(v)}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
