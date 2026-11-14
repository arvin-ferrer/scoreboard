import { describe, it, expect } from 'vitest';
import { historyRows } from './history.js';

const entries = [
  { id: 'a', chamber: 'c01', points: 10 },
  { id: 'b', chamber: 'c02', points: 20 },
  { id: 'v', chamber: 'c01', points: 0, voids: 'a' },
  { id: 'c', chamber: 'c01', points: -5 },
];

describe('historyRows', () => {
  it('lists newest first, hides void rows and tags voided entries', () => {
    const rows = historyRows(entries);
    expect(rows.map((r) => r.id)).toEqual(['c', 'b', 'a']);
    expect(rows.find((r) => r.id === 'a').voided).toBe(true);
    expect(rows.find((r) => r.id === 'c').voided).toBe(false);
  });
  it('filters by chamber and keeps voided entries visible', () => {
    expect(historyRows(entries, 'c01').map((r) => r.id)).toEqual(['c', 'a']);
    expect(historyRows(entries, 'c02').map((r) => r.id)).toEqual(['b']);
  });
});
