import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { withDefaults } from './settings.js';
import { effectiveEntries, liveEntries, totalsOf } from './entries.js';
import { deviceId, dequeue, enqueue, isFinalAnswer, loadOutbox, saveOutbox } from './outbox.js';

const store = () => { try { return window.localStorage; } catch { return { getItem: () => null, setItem() {} }; } };

// Connects to the host, mirrors its score log, and sends the scorer's entries reliably.
export function useScoreboard() {
  const sock = useRef(null);
  const device = useRef(deviceId(store()));
  const [data, setData] = useState(null);
  const [online, setOnline] = useState(false);
  const [outbox, setOutbox] = useState(() => loadOutbox(store()));
  const outboxRef = useRef(outbox);
  const flushing = useRef(false);
  const retry = useRef(null);
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
    s.on('snapshot', setData);
    s.on('entry', (e) => setData((d) => d && (d.entries.some((x) => x.id === e.id) ? d : { ...d, entries: [...d.entries, e] })));
    s.on('state', (u) => setData((d) => d && { ...d, state: u.state }));
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

  const all = useMemo(() => (data ? effectiveEntries(data.entries, outbox) : []), [data, outbox]);
  const live = useMemo(() => liveEntries(all), [all]);
  const totals = useMemo(() => (data ? totalsOf(data.chambers.map((c) => c.id), live) : {}), [data, live]);

  const score = useCallback((chamber, points, label) => {
    const id = crypto.randomUUID();
    setOutbox((o) => enqueue(o, { kind: 'add', msg: { id, chamber, points, round: data.state.round, label, device: device.current } }));
    return id;
  }, [data]);
  const undo = useCallback((entryId) => {
    setOutbox((o) => enqueue(o, { kind: 'void', msg: { id: crypto.randomUUID(), voids: entryId, device: device.current } }));
  }, []);

  return { data, settings, online, unsent: outbox.length, live, totals, score, undo };
}
