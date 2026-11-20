import { useEffect, useRef, useState } from 'react';
import { useScoreboard } from '../useScoreboard.js';
import { useNow } from '../useNow.js';
import { formatClock, timerLeftMs, timerStatus } from '../../../shared/timer.js';
import HistoryTable from '../history/HistoryTable.jsx';
import { PREVIEW_EFFECTS } from '../../../shared/effects.js';
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
  const missing = chambers
    .map((c) => ({ id: c.id, name: c.name, what: [c.logoUrl ? null : 'logo', c.songUrl ? null : 'song'].filter(Boolean) }))
    .filter((m) => m.what.length > 0);

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
              <button key={m} className={`big ${t.duration === m * 60 ? 'on' : ''}`} onClick={() => send('timer:reset', m * 60)}>{m < 1 ? `${m * 60} s` : `${m} min`}</button>
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
          <h2>Defending against</h2>
          <DefenseControls state={state} chambers={chambers} name={name} send={send} />
        </section>

        <section className="box">
          <h2>Scores on the projector</h2>
          <p className={state.scoresHidden ? 'bad' : 'ok'}>{state.scoresHidden ? 'Hidden' : 'Showing'}</p>
          <button className="big" onClick={() => send('scores:hide', !state.scoresHidden)}>
            {state.scoresHidden ? 'Reveal scores' : 'Hide scores'}
          </button>
        </section>

        <section className="box">
          <h2>Music on the projector</h2>
          <MusicControls state={state} send={send} />
        </section>

        <section className="box">
          <h2>Effects on the projector</h2>
          <EffectsControls state={state} send={send} />
        </section>

        <section className="box">
          <h2>Podium reveal</h2>
          <PodiumControls state={state} ties={data.ties.length > 0} round={data.scoring.rounds[state.round]?.name} send={send} />
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
          <h2>Chamber names</h2>
          <p className="hint">Saved to data/chambers.csv and shown on every screen right away. Scores stay with the chamber.</p>
          <ChamberNames chambers={chambers} send={send} />
        </section>

        {missing.length > 0 && (
          <section className="box wide">
            <h2>Missing chamber files</h2>
            <p className="hint">These chambers use a plain number badge or no song until the file is added to client/assets/chambers/&lt;id&gt;/. Reload the projector after adding files.</p>
            <ul className="laptops">
              {missing.map((m) => <li key={m.id}><span>{m.name} ({m.id})</span><span className="bad">{m.what.join(' and ')}</span></li>)}
            </ul>
          </section>
        )}

        <section className="box wide">
          <h2>Effects preview</h2>
          <EffectsPreview chambers={chambers} hidden={state.scoresHidden} send={send} />
        </section>

        <section className="box wide">
          <h2>All entries</h2>
          <HistoryTable data={data} entries={entries} onUndo={undo} />
        </section>
      </main>
    </div>
  );
}

// Andante: which chamber is attacking which, shown on the projector. At most 2 attackers per defender.
// Cleared automatically when the round changes.
function DefenseControls({ state, chambers, name, send }) {
  const [defender, setDefender] = useState('');
  const [attacker, setAttacker] = useState('');
  const defense = state.defense ?? {};
  const current = defense[defender] ?? [];
  const canAdd = defender && attacker && attacker !== defender && !current.includes(attacker) && current.length < 2;
  const add = () => { send('defense:set', { defender, attackers: [...current, attacker] }); setAttacker(''); };
  const pick = (value, set, blank) => (
    <select value={value} onChange={(e) => set(e.target.value)}>
      <option value="">{blank}</option>
      {chambers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
  );
  return (
    <div className="defense">
      <div className="btn-row">
        {pick(defender, setDefender, 'Defender…')}
        <span>defending against</span>
        {pick(attacker, setAttacker, 'Attacker…')}
        <button className="big" disabled={!canAdd} onClick={add}>Add</button>
      </div>
      {Object.keys(defense).length === 0 ? <p className="hint">Nobody is under attack.</p> : (
        <ul className="laptops">
          {Object.entries(defense).map(([d, attackers]) => (
            <li key={d}>
              <span>{name(d)} — defending against {attackers.map(name).join(', ')}</span>
              <button className="mini" onClick={() => send('defense:set', { defender: d, attackers: [] })} aria-label={`Clear ${name(d)}`}>Clear</button>
            </li>
          ))}
        </ul>
      )}
      {Object.keys(defense).length > 0 && <button className="big" onClick={() => send('defense:clear')}>Clear all</button>}
    </div>
  );
}

// One row per chamber: type a new name, then Save (or Enter). Each row saves on its own.
function ChamberNames({ chambers, send }) {
  return <div className="names">{chambers.map((c) => <NameRow key={c.id} chamber={c} send={send} />)}</div>;
}

function NameRow({ chamber, send }) {
  const [draft, setDraft] = useState(chamber.name);
  const [status, setStatus] = useState(''); // '', 'saving', 'saved', 'failed'
  useEffect(() => { setDraft(chamber.name); }, [chamber.name]);
  const name = draft.trim();
  const valid = name.length >= 1 && name.length <= 60 && !/["\r\n]/.test(name);
  const changed = name !== chamber.name;
  const save = (e) => {
    e.preventDefault();
    if (!valid || !changed) return;
    setStatus('saving');
    send('chamber:rename', { id: chamber.id, name }, (res) => setStatus(res?.ok ? 'saved' : 'failed'));
  };
  return (
    <form className="name-row" onSubmit={save}>
      <label htmlFor={`name-${chamber.id}`}>{chamber.id}</label>
      <input id={`name-${chamber.id}`} value={draft} maxLength={60} autoComplete="off"
        onChange={(e) => { setDraft(e.target.value); setStatus(''); }} aria-invalid={!valid} />
      <button className="big" disabled={!valid || !changed || status === 'saving'}>Save</button>
      <span className={`name-status ${status === 'failed' || !valid ? 'bad' : 'ok'}`} role="status">
        {!valid ? (name ? 'No quotes' : 'Name needed') : status === 'saved' && !changed ? 'Saved' : status === 'failed' ? 'Not saved' : ''}
      </span>
    </form>
  );
}

// Volume and mute for the projector's music. The projector laptop does the playing.
function MusicControls({ state, send }) {
  const [volume, setVolume] = useState(state.musicVolume);
  const wait = useRef(null);
  useEffect(() => () => clearTimeout(wait.current), []);
  const change = (v) => {
    setVolume(v);
    clearTimeout(wait.current);
    wait.current = setTimeout(() => send('music:set', { volume: v }), 150); // not on every pixel of the drag
  };
  return (
    <>
      <label className="volume">
        <span>Volume {Math.round(volume * 100)}%</span>
        <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => change(Number(e.target.value))} />
      </label>
      <button className={`big ${state.musicMuted ? 'on' : ''}`} aria-pressed={state.musicMuted} onClick={() => send('music:set', { muted: !state.musicMuted })}>
        {state.musicMuted ? 'Muted. Tap to unmute' : 'Mute'}
      </button>
      <p className="hint">On the projector laptop, click "Enable sound" once. Music stops while scores are hidden.</p>
    </>
  );
}

// Master switch and Full/Reduced for the projector's visual effects.
function EffectsControls({ state, send }) {
  return (
    <>
      <p className={state.effectsOn ? 'ok' : 'bad'}>{state.effectsOn ? 'Effects on' : 'Effects off'}</p>
      <button className="big" onClick={() => send('effects:set', { on: !state.effectsOn })}>{state.effectsOn ? 'Turn effects off' : 'Turn effects on'}</button>
      <div className="btn-row" role="group" aria-label="Intensity">
        {[['full', 'Full'], ['reduced', 'Reduced']].map(([id, label]) => (
          <button key={id} className={`big ${state.effectsIntensity === id ? 'on' : ''}`} aria-pressed={state.effectsIntensity === id} onClick={() => send('effects:set', { intensity: id })}>{label}</button>
        ))}
      </div>
      <p className="hint">Reduced: no shaking, red flash or sweeping words, and far less confetti. Thresholds and words are in shared/effects.json (restart the server after editing).</p>
    </>
  );
}

// Awarding: reveal 3rd, then 2nd, then 1st, one click each.
function PodiumControls({ state, ties, round, send }) {
  const n = state.podiumRevealed;
  const names = ['3rd place', '2nd place', '1st place'];
  const blocked = state.scoresHidden ? 'Reveal scores first.' : ties ? 'Settle the tied podium places first.' : null;
  return (
    <>
      <p className="hint">{state.round === 'awarding' ? 'The projector shows the podium.' : `The projector shows the podium in the Awarding round (now: ${round}).`}</p>
      <p>{n === 0 ? 'Nothing revealed yet.' : `Revealed: ${names.slice(0, n).join(', ')}.`}</p>
      <div className="btn-row">
        <button className="big go" disabled={n >= 3 || Boolean(blocked)} onClick={() => send('podium:set', n + 1)}>{n >= 3 ? 'All revealed' : `Reveal ${names[n]}`}</button>
        <button className="big" disabled={n === 0} onClick={() => send('podium:set', 0)}>Hide podium</button>
      </div>
      {blocked && n < 3 && <p className="bad">{blocked}</p>}
    </>
  );
}

// One button per effect. The projector plays it with the chosen chamber; nothing is scored or stored.
function EffectsPreview({ chambers, hidden, send }) {
  const [chamber, setChamber] = useState(chambers[0]?.id);
  return (
    <>
      <label className="volume">
        <span>Show it on</span>
        <select value={chamber} onChange={(e) => setChamber(e.target.value)}>
          {chambers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <div className="btn-row">
        {PREVIEW_EFFECTS.map((p) => (
          <button key={p.id} className="big" disabled={p.showsRanks && hidden} onClick={() => send('effects:preview', { name: p.id, chamber })}>{p.label}</button>
        ))}
      </div>
      <p className="hint">Previews play on the projector even when effects are off in the box above, and ignore the on/off switches in effects.json. Intensity still applies. {hidden && 'Podium reveal is disabled while scores are hidden because it shows the real top three. '}Curtains show the current round name.</p>
    </>
  );
}
