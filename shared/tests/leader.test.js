import { describe, it, expect } from 'vitest';
import { createLeaderTracker } from '../leader.js';

const ids = ['a', 'b', 'c'];

describe('leader tracker', () => {
  it('starts the first song at once when one chamber leads', () => {
    const t = createLeaderTracker({ holdMs: 10000 });
    expect(t.update(ids, { a: 5, b: 0, c: 0 }, 0)).toBe('a');
  });

  it('stays silent while everyone is tied, even at 0', () => {
    const t = createLeaderTracker();
    expect(t.update(ids, {}, 0)).toBe(null);
    expect(t.update(ids, { a: 10, b: 10, c: 0 }, 1000)).toBe(null);
  });

  it('switches only after the new leader holds 1st for the whole wait', () => {
    const t = createLeaderTracker({ holdMs: 10000 });
    t.update(ids, { a: 10 }, 0);
    expect(t.update(ids, { a: 10, b: 20 }, 1000)).toBe('a');
    expect(t.update(ids, { a: 10, b: 20 }, 10999)).toBe('a');
    expect(t.update(ids, { a: 10, b: 20 }, 11000)).toBe('b');
  });

  it('restarts the wait if the new leader loses 1st, or a different one takes over', () => {
    const t = createLeaderTracker({ holdMs: 10000 });
    t.update(ids, { a: 10 }, 0);
    t.update(ids, { a: 10, b: 20 }, 1000); // b starts waiting
    t.update(ids, { a: 30, b: 20 }, 8000); // a is back in front: wait cancelled
    expect(t.update(ids, { a: 10, b: 20 }, 9000)).toBe('a'); // b starts again at 9000
    expect(t.update(ids, { a: 10, b: 20 }, 18000)).toBe('a');
    expect(t.update(ids, { a: 10, b: 20 }, 19000)).toBe('b');
    // c takes over from b: c has to wait its own 10 s
    t.update(ids, { a: 10, b: 20, c: 50 }, 20000);
    expect(t.update(ids, { a: 10, b: 20, c: 50 }, 29000)).toBe('b');
    expect(t.update(ids, { a: 10, b: 20, c: 50 }, 30000)).toBe('c');
  });

  it('keeps the current song on a tie for 1st, and cancels a pending switch', () => {
    const t = createLeaderTracker({ holdMs: 10000 });
    t.update(ids, { a: 10 }, 0);
    t.update(ids, { a: 10, b: 20 }, 1000); // b waiting
    expect(t.update(ids, { a: 20, b: 20 }, 5000)).toBe('a'); // tie
    expect(t.update(ids, { a: 10, b: 20 }, 6000)).toBe('a'); // b has to start the wait again
    expect(t.update(ids, { a: 10, b: 20 }, 15000)).toBe('a');
    expect(t.update(ids, { a: 10, b: 20 }, 16000)).toBe('b');
  });

  it('keeps the song when the current chamber falls into a tie it is not part of', () => {
    const t = createLeaderTracker();
    t.update(ids, { a: 10 }, 0);
    expect(t.update(ids, { a: 0, b: 20, c: 20 }, 100)).toBe('a');
  });

  it('negative totals still rank', () => {
    const t = createLeaderTracker();
    expect(t.update(ids, { a: -10, b: -5, c: -20 }, 0)).toBe('b');
  });

  it('reset lets the next single leader start at once', () => {
    const t = createLeaderTracker({ holdMs: 10000 });
    t.update(ids, { a: 10 }, 0);
    t.reset();
    expect(t.update(ids, { a: 10, b: 20 }, 1)).toBe('b');
  });
});
