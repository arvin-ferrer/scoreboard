import { useEffect, useRef, useState } from 'react';
import { useScoreboard } from '../useScoreboard.js';
import { fmtPoints } from '../settings.js';
import ChamberCard, { RecentList } from './ChamberCard.jsx';
import { recentFor } from '../entries.js';
import QuickButtons from './QuickButtons.jsx';
import NumberPad from './NumberPad.jsx';
import UndoToast from './UndoToast.jsx';
import OfflineBanner from './OfflineBanner.jsx';
import ChamberLogo from '../ChamberLogo.jsx';

export default function ScorerScreen() {
  const { data, settings, online, unsent, live, totals, score, undo } = useScoreboard();
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null); // { entryId, text }
  const [showPad, setShowPad] = useState(false); // the custom pad stays folded until asked for, on every screen
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    const close = (e) => { if (e.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  if (!data) return <p className="connecting">Connecting…</p>;

  const round = data.scoring.rounds[data.state.round];
  const chamber = data.chambers.find((c) => c.id === selected);
  const canScore = !round.tiebreak && round.groups.length > 0;
  // A small medal on the current 1st, 2nd and 3rd. A place that is still tied gets none.
  const tied = new Set(data.ties.flatMap((t) => t.chambers));
  const medalOf = (id) => { const p = data.order.indexOf(id); return p >= 0 && p < 3 && !tied.has(id) ? p + 1 : 0; };

  const doScore = (points, label) => {
    if (!chamber) return;
    const entryId = score(chamber.id, points, label);
    clearTimeout(timer.current);
    setToast({ entryId, text: `${fmtPoints(points)} to ${chamber.name}` });
    timer.current = setTimeout(() => setToast(null), settings.undoToastSeconds * 1000);
  };
  const doUndo = (entryId) => {
    undo(entryId);
    setToast((t) => (t?.entryId === entryId ? null : t));
  };

  return (
    <div className={`scorer${chamber ? ' has-chamber' : ''} fxmode-${data.state.effectsOn === false ? 'off' : data.state.effectsIntensity ?? 'full'}`} style={{ '--btn-h': `${settings.buttonHeightPx}px`, '--cols': settings.cardColumns }}>
      <header className="topbar"><h1>{round.name}</h1></header>
      <OfflineBanner online={online} unsent={unsent} texts={settings.texts} />
      <main className="layout">
        <section className="cards">
          {data.chambers.map((c) => (
            <ChamberCard
              key={c.id} chamber={c} total={totals[c.id]} medal={medalOf(c.id)} live={live} selected={c.id === selected}
              recentCount={settings.recentEntries} unsentText={settings.texts.unsent}
              onSelect={() => setSelected(c.id)} onUndo={doUndo}
            />
          ))}
        </section>
        <section className="panel" aria-label="Score">
          {!canScore ? <p className="hint">{settings.texts.noScoring}</p> : (
            <>
              <div className="panel-head" style={chamber ? { '--chamber': chamber.colour } : undefined}>
                {chamber && <div className="oval"><ChamberLogo chamber={chamber} /></div>}
                <div className="panel-title">
                  <h2>{chamber ? chamber.name : settings.texts.pickChamber}</h2>
                  {chamber && <span className="panel-total">{totals[chamber.id]}</span>}
                </div>
                {chamber && (
                  <button className="sheet-close" aria-label="Close" onClick={() => setSelected(null)}>
                    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
                  </button>
                )}
              </div>
              {chamber && (
                <div className="sheet-recent">
                  <RecentList entries={recentFor(live, chamber.id, settings.recentEntries)} unsentText={settings.texts.unsent} onUndo={doUndo} />
                </div>
              )}
              <QuickButtons groups={round.groups} roundId={data.state.round} chamber={chamber} live={live} disabled={!chamber} onScore={doScore} />
              <button className="pad-toggle" aria-expanded={showPad} onClick={() => setShowPad((v) => !v)}>
                {settings.customLabel}
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <div className={`pad-wrap${showPad ? ' open' : ''}`}>
                <NumberPad disabled={!chamber} max={settings.customPadMaxPoints} label={settings.customLabel} onScore={doScore} />
              </div>
            </>
          )}
        </section>
      </main>
      <UndoToast toast={toast} onUndo={doUndo} />
    </div>
  );
}
