import { describe, it, expect } from 'vitest';
import { rank } from '../ranking.js';

const ids = ['a', 'b', 'c', 'd', 'e'];

describe('rank', () => {
  it('orders by total, no ties', () => {
    const r = rank(ids, { a: 5, b: 40, c: 30, d: 20, e: 10 });
    expect(r.order).toEqual(['b', 'c', 'd', 'e', 'a']);
    expect(r.ties).toEqual([]);
  });
  it('reports podium ties one place at a time as winners are picked', () => {
    const totals = { a: 50, b: 50, c: 50, d: 10, e: 0 };
    let r = rank(ids, totals, []);
    expect(r.ties).toEqual([{ place: 1, total: 50, chambers: ['a', 'b', 'c'] }]);
    r = rank(ids, totals, ['c']);
    expect(r.order.slice(0, 3)).toEqual(['c', 'a', 'b']);
    expect(r.ties).toEqual([{ place: 2, total: 50, chambers: ['a', 'b'] }]);
    r = rank(ids, totals, ['c', 'b']);
    expect(r.order.slice(0, 3)).toEqual(['c', 'b', 'a']);
    expect(r.ties).toEqual([]);
  });
  it('ignores ties below 3rd place', () => {
    expect(rank(ids, { a: 9, b: 8, c: 7, d: 1, e: 1 }).ties).toEqual([]);
  });
  it('a tie that starts at 3rd counts', () => {
    expect(rank(ids, { a: 9, b: 8, c: 7, d: 7, e: 0 }).ties).toEqual([{ place: 3, total: 7, chambers: ['c', 'd'] }]);
  });
});
