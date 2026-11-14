import { useEffect, useState } from 'react';
import { useScoreboard } from '../useScoreboard.js';
import { useNow } from '../useNow.js';
import { formatClock, timerLeftMs, timerStatus } from '../../../shared/timer.js';
import HistoryTable from '../history/HistoryTable.jsx';
import './admin.css';

const PIN_KEY = 'gof-admin-pin';
const session = () => { try { return window.sessionStorage; } catch { return { getItem: () => null, setItem() {}, removeItem() {} }; } };

export default function AdminScreen() {
  const [pin, setPin] = useState(() => session().getItem(PIN_KEY));
  const [wrong, setWrong] = useState(false);
  const sb = useScoreboard({ role: 'admin', pin });

  useEffect(() => {
    if (sb.admin === true) session().setItem(PIN_KEY, pin);
    if (sb.admin === false) { session().removeItem(PIN_KEY); setPin(null); setWrong(true); }
  }, [sb.admin]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!sb.data) return <p className="connecting">Connecting…</p>;
  if (sb.admin !== true) {
    return <PinGate checking={Boolean(pin)} wrong={wrong} onSubmit={(p) => { setWrong(false); setPin(p); }} />;
  }
  return <Controls sb={sb} />;
}

function PinGate({ onSubmit, wrong, checking }) {
  const [value, setValue] = useState('');
  return (
    <form className="pin-gate" onSubmit={(e) => { e.preventDefault(); if (value) onSubmit(value); setValue(''); }}>
      <h1>Admin</h1>
      <input type="password" inputMode="numeric" autoComplete="off" autoFocus placeholder="PIN" value={value} onChange={(e) => setValue(e.target.value)} />
      <button className="big" type="submit" disabled={checking}>{checking ? 'Checking…' : 'Unlock'}</button>
      {wrong && <p className="pin-wrong">Wrong PIN. Try again. (After 5 wrong tries, wait 10 seconds.)</p>}
    </form>
  );
}

function Controls({ sb }) {
  const { data, settings, entries, send, undo, laptops, online, hostNow } = sb;
  const { state, scoring, chambers } = data;
  const name = (id) => chambers.find((c) => c.id === id)?.name ?? id;
  const now = useNow(hostNow);
  const t = state.timer;
  const status = timerStatus(t);
  const nameList = (ids) => ids.map(name).join(', ');

  return (
    <div className="admin">
      <header className="topbar admin-top">
        <h1>Admin</h1>
        <span className={online ? 'ok' : 'bad'}>{online ? 'Connected' : 'Offline'}</span>
        <nav><a href="/projector">Projector</a> <a href="/history">History</a> <a href="/">Scorer</a></nav>
      </header>

      <main className="admin-grid">
        <section className="box">
          <h2>Round</h2>
          <div className="btn-row">
            {Object.entries(scoring.rounds).map(([id, r]) => (
              <button key={id} className={`big ${id === state.round ? 'on' : ''}`} onClick={() => send('round:set', id)}>{r.name}</button>
            ))}
          </div>
        </section>

        <section className="box">
          <h2>Timer</h2>
          <div className={`admin-clock ${status}`}>{formatClock(timerLeftMs(t, now))}</div>
          <div className="btn-row">
            {settings.timerPresetsMinutes.map((m) => (
              <button key={m} className={`big ${t.duration === m * 60 ? 'on' : ''}`} onClick={() => send('timer:reset', m * 60)}>{m} min</button>
            ))}
          </div>
          <div className="btn-row">
            {status === 'running'
              ? <button className="big" onClick={() => send('timer:pause')}>Pause</button>
              : <button className="big go" disabled={t.duration === 0} onClick={() => send('timer:start', t.duration)}>{status === 'paused' ? 'Resume' : 'Start'}</button>}
            <button className="big" onClick={() => send('timer:reset', t.duration)}>Reset</button>
          </div>
        </section>

        <section className="box">
          <h2>Scores on the projector</h2>
          <p className={state.scoresHidden ? 'bad' : 'ok'}>{state.scoresHidden ? 'Hidden' : 'Showing'}</p>
          <button className="big" onClick={() => send('scores:hide', !state.scoresHidden)}>
            {state.scoresHidden ? 'Reveal scores' : 'Hide scores'}
          </button>
        </section>

        <section className="box">
          <h2>Tied chambers</h2>
          {data.ties.length === 0 && <p className="hint">No tie for a podium place.</p>}
          {data.ties.map((tie) => (
            <div key={tie.place} className="tie">
              <p>Tied for place {tie.place} at {tie.total} points. Tap the winner of place {tie.place}:</p>
              <div className="btn-row">
                {tie.chambers.map((id) => <button key={id} className="big" onClick={() => send('tie:pick', id)}>{name(id)}</button>)}
              </div>
            </div>
          ))}
          {state.tieOrder.length > 0 && (
            <>
              <p>Picked so far: {nameList(state.tieOrder)}</p>
              <div className="btn-row">
                <button className="big" onClick={() => send('tie:undo')}>Undo last pick</button>
                <button className="big" onClick={() => send('tie:clear')}>Clear all picks</button>
              </div>
            </>
          )}
        </section>

        <section className="box">
          <h2>Connected laptops ({laptops.length})</h2>
          {laptops.length === 0 && <p className="hint">None yet.</p>}
          <ul className="laptops">
            {laptops.map((l) => (
              <li key={l.id}>
                <span>{l.label}</span>
                <span className="hint">
                  here since {new Date(l.since).toLocaleTimeString([], { hour12: false })}
                  {l.unsent > 0 && <b className="bad"> · {l.unsent} unsent</b>}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="box wide">
          <h2>All entries</h2>
          <HistoryTable data={data} entries={entries} onUndo={undo} />
        </section>
      </main>
    </div>
  );
}
