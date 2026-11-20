import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { withDefaults } from './settings.js';
import { effectiveEntries, liveEntries, totalsOf } from './entries.js';
import { deviceId, dequeue, enqueue, isFinalAnswer, loadOutbox, newId, saveOutbox } from './outbox.js';

const store = () => { try { return window.localStorage; } catch { return { getItem: () => null, setItem() {} }; } };

// Connects to the host, mirrors its score log, and sends the scorer's entries reliably.
// role: scorer | admin | projector | history. pin: set by the admin screen to log in as admin.
// onLive(kind, payload, extra): the projector's hook into what is happening right now. It hears
//   'snapshot' (full log: start or reconnect, so replays must not fire effects), 'entry' (one new live entry),
//   'state' (payload = new state, extra = previous state) and 'preview' (admin test button).
export function useScoreboard({ role = 'scorer', pin = null, onLive = null } = {}) {
  const live_ = useRef(onLive);
  live_.current = onLive;
  const seen = useRef(new Set()); // entry ids already known, so a repeat is not "live"
  const lastState = useRef(null);
  const sock = useRef(null);
  const device = useRef(deviceId(store()));
  const [data, setData] = useState(null);
  const [online, setOnline] = useState(false);
  const [outbox, setOutbox] = useState(() => loadOutbox(store()));
  const outboxRef = useRef(outbox);
  const flushing = useRef(false);
  const retry = useRef(null);
  const hostOffset = useRef(0); // host time minus this laptop's time
  const [laptops, setLaptops] = useState([]);
  const [admin, setAdmin] = useState(null); // null = not tried, true/false = answer to the PIN
  const settings = useMemo(() => withDefaults(data?.settings), [data]);
  const ackTimeout = useRef(settings.ackTimeoutMs);
  ackTimeout.current = settings.ackTimeoutMs;

  useEffect(() => { outboxRef.current = outbox; saveOutbox(store(), outbox); }, [outbox]);

  useEffect(() => {
    const s = io();
    sock.current = s;
    s.on('connect', () => setOnline(true));
    s.on('disconnect', () => { setOnline(false); flushing.current = false; });
    // The host sends the full log on every (re)connect, so this is also the catch-up.
    s.on('snapshot', (snap) => {
      hostOffset.current = snap.state.hostNow - Date.now();
      seen.current = new Set(snap.entries.map((x) => x.id));
      lastState.current = snap.state;
      live_.current?.('snapshot', snap);
      setData(snap);
    });
    s.on('entry', (e) => {
      if (!seen.current.has(e.id)) { seen.current.add(e.id); live_.current?.('entry', e); }
      setData((d) => d && (d.entries.some((x) => x.id === e.id) ? d : { ...d, entries: [...d.entries, e] }));
    });
    s.on('state', (u) => {
      hostOffset.current = u.state.hostNow - Date.now();
      const prev = lastState.current;
      lastState.current = u.state;
      if (prev) live_.current?.('state', u.state, prev);
      setData((d) => d && { ...d, ...u });
    });
    s.on('chambers', (chambers) => setData((d) => d && { ...d, chambers }));
    s.on('sfx', (sfx) => setData((d) => d && { ...d, sfx }));
    s.on('effects:preview', (m) => live_.current?.('preview', m));
    s.on('sfx:preview', (m) => live_.current?.('sfxPreview', m));
    s.on('laptops', setLaptops);
    return () => { clearTimeout(retry.current); s.close(); };
  }, []);

  // Send the oldest unsent item; remove it only when the host answers. Repeats until empty.
  const flush = useCallback(() => {
    const s = sock.current;
    const next = outboxRef.current[0];
    if (flushing.current || !s?.connected || !next) return;
    flushing.current = true;
    s.timeout(ackTimeout.current).emit(next.kind === 'add' ? 'entry:add' : 'entry:void', next.msg, (err, res) => {
      flushing.current = false;
      if (err || !isFinalAnswer(res)) { retry.current = setTimeout(flush, ackTimeout.current); return; }
      setOutbox((o) => dequeue(o, next.msg.id));
    });
  }, []);
  useEffect(() => { if (online) flush(); }, [online, outbox, flush]);

  // Tell the host who we are, again whenever the unsent count changes.
  useEffect(() => {
    if (online) sock.current.emit('hello', { role, device: device.current, unsent: outbox.length });
  }, [online, role, outbox.length]);

  useEffect(() => {
    if (!pin || !online) return;
    setAdmin(null);
    sock.current.emit('admin:login', pin, (res) => setAdmin(res?.ok === true));
  }, [pin, online]);

  const send = useCallback((event, ...args) => sock.current?.emit(event, ...args), []);
  const hostNow = useCallback(() => Date.now() + hostOffset.current, []);

  const all = useMemo(() => (data ? effectiveEntries(data.entries, outbox) : []), [data, outbox]);
  const live = useMemo(() => liveEntries(all), [all]);
  const totals = useMemo(() => (data ? totalsOf(data.chambers.map((c) => c.id), live) : {}), [data, live]);

  const score = useCallback((chamber, points, label) => {
    const id = newId();
    setOutbox((o) => enqueue(o, { kind: 'add', msg: { id, chamber, points, round: data.state.round, label, device: device.current } }));
    return id;
  }, [data]);
  const undo = useCallback((entryId) => {
    setOutbox((o) => enqueue(o, { kind: 'void', msg: { id: newId(), voids: entryId, device: device.current } }));
  }, []);

  return { data, settings, online, unsent: outbox.length, entries: all, live, totals, score, undo, send, hostNow, laptops, admin };
}
