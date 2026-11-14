import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openScoreLog } from './scoreLog.js';
import { createBackup, standingsCsv, LATEST_DB, LATEST_CSV } from './backup.js';
import { restoreBackup } from './restore.js';
import { parseArgs } from './cli.js';

const dirs = [];
const tmp = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'bk-')); dirs.push(d); return d; };
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }); });

const chambers = [{ id: 'c01', name: 'Alpha, "The First"' }, { id: 'c02', name: 'Beta' }, { id: 'c03', name: 'Gamma' }];
const silent = { log() {}, error() {} };
const add = (log, id, chamber, points) => log.addEntry({ id, chamber, points, round: 'adagio', label: '', device: 'T' });
const silentRun = (log, dir, extra = {}) => createBackup({ log, chambers, dir, logger: silent, ...extra });

describe('standings csv', () => {
  it('quotes names, keeps negative totals, has a BOM and rank order', () => {
    const csv = standingsCsv({ chambers, totals: { c01: -5, c02: 10, c03: 10 }, order: ['c02', 'c03', 'c01'], asOf: 'T' });
    expect(csv.startsWith('\ufeffrank,chamber_id,name,total,as_of\r\n')).toBe(true);
    expect(csv).toContain('1,c02,Beta,10,T');
    expect(csv).toContain('3,c01,"Alpha, ""The First""",-5,T');
  });
});

describe('backup', () => {
  it('writes a backup whose replayed totals match, plus the CSV', async () => {
    const dir = tmp(), out = path.join(tmp(), 'usb');
    const log = openScoreLog(path.join(dir, 's.sqlite'));
    add(log, 'a', 'c01', 20); add(log, 'b', 'c02', -10); add(log, 'c', 'c02', 5);
    log.voidEntry({ id: 'v', voids: 'c' });
    log.setState('game', { round: 'andante', tieOrder: [] });
    await silentRun(log, out).run();
    const copy = openScoreLog(path.join(out, LATEST_DB));
    expect(copy.totals(['c01', 'c02', 'c03'])).toEqual({ c01: 20, c02: -10, c03: 0 });
    expect(copy.getState('game').round).toBe('andante');
    copy.close();
    const csv = fs.readFileSync(path.join(out, LATEST_CSV), 'utf8');
    expect(csv).toMatch(/1,c01,"Alpha, ""The First""",20,/);
    expect(csv).toMatch(/3,c02,Beta,-10,/);
    expect(fs.readdirSync(out).filter((f) => f.startsWith('.'))).toEqual([]);
    log.close();
  });

  it('keeps stamped copies only when something changed, newest N', async () => {
    const log = openScoreLog(path.join(tmp(), 's.sqlite'));
    const out = tmp();
    let t = new Date(2026, 10, 14, 9, 0, 0).getTime();
    const b = silentRun(log, out, { keep: 3, clock: () => (t += 60_000) });
    await b.run(); await b.run(); // nothing changed between runs
    expect(fs.readdirSync(out).filter((f) => f.endsWith('.sqlite') && f.startsWith('backup-'))).toHaveLength(1);
    for (let i = 0; i < 5; i++) { add(log, `e${i}`, 'c01', 1); await b.run(); }
    const stamped = fs.readdirSync(out).filter((f) => /^backup-.*\.sqlite$/.test(f));
    const csvs = fs.readdirSync(out).filter((f) => /^backup-.*\.csv$/.test(f));
    expect(stamped).toHaveLength(3);
    expect(csvs).toHaveLength(3);
    log.close();
  });

  it('does not throw when the folder is unusable, and recovers', async () => {
    const log = openScoreLog(path.join(tmp(), 's.sqlite'));
    const blocker = path.join(tmp(), 'file');
    fs.writeFileSync(blocker, 'x');
    const errors = [];
    const b = createBackup({ log, chambers, dir: path.join(blocker, 'sub'), logger: { log() {}, error: (m) => errors.push(m) } });
    await expect(b.run()).resolves.toBeUndefined();
    expect(errors[0]).toMatch(/BACKUP FAILED/);
    expect(b.status.lastError).toBeTruthy();
    log.close();
  });
});

describe('restore', () => {
  async function makeBackup() {
    const log = openScoreLog(path.join(tmp(), 's.sqlite'));
    add(log, 'a', 'c01', 30); add(log, 'b', 'c03', 15);
    const out = tmp();
    await silentRun(log, out).run();
    log.close();
    return out;
  }

  it('restores from a folder into an empty place, and replay gives the same totals', async () => {
    const out = await makeBackup();
    const db = path.join(tmp(), 'data', 'scores.sqlite');
    const r = restoreBackup(out, db);
    expect(r.entries).toBe(2);
    const log = openScoreLog(db);
    expect(log.totals(['c01', 'c03'])).toEqual({ c01: 30, c03: 15 });
    log.close();
  });

  it('refuses to replace local scores unless forced, then keeps the old file', async () => {
    const out = await makeBackup();
    const dir = tmp(), db = path.join(dir, 'scores.sqlite');
    const local = openScoreLog(db);
    add(local, 'mine', 'c02', 99);
    local.close();
    expect(() => restoreBackup(out, db)).toThrow(/--force/);
    expect(openScoreLog(db).count()).toBe(1);
    const r = restoreBackup(out, db, { force: true });
    expect(r.movedTo).toBeTruthy();
    const old = openScoreLog(r.movedTo); expect(old.count()).toBe(1); old.close();
    const now = openScoreLog(db); expect(now.count()).toBe(2); now.close();
  });

  it('rejects a missing or non-database source', () => {
    expect(() => restoreBackup(path.join(tmp(), 'nope'), path.join(tmp(), 'x.sqlite'))).toThrow(/not found/);
    const d = tmp(), f = path.join(d, 'bad.sqlite');
    fs.writeFileSync(f, 'not a database');
    expect(() => restoreBackup(f, path.join(d, 'x.sqlite'))).toThrow(/not a usable/);
  });
});

describe('cli args', () => {
  it('parses options and rejects unknown ones', () => {
    expect(parseArgs(['--backup-dir', 'E:\\b', '--from-backup=F:\\x', '--force'])).toEqual({ backupDir: 'E:\\b', fromBackup: 'F:\\x', force: true });
    expect(() => parseArgs(['--nope'])).toThrow();
    expect(() => parseArgs(['--from-backup'])).toThrow();
  });
});
