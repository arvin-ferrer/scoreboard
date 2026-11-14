import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { createEffectsEngine, mergeEffects, streakTier, PREVIEW_IDS } from '../effects.js';

const config = JSON.parse(fs.readFileSync(new URL('../effects.json', import.meta.url), 'utf8'));
const ids = ['a', 'b', 'c', 'd', 'e'];
let n = 0;
const add = (chamber, points) => ({ id: `e${++n}`, chamber, points, voids: null });
const undo = (e) => ({ id: `v${++n}`, voids: e.id });
const make = () => createEffectsEngine({ chamberIds: ids, config });
const types = (fx) => fx.map((f) => f.type + (f.id ? `:${f.id}` : ''));

describe('effects engine', () => {
  it('streaks: 3 positives in a row start a streak, growing at 5 and 7', () => {
    const eng = make();
    const tiers = [];
    for (let i = 0; i < 7; i++) tiers.push(eng.apply(add('a', 10)).find((f) => f.type === 'streak')?.tier ?? 0);
    expect(tiers).toEqual([0, 0, 1, 1, 2, 2, 3]);
    expect(eng.streaks().a).toBe(7);
  });

  it('a negative entry ends a streak; other chambers do not', () => {
    const eng = make();
    for (let i = 0; i < 3; i++) eng.apply(add('a', 10));
    eng.apply(add('b', -5));
    expect(eng.streaks().a).toBe(3);
    const fx = eng.apply(add('a', -5));
    expect(types(fx)).toContain('streakEnd');
    expect(eng.streaks().a).toBe(0);
  });

  it('voiding an entry in the streak ends it; voiding an older one does not', () => {
    const eng = make();
    const old = add('a', 10);
    eng.apply(old);
    eng.apply(add('a', -1)); // ends the first run
    const run = [add('a', 10), add('a', 10), add('a', 10)];
    run.forEach((e) => eng.apply(e));
    expect(eng.apply(undo(old))).toEqual([]);
    expect(eng.streaks().a).toBe(3);
    expect(types(eng.apply(undo(run[1])))).toEqual(['streakEnd']);
    expect(eng.streaks().a).toBe(0);
  });

  it('ENCORE at a streak of 5, once', () => {
    const eng = make();
    const words = [];
    for (let i = 0; i < 7; i++) words.push(...eng.apply(add('a', 5)).filter((f) => f.id === 'encore'));
    expect(words).toHaveLength(1);
  });

  it('+100 gives FORTISSIMO and a gold burst; +99 does not', () => {
    const eng = make();
    expect(types(eng.apply(add('a', 100)))).toEqual(expect.arrayContaining(['burst', 'word:fortissimo']));
    expect(types(eng.apply(add('b', 99)))).not.toContain('burst');
  });

  it('-30 or worse shakes; -29 does not', () => {
    const eng = make();
    expect(types(eng.apply(add('a', -30)))).toContain('shake');
    expect(types(eng.apply(add('b', -29)))).not.toContain('shake');
  });

  it('pop on every entry; a void gives no pop, word or spotlight', () => {
    const eng = make();
    const e = add('a', 20);
    expect(types(eng.apply(e))).toContain('pop');
    expect(types(eng.apply(undo(e)))).toEqual(['streakEnd']); // only the streak ends
  });

  it('new leader only on a strict takeover, not on a tie', () => {
    const eng = make();
    eng.apply(add('a', 50));
    expect(types(eng.apply(add('b', 50)))).not.toContain('newLeader');
    expect(types(eng.apply(add('b', 5)))).toContain('newLeader');
  });

  it('overtake lists the chambers passed', () => {
    const eng = make();
    eng.apply(add('a', 50));
    eng.apply(add('b', 40));
    const fx = eng.apply(add('b', 20));
    expect(fx.find((f) => f.type === 'overtake')).toMatchObject({ chamber: 'b', passed: ['a'] });
  });

  it('CRESCENDO when a chamber climbs 3 or more ranks at once', () => {
    const eng = make();
    eng.apply(add('a', 40)); eng.apply(add('b', 30)); eng.apply(add('c', 20)); eng.apply(add('d', 10));
    // e is 5th at 0; +25 puts it above c and d but not b: climbs 2
    expect(types(eng.apply(add('e', 25)))).not.toContain('word:crescendo');
    const eng2 = make();
    eng2.apply(add('a', 40)); eng2.apply(add('b', 30)); eng2.apply(add('c', 20)); eng2.apply(add('d', 10));
    expect(types(eng2.apply(add('e', 35)))).toContain('word:crescendo'); // 5th to 2nd
  });

  it('DA CAPO when a total climbs from below 0 to above 0', () => {
    const eng = make();
    eng.apply(add('a', -20));
    expect(types(eng.apply(add('a', 10)))).not.toContain('word:daCapo');
    expect(types(eng.apply(add('a', 20)))).toContain('word:daCapo');
  });

  it('reset learns the log quietly: no effects, but streaks come back', () => {
    const eng = make();
    eng.reset([add('a', 10), add('a', 10), add('a', 10), add('a', 10)]);
    expect(eng.streaks().a).toBe(4);
    const e = add('a', 10);
    eng.reset([e]);
    expect(eng.apply(e)).toEqual([]); // same entry again is ignored, not re-fired
  });

  it('ignores an entry it has already seen (duplicate id)', () => {
    const eng = make();
    const e = add('a', 100);
    expect(eng.apply(e).length).toBeGreaterThan(0);
    expect(eng.apply(e)).toEqual([]);
  });

  it('a disabled effect is not produced; its thresholds come from the config', () => {
    const cfg = mergeEffects(config, { effects: { shake: { enabled: false }, fortissimo: { atOrAbove: 50 } } });
    const eng = createEffectsEngine({ chamberIds: ids, config: cfg });
    expect(types(eng.apply(add('a', -60)))).not.toContain('shake');
    expect(types(eng.apply(add('b', 50)))).toContain('word:fortissimo');
  });
});

describe('helpers', () => {
  it('mergeEffects fills gaps and keeps overrides', () => {
    const m = mergeEffects({ a: { x: 1, y: 2 }, b: [1, 2] }, { a: { y: 9 }, b: [5] });
    expect(m).toEqual({ a: { x: 1, y: 9 }, b: [5] });
  });
  it('streakTier counts thresholds reached', () => {
    expect([2, 3, 5, 6, 7, 9].map((x) => streakTier(x, [3, 5, 7]))).toEqual([0, 1, 2, 2, 3, 3]);
  });
  it('every preview id is unique', () => {
    expect(new Set(PREVIEW_IDS).size).toBe(PREVIEW_IDS.length);
  });
});
