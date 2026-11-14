import { useEffect, useRef, useState } from 'react';
import { fmtPoints } from '../settings.js';
import { countFor } from '../entries.js';

export default function QuickButtons({ groups, roundId, chamber, live, disabled, onScore }) {
  // The tapped button flashes briefly, so a scorer can see the tap registered.
  const [tapped, setTapped] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const tap = (key, v, label) => {
    onScore(v, label);
    setTapped(null);
    clearTimeout(timer.current);
    requestAnimationFrame(() => setTapped(key));
    timer.current = setTimeout(() => setTapped(null), 500);
  };
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
              <button key={v} className={`score-btn ${v < 0 ? 'sub' : 'add'}${tapped === `${g.label}|${v}` ? ' tapped' : ''}`} disabled={disabled} onClick={() => tap(`${g.label}|${v}`, v, g.label)}>
                {fmtPoints(v)}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
