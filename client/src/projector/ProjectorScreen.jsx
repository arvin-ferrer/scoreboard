import { useRef } from 'react';
import { useScoreboard } from '../useScoreboard.js';
import { useNow } from '../useNow.js';
import { formatClock, timerLeftMs, timerStatus } from '../../../shared/timer.js';
import { fmtPoints } from '../settings.js';
import ChamberLogo from '../ChamberLogo.jsx';
import ProjectorMusic from './ProjectorMusic.jsx';
import { useFx } from './effects/useFx.js';
import FxCanvas from './effects/FxCanvas.jsx';
import FullscreenFx from './effects/FullscreenFx.jsx';
import CountUp from './effects/CountUp.jsx';
import Podium from './effects/Podium.jsx';
import logoUrl from '../../assets/ui/logo/logo.svg';
import './projector.css';
import './effects/effects.css';

// Up to 8 chambers fit in one column. More than that use two columns, so the rows stay large.
const ROWS_PER_COLUMN = 8;

// The top 3 rows are taller than the rest, 1st the tallest (in units of one normal row).
// A thin divider after 3rd takes DIVIDER_GAP. EXTRA is the most space this can add to the first column,
// reserved always so the row size never jumps when scores are hidden or revealed.
const TOP_HEIGHTS = [1.4, 1.25, 1.15];
const DIVIDER_GAP = 0.25;
const EXTRA = TOP_HEIGHTS.reduce((s, h) => s + h - 1, 0) + DIVIDER_GAP;

// Read-only big-screen leaderboard. Rows slide to their new rank when scores change.
// Visual effects (src/projector/effects) are display only and are set off by live entries, the timer and round changes.
export default function ProjectorScreen() {
  const liveRef = useRef(() => {});
  const particles = useRef(null);
  const { data, settings, hostNow } = useScoreboard({ role: 'projector', onLive: (...args) => liveRef.current(...args) });
  const fx = useFx(data, particles);
  liveRef.current = fx.onLive;
  const now = useNow(hostNow);
  if (!data) return <p className="connecting">Connecting…</p>;

  const { chambers, state, totals, order, ties } = data;
  const hidden = state.scoresHidden;
  const t = state.timer;
  const status = timerStatus(t);
  const left = timerLeftMs(t, now);
  const urgent = status !== 'stopped' && left <= 10000;
  const timerFx = fx.timer(left, status);
  const tied = new Set(ties.flatMap((x) => x.chambers));
  // While scores are hidden the rows stay in list order so the order gives nothing away.
  const place = (id) => (hidden ? chambers.findIndex((c) => c.id === id) : order.indexOf(id));
  const columns = chambers.length > ROWS_PER_COLUMN ? 2 : 1;
  const rows = Math.ceil(chambers.length / columns);

  // Medals: only for a decided 1st, 2nd or 3rd, and never while scores are hidden. A place that is
  // still tied gets no medal, like the podium, which cannot be revealed until the tie is settled.
  const medalAt = (p) => !hidden && p < 3 && order[p] !== undefined && !tied.has(order[p]);
  const showDivider = chambers.length > 3 && [0, 1, 2].every(medalAt);
  // Where each row sits in the first column, in units of one normal row: its top (y) and height (h).
  const spots = new Map();
  let y = 0;
  chambers.forEach((_, p) => {
    const id = hidden ? chambers[p].id : order[p];
    const col = Math.floor(p / rows);
    const r = p % rows;
    if (col > 0) { spots.set(id, { y: r, h: 1 }); return; }
    if (r === 3 && showDivider) y += DIVIDER_GAP;
    const h = medalAt(p) ? TOP_HEIGHTS[p] : 1;
    spots.set(id, { y, h });
    y += h;
  });
  const dividerY = TOP_HEIGHTS.reduce((s, h) => s + h, 0) + DIVIDER_GAP / 2;
  const roundName = (id) => data.scoring.rounds[id]?.name ?? '';
  const podiumView = fx.displayRound === fx.config.effects.podium.round || fx.podiumDemo !== null;
  const podiumSteps = fx.podiumDemo ?? (hidden ? 0 : state.podiumRevealed);
  const ms = fx.config.effects;

  return (
    <div className={`projector ${fx.reduced ? 'fx-reduced' : ''} ${fx.on ? '' : 'fx-off'}`}>
      <ProjectorMusic
        chambers={chambers} totals={totals} hidden={hidden} volume={state.musicVolume} muted={state.musicMuted}
        holdSeconds={settings.musicHoldSeconds} fadeSeconds={settings.musicCrossfadeSeconds}
      />
      <header className="proj-head">
        <img className="proj-logo" src={logoUrl} alt="Get One Fourth: Reprise" />
        <div className="proj-round">{roundName(fx.displayRound)}</div>
        <div className={`proj-timer ${status} ${urgent ? 'urgent' : ''} ${status !== 'stopped' && left === 0 ? 'done' : ''} pulse-${timerFx.pulse}`}>
          {timerFx.metro && <span className={`metro ${timerFx.speed}`} aria-hidden="true"><i /></span>}
          <span className="proj-digits">{formatClock(left)}</span>
          {status === 'paused' && <small>paused</small>}
        </div>
      </header>
      <div className="proj-frame">
        {podiumView ? (
          <Podium order={order} chambers={chambers} totals={totals} revealed={podiumSteps} fresh={fx.fresh} animate={fx.on} />
        ) : (
          <ol className="proj-board" style={{ '--rows': rows, '--cols': columns, '--units': rows + (chambers.length > 3 ? EXTRA : 0) }}>
            {showDivider && <li className="proj-divider" aria-hidden="true" style={{ '--y': dividerY }} />}
            {chambers.map((c) => {
              const i = place(c.id);
              const spot = spots.get(c.id);
              const medal = medalAt(i) ? i + 1 : 0;
              const total = totals[c.id] ?? 0;
              const tier = fx.tier(c.id);
              const rowPops = fx.pops.filter((p) => p.chamber === c.id);
              const classes = [
                'proj-row',
                medal > 0 && `medal medal-${medal}`,
                tier > 0 && `flame-${tier}`,
                fx.offKey(c.id, total) && 'fx-offkey',
                fx.shaking(c.id) && 'fx-shake',
                fx.passing(c.id) && 'fx-overtake',
                fx.spotlit(c.id) && 'fx-leader',
                (rowPops.length > 0 || fx.shaking(c.id) || fx.passing(c.id) || fx.spotlit(c.id)) && 'fx-hot',
              ].filter(Boolean).join(' ');
              return (
                <li
                  key={c.id} data-chamber={c.id} className={classes}
                  style={{ '--col': Math.floor(i / rows), '--y': spot.y, '--h': spot.h, '--chamber': c.colour, '--pop-ms': `${ms.scorePop.ms}ms`, '--shake-ms': `${ms.shake.ms}ms`, '--ms': `${ms.overtake.ms}ms` }}
                >
                  {tier > 0 && <span className="flames" aria-hidden="true">{Array.from({ length: 7 }, (_, k) => <i key={k} />)}</span>}
                  <span className="proj-rank">{hidden ? '' : i + 1}</span>
                  <ChamberLogo chamber={c} />
                  <span className="proj-name">{c.name}{!hidden && tied.has(c.id) && <small>tied</small>}</span>
                  <span className={`proj-total ${hidden ? 'masked' : ''}`}>
                    {hidden ? '?' : <CountUp value={total} animate={fx.animateTotals} ms={ms.scorePop.countUpMs} />}
                  </span>
                  {rowPops.map((p) => <span key={p.key} className={`fx-pop ${p.points < 0 ? 'neg' : 'pos'}`}>{fmtPoints(p.points)}</span>)}
                </li>
              );
            })}
          </ol>
        )}
      </div>
      <FxCanvas apiRef={particles} />
      <FullscreenFx item={fx.current} config={fx.config} roundName={roundName} onCurtainsClosed={fx.closeCurtains} />
    </div>
  );
}
