// One-at-a-time queue for full-screen effects (word flash, curtains, spotlight), so they never overlap.
// Times are passed in, so tests need no clock. Items: { type, ms, priority, keep? }.
// Higher priority plays first; equal priority plays in arrival order. Waiting items past
// `staleMs` are dropped (a word flash that is 10 seconds late is just noise) unless `keep` is set.
// If more than `max` items wait, the lowest priority, newest ones are dropped.
export function createFxQueue({ max = 4, staleMs = 6000 } = {}) {
  let current = null;
  let waiting = [];
  let seq = 0;

  const order = (a, b) => b.priority - a.priority || a.seq - b.seq;
  function advance(now) {
    if (current && now >= current.startedAt + current.ms) current = null;
    if (!current) {
      waiting = waiting.filter((w) => w.keep || now - w.queuedAt <= staleMs);
      const next = waiting.shift();
      if (next) current = { ...next, startedAt: now };
    }
    return current;
  }
  return {
    push(item, now) {
      waiting.push({ priority: 1, ...item, queuedAt: now, seq: ++seq });
      waiting.sort(order);
      while (waiting.length > max) {
        const i = waiting.map((w) => !w.keep).lastIndexOf(true);
        waiting.splice(i === -1 ? waiting.length - 1 : i, 1);
      }
      return advance(now);
    },
    advance,
    clear() { current = null; waiting = []; },
    get current() { return current; },
    get size() { return waiting.length; },
  };
}
