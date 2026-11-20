import { describe, it, expect } from 'vitest';
import { effectiveEntries, liveEntries, totalsOf, recentFor, countFor } from './entries.js';
import { enqueue, dequeue, loadOutbox, saveOutbox, isFinalAnswer, newId } from './outbox.js';

const e = (id, chamber, points, extra = {}) => ({ id, chamber, points, round: 'allegro', label: 'Correct', voids: null, ...extra });
const add = (id, chamber, points, label = 'Correct') => ({ kind: 'add', msg: { id, chamber, points, round: 'allegro', label } });
const voidOf = (id, voids) => ({ kind: 'void', msg: { id, voids } });
const total = (entries, outbox, ids = ['a', 'b']) => totalsOf(ids, liveEntries(effectiveEntries(entries, outbox)));

describe('totals with unsent entries', () => {
  it('counts host entries and unsent adds', () => {
    expect(total([e('1', 'a', 10)], [add('2', 'a', 5), add('3', 'b', -5)])).toEqual({ a: 15, b: -5 });
  });
  it('does not double count an entry the host already has', () => {
    expect(total([e('1', 'a', 10)], [add('1', 'a', 10)])).toEqual({ a: 10, b: 0 });
  });
  it('an unsent void cancels a host entry', () => {
    expect(total([e('1', 'a', 10)], [voidOf('v', '1')])).toEqual({ a: 0, b: 0 });
  });
  it('an unsent void cancels an unsent add', () => {
    expect(total([], [add('1', 'a', 10), voidOf('v', '1')])).toEqual({ a: 0, b: 0 });
  });
  it('totals can go negative', () => {
    expect(total([], [add('1', 'a', -30)])).toEqual({ a: -30, b: 0 });
  });
  it('ignores voided host entries', () => {
    expect(total([e('1', 'a', 10), { id: 'v', voids: '1', points: 0 }], [])).toEqual({ a: 0, b: 0 });
  });
});

describe('recent entries and counter', () => {
  const live = [e('1', 'a', 1), e('2', 'a', 2), e('3', 'b', 3), e('4', 'a', 4), e('5', 'a', 5)];
  it('returns the newest N for one chamber, newest first', () => {
    expect(recentFor(live, 'a', 3).map((x) => x.id)).toEqual(['5', '4', '2']);
  });
  it('N of 0 shows none', () => expect(recentFor(live, 'a', 0)).toEqual([]));
  it('counts by chamber, round and label', () => {
    const l = [e('1', 'a', -5, { label: 'Syntax error' }), e('2', 'a', -5, { label: 'Syntax error' }), e('3', 'b', -5, { label: 'Syntax error' })];
    expect(countFor(l, 'a', 'allegro', 'Syntax error')).toBe(2);
    expect(countFor(l, 'a', 'andante', 'Syntax error')).toBe(0);
  });
});

describe('outbox', () => {
  const mem = () => { const m = {}; return { getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = v; } }; };
  it('keeps order and ignores a repeated id', () => {
    let o = enqueue([], add('1', 'a', 5));
    o = enqueue(o, add('2', 'a', 5));
    o = enqueue(o, add('1', 'a', 5));
    expect(o.map((x) => x.msg.id)).toEqual(['1', '2']);
  });
  it('removes only the answered item', () => {
    expect(dequeue([add('1', 'a', 5), add('2', 'a', 5)], '1').map((x) => x.msg.id)).toEqual(['2']);
  });
  it('survives a reload via storage', () => {
    const s = mem();
    saveOutbox(s, [add('1', 'a', 5)]);
    expect(loadOutbox(s)).toHaveLength(1);
  });
  it('survives corrupt or blocked storage', () => {
    expect(loadOutbox({ getItem: () => 'nope{' })).toEqual([]);
    expect(loadOutbox({ getItem: () => { throw new Error('blocked'); } })).toEqual([]);
  });
  it('treats added, duplicate and rejected as final, not a missing answer', () => {
    expect(['added', 'duplicate', 'rejected'].every((status) => isFinalAnswer({ status }))).toBe(true);
    expect(isFinalAnswer(undefined)).toBe(false);
  });
});

describe('entry ids', () => {
  it('works on plain http, where browsers hide crypto.randomUUID', () => {
    const plainHttp = { getRandomValues: (a) => globalThis.crypto.getRandomValues(a) };
    const ids = new Set(Array.from({ length: 1000 }, () => newId(plainHttp)));
    expect(ids.size).toBe(1000);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{32}$/);
  });
});
