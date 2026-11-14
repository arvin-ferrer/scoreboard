// Bare sync test page (step 1). No theme, no styling. Replaced by real screens in step 2+.
import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const device = `dev-${Math.random().toString(36).slice(2, 6)}`;
const newId = () => crypto.randomUUID();

export default function App() {
  const sock = useRef(null);
  const [data, setData] = useState(null);
  const [online, setOnline] = useState(false);
  const [offset, setOffset] = useState(0); // host time minus local time
  const [, tick] = useState(0);

  useEffect(() => {
    const s = io();
    sock.current = s;
    s.on('connect', () => setOnline(true));
    s.on('disconnect', () => setOnline(false));
    s.on('snapshot', (snap) => { setData(snap); setOffset(snap.state.hostNow - Date.now()); });
    s.on('entry', (e) => setData((d) => d && (d.entries.some((x) => x.id === e.id) ? d : { ...d, entries: [...d.entries, e] })));
    s.on('state', (u) => { setData((d) => d && { ...d, ...u }); setOffset(u.state.hostNow - Date.now()); });
    const t = setInterval(() => tick((n) => n + 1), 250);
    return () => { clearInterval(t); s.close(); };
  }, []);

  const quick = useMemo(() => {
    if (!data) return [];
    const groups = data.scoring.rounds[data.state.round].groups;
    return [...new Set(groups.flatMap((g) => g.values))];
  }, [data]);

  if (!data) return <p>Connecting…</p>;
  const emit = (ev, ...args) => sock.current.emit(ev, ...args);
  const add = (chamber, points) => emit('entry:add', { id: newId(), chamber, points, round: data.state.round, label: 'test', device });
  const voided = new Set(data.entries.filter((e) => e.voids).map((e) => e.voids));
  const live = data.entries.filter((e) => !e.voids && !voided.has(e.id));
  const undoLast = () => { const last = live.at(-1); if (last) emit('entry:void', { id: newId(), voids: last.id, device }); };

  const t = data.state.timer;
  const now = Date.now() + offset;
  const left = t.startedAt === null ? t.duration * 1000 : t.duration * 1000 - ((t.pausedAt ?? now) - t.startedAt);
  const fmt = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const rankOf = Object.fromEntries(data.order.map((id, i) => [id, i + 1]));
  const name = (id) => data.chambers.find((c) => c.id === id)?.name ?? id;

  return (
    <div>
      <h3>Sync test {online ? '(online)' : '(OFFLINE)'} — {device}</h3>

      <p>
        Round:{' '}
        <select value={data.state.round} onChange={(e) => emit('round:set', e.target.value)}>
          {Object.entries(data.scoring.rounds).map(([id, r]) => <option key={id} value={id}>{r.name}</option>)}
        </select>
      </p>

      <p>
        Timer {fmt(left)} {t.startedAt !== null && t.pausedAt === null ? '(running)' : t.pausedAt !== null ? '(paused)' : '(stopped)'}{' '}
        <button onClick={() => emit('timer:start', 60)}>Start / resume (60s)</button>{' '}
        <button onClick={() => emit('timer:pause')}>Pause</button>{' '}
        <button onClick={() => emit('timer:reset', 60)}>Reset</button>
      </p>

      {data.scoring.rounds[data.state.round].tiebreak && (
        <div>
          <h4>Vivace: tied for the podium</h4>
          {data.ties.length === 0 && <p>No open podium ties.</p>}
          {data.ties.map((t2) => (
            <div key={t2.place}>
              <b>Place {t2.place}</b> ({t2.total} pts), tied: {t2.chambers.map((id) => (
                <button key={id} onClick={() => emit('tie:pick', id)}>{name(id)} wins</button>
              ))}
            </div>
          ))}
          <button onClick={() => emit('tie:clear')}>Clear tie picks</button>
        </div>
      )}

      <table>
        <tbody>
          {data.chambers.map((c) => (
            <tr key={c.id}>
              <td>#{rankOf[c.id]}</td>
              <td>{c.name}</td>
              <td><b>{data.totals[c.id]}</b></td>
              <td>
                {[...quick, 1, -1].map((p) => (
                  <button key={p} onClick={() => add(c.id, p)}>{p > 0 ? `+${p}` : p}</button>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p><button onClick={undoLast}>Undo last entry</button> ({live.length} live of {data.entries.length} log rows)</p>

      <pre>{JSON.stringify({ totals: data.totals, order: data.order, ties: data.ties, state: data.state }, null, 2)}</pre>
    </div>
  );
}
