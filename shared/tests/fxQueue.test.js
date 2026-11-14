import { describe, it, expect } from 'vitest';
import { createFxQueue } from '../fxQueue.js';

const item = (type, ms = 1000, extra = {}) => ({ type, ms, ...extra });

describe('full-screen effect queue', () => {
  it('plays one at a time, in order', () => {
    const q = createFxQueue();
    expect(q.push(item('a'), 0).type).toBe('a');
    expect(q.push(item('b'), 10).type).toBe('a'); // b waits
    expect(q.advance(999).type).toBe('a');
    expect(q.advance(1000).type).toBe('b');
    expect(q.advance(2000)).toBeNull();
  });

  it('higher priority jumps ahead of waiting items, never the one playing', () => {
    const q = createFxQueue();
    q.push(item('first'), 0);
    q.push(item('low', 1000, { priority: 1 }), 1);
    q.push(item('high', 1000, { priority: 3 }), 2);
    expect(q.current.type).toBe('first');
    expect(q.advance(1000).type).toBe('high');
    expect(q.advance(2000).type).toBe('low');
  });

  it('drops waiting items that went stale, but keeps ones marked keep', () => {
    const q = createFxQueue({ staleMs: 3000 });
    q.push(item('long', 5000), 0);
    q.push(item('word'), 1);
    q.push(item('curtains', 1000, { keep: true }), 2);
    expect(q.advance(5000).type).toBe('curtains');
    expect(q.advance(6000)).toBeNull(); // the word went stale
  });

  it('caps the waiting list, dropping the lowest priority newest first', () => {
    const q = createFxQueue({ max: 2, staleMs: 99999 });
    q.push(item('playing'), 0);
    q.push(item('w1'), 1);
    q.push(item('w2'), 2);
    q.push(item('w3'), 3);
    expect(q.size).toBe(2);
    expect(q.advance(1000).type).toBe('w1');
    expect(q.advance(2000).type).toBe('w2');
    expect(q.advance(3000)).toBeNull();
  });

  it('never overlaps: only one current item at any time', () => {
    const q = createFxQueue();
    for (let i = 0; i < 6; i++) q.push(item(`x${i}`, 500), i);
    const seen = [];
    for (let t = 0; t <= 4000; t += 100) { const c = q.advance(t); if (c && seen.at(-1) !== c.seq) seen.push(c.seq); }
    expect(seen.length).toBeGreaterThan(1);
  });
});
