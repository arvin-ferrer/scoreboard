import { useScoreboard } from '../useScoreboard.js';
import { useNow } from '../useNow.js';
import { formatClock, timerLeftMs, timerStatus } from '../../../shared/timer.js';
import logoUrl from '../../assets/ui/logo/logo.svg';
import './projector.css';

// Read-only big-screen leaderboard. No buttons. Rows slide to their new rank when scores change.
export default function ProjectorScreen() {
  const { data, hostNow } = useScoreboard({ role: 'projector' });
  const now = useNow(hostNow);
  if (!data) return <p className="connecting">Connecting…</p>;

  const { chambers, state, totals, order, ties } = data;
  const hidden = state.scoresHidden;
  const t = state.timer;
  const status = timerStatus(t);
  const left = timerLeftMs(t, now);
  const urgent = status !== 'stopped' && left <= 10000;
  const tied = new Set(ties.flatMap((x) => x.chambers));
  // While scores are hidden the rows stay in list order so the order gives nothing away.
  const place = (id) => (hidden ? chambers.findIndex((c) => c.id === id) : order.indexOf(id));

  return (
    <div className="projector">
      <header className="proj-head">
        <img className="proj-logo" src={logoUrl} alt="Get One Fourth: Reprise" />
        <div className="proj-round">{data.scoring.rounds[state.round].name}</div>
        <div className={`proj-timer ${status} ${urgent ? 'urgent' : ''} ${status !== 'stopped' && left === 0 ? 'done' : ''}`}>
          {formatClock(left)}
          {status === 'paused' && <small>paused</small>}
        </div>
      </header>
      <ol className="proj-board" style={{ '--n': chambers.length }}>
        {chambers.map((c) => {
          const i = place(c.id);
          return (
            <li key={c.id} className="proj-row" style={{ '--i': i, '--chamber': c.colour }}>
              <span className="proj-rank">{hidden ? '' : i + 1}</span>
              <span className="proj-name">{c.name}{!hidden && tied.has(c.id) && <small>tied</small>}</span>
              <span className={`proj-total ${hidden ? 'masked' : ''}`}>{hidden ? '?' : totals[c.id] ?? 0}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
