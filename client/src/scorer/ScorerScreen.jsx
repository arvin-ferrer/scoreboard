import { useEffect, useRef, useState } from 'react';
import { useScoreboard } from '../useScoreboard.js';
import { fmtPoints } from '../settings.js';
import ChamberCard from './ChamberCard.jsx';
import QuickButtons from './QuickButtons.jsx';
import NumberPad from './NumberPad.jsx';
import UndoToast from './UndoToast.jsx';
import OfflineBanner from './OfflineBanner.jsx';

export default function ScorerScreen() {
  const { data, settings, online, unsent, live, totals, score, undo } = useScoreboard();
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null); // { entryId, text }
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  if (!data) return <p className="connecting">Connecting…</p>;

  const round = data.scoring.rounds[data.state.round];
  const chamber = data.chambers.find((c) => c.id === selected);
  const canScore = !round.tiebreak && round.groups.length > 0;

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
    <div className="scorer" style={{ '--btn-h': `${settings.buttonHeightPx}px`, '--cols': settings.cardColumns }}>
      <header className="topbar"><h1>{round.name}</h1></header>
      <OfflineBanner online={online} unsent={unsent} texts={settings.texts} />
      <main className="layout">
        <section className="cards">
          {data.chambers.map((c) => (
            <ChamberCard
              key={c.id} chamber={c} total={totals[c.id]} live={live} selected={c.id === selected}
              recentCount={settings.recentEntries} unsentText={settings.texts.unsent}
              onSelect={() => setSelected(c.id)} onUndo={doUndo}
            />
          ))}
        </section>
        <section className="panel">
          {!canScore ? <p className="hint">{settings.texts.noScoring}</p> : (
            <>
              <h2>{chamber ? chamber.name : settings.texts.pickChamber}</h2>
              <QuickButtons groups={round.groups} roundId={data.state.round} chamber={chamber} live={live} disabled={!chamber} onScore={doScore} />
              <NumberPad disabled={!chamber} max={settings.customPadMaxPoints} label={settings.customLabel} onScore={doScore} />
            </>
          )}
        </section>
      </main>
      <UndoToast toast={toast} onUndo={doUndo} />
    </div>
  );
}
