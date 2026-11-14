import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openScoreLog } from './scoreLog.js';
import { createGameState } from './gameState.js';

const C = ['c01', 'c02'];
let n = 0;
const entry = (chamber, points, extra = {}) => ({ id: `e${++n}`, chamber, points, round: 'adagio', label: '', device: 'd1', ...extra });
const dirs = [];
const tmpDb = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'score-')); dirs.push(d); return path.join(d, 's.sqlite'); };
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }); });

describe('sums', () => {
  it('adds entries per chamber and allows negative totals', () => {
    const log = openScoreLog();
    log.addEntry(entry('c01', 20));
    log.addEntry(entry('c01', 10));
    log.addEntry(entry('c02', -15));
    expect(log.totals(C)).toEqual({ c01: 30, c02: -15 });
  });
  it('chambers with no entries total 0', () => {
    expect(openScoreLog().totals(C)).toEqual({ c01: 0, c02: 0 });
  });
});

describe('voids', () => {
  it('a void removes the entry from the total and the log only grows', () => {
    const log = openScoreLog();
    const a = entry('c01', 30);
    log.addEntry(a);
    log.addEntry(entry('c01', 10));
    expect(log.count()).toBe(2);
    expect(log.voidEntry({ id: 'v1', voids: a.id, device: 'd1' }).status).toBe('added');
    expect(log.totals(C).c01).toBe(10);
    expect(log.count()).toBe(3);
  });
  it('voiding twice, voiding a void, or voiding a missing id is rejected', () => {
    const log = openScoreLog();
    const a = entry('c01', 30);
    log.addEntry(a);
    log.voidEntry({ id: 'v1', voids: a.id });
    expect(log.voidEntry({ id: 'v2', voids: a.id }).status).toBe('rejected');
    expect(log.voidEntry({ id: 'v3', voids: 'v1' }).status).toBe('rejected');
    expect(log.voidEntry({ id: 'v4', voids: 'nope' }).status).toBe('rejected');
    expect(log.totals(C).c01).toBe(0);
    expect(log.count()).toBe(2);
  });
  it('the database refuses UPDATE and DELETE', () => {
    const file = tmpDb();
    const log = openScoreLog(file);
    log.addEntry(entry('c01', 5));
    log.close();
    // open raw to try to tamper
    return import('better-sqlite3').then(({ default: D }) => {
      const db = new D(file);
      expect(() => db.prepare('UPDATE entries SET points = 99').run()).toThrow(/append-only/);
      expect(() => db.prepare('DELETE FROM entries').run()).toThrow(/append-only/);
      db.close();
    });
  });
});

describe('duplicate ids', () => {
  it('counts a repeated id once', () => {
    const log = openScoreLog();
    const a = entry('c01', 20);
    expect(log.addEntry(a).status).toBe('added');
    expect(log.addEntry(a).status).toBe('duplicate');
    expect(log.addEntry({ ...a, points: 999 }).status).toBe('duplicate');
    expect(log.totals(C).c01).toBe(20);
    expect(log.count()).toBe(1);
  });
  it('a repeated void id is also ignored', () => {
    const log = openScoreLog();
    const a = entry('c01', 20);
    log.addEntry(a);
    log.voidEntry({ id: 'v1', voids: a.id });
    expect(log.voidEntry({ id: 'v1', voids: a.id }).status).toBe('duplicate');
    expect(log.count()).toBe(2);
  });
});

describe('replay after restart', () => {
  it('rebuilds totals, round, timer and tie picks from disk', () => {
    const file = tmpDb();
    let t = 1000;
    const clock = () => t;
    const rounds = ['adagio', 'andante'];

    let log = openScoreLog(file, clock);
    const a = entry('c01', 30), b = entry('c02', 20);
    log.addEntry(a); log.addEntry(b); log.addEntry(entry('c01', 10));
    log.voidEntry({ id: 'v1', voids: b.id });
    let game = createGameState(log, rounds, clock);
    game.setRound('andante');
    game.startTimer(60);
    t = 11000;
    game.pauseTimer();
    game.pickTieWinner('c02');
    const before = { totals: log.totals(C), state: game.get() };
    log.close();

    log = openScoreLog(file, clock);
    game = createGameState(log, rounds, clock);
    expect(log.totals(C)).toEqual(before.totals);
    expect(log.totals(C)).toEqual({ c01: 40, c02: 0 });
    expect(game.get().round).toBe('andante');
    expect(game.get().timer).toEqual({ duration: 60, startedAt: 1000, pausedAt: 11000 });
    expect(game.get().tieOrder).toEqual(['c02']);
    // an id seen before the restart is still a duplicate
    expect(log.addEntry(a).status).toBe('duplicate');
    log.close();
  });
});

describe('timer on host time', () => {
  it('resume shifts startedAt by the paused time', () => {
    let t = 0;
    const log = openScoreLog(':memory:', () => t);
    const g = createGameState(log, ['adagio'], () => t);
    t = 100; g.startTimer(60);
    t = 400; g.pauseTimer();
    t = 1000; g.startTimer();
    expect(g.get().timer).toEqual({ duration: 60, startedAt: 700, pausedAt: null });
    g.resetTimer(30);
    expect(g.get().timer).toEqual({ duration: 30, startedAt: null, pausedAt: null });
  });
});
