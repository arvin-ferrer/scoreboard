import fs from 'node:fs';
import path from 'node:path';
import { openScoreLog } from './scoreLog.js';
import { rank } from '../../shared/ranking.js';

export const LATEST_DB = 'scores-latest.sqlite';
export const LATEST_CSV = 'standings-latest.csv';
const STAMPED = /^backup-\d{8}-\d{6}\.sqlite$/;

const pad = (n) => String(n).padStart(2, '0');
// Local time, sortable: 20261114-093005.
export function stamp(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

const csvCell = (v) => {
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Excel-friendly: UTF-8 with BOM, CRLF. Rank is the position on the projector (after any tie picks).
export function standingsCsv({ chambers, totals, order, asOf }) {
  const names = new Map(chambers.map((c) => [c.id, c.name]));
  const rows = ['rank,chamber_id,name,total,as_of'];
  order.forEach((id, i) => rows.push([i + 1, id, names.get(id) ?? id, totals[id] ?? 0, asOf].map(csvCell).join(',')));
  return `﻿${rows.join('\r\n')}\r\n`;
}

// Writes a backup of the score log and a standings CSV into `dir`.
//  scores-latest.sqlite + standings-latest.csv are replaced every run (via a temp file and rename,
//  so a crash or a pulled USB drive never leaves a half-written file).
//  backup-<time>.sqlite/.csv copies are kept only when something changed, newest `keep` of them.
// The CSV is built from the copy itself, so the two files always agree.
export function createBackup({ log, chambers, dir, keep = 10, clock = Date.now, logger = console }) {
  const chamberIds = chambers.map((c) => c.id);
  let running = null;
  let lastSignature = null;
  let failing = false;
  const status = { lastOkAt: null, lastError: null };

  async function once() {
    fs.mkdirSync(dir, { recursive: true });
    const tmpDb = path.join(dir, '.scores-latest.tmp');
    const tmpCsv = path.join(dir, '.standings-latest.tmp');
    const now = clock();
    const signature = JSON.stringify([log.count(), log.getState('game')]);

    await log.backupTo(tmpDb);
    const copy = openScoreLog(tmpDb);
    let csv;
    try {
      const totals = copy.totals(chamberIds);
      const { order } = rank(chamberIds, totals, copy.getState('game')?.tieOrder ?? []);
      csv = standingsCsv({ chambers, totals, order, asOf: new Date(now).toISOString() });
    } finally {
      copy.close();
    }
    fs.writeFileSync(tmpCsv, csv);
    fs.renameSync(tmpDb, path.join(dir, LATEST_DB));
    fs.renameSync(tmpCsv, path.join(dir, LATEST_CSV));

    if (signature !== lastSignature) {
      const name = `backup-${stamp(now)}`;
      fs.copyFileSync(path.join(dir, LATEST_DB), path.join(dir, `${name}.sqlite`));
      fs.copyFileSync(path.join(dir, LATEST_CSV), path.join(dir, `${name}.csv`));
      lastSignature = signature;
      const old = fs.readdirSync(dir).filter((f) => STAMPED.test(f)).sort().slice(0, -keep);
      for (const f of old) {
        fs.rmSync(path.join(dir, f), { force: true });
        fs.rmSync(path.join(dir, f.replace(/\.sqlite$/, '.csv')), { force: true });
      }
    }
  }

  // Never throws: a failed backup must not stop scoring. Calls made while one is running share it.
  function run() {
    if (running) return running;
    running = once()
      .then(() => {
        if (failing || status.lastOkAt === null) logger.log(`Backup OK: ${dir}`);
        failing = false;
        status.lastOkAt = clock();
        status.lastError = null;
      })
      .catch((err) => {
        failing = true;
        status.lastError = err.message;
        logger.error(`BACKUP FAILED (scoring continues): ${err.message}. Is the backup folder available?`);
      })
      .finally(() => { running = null; });
    return running;
  }

  let timer = null;
  return {
    run,
    status,
    start(intervalMs = 60_000) {
      run();
      timer = setInterval(run, intervalMs);
      timer.unref?.();
    },
    stop() {
      clearInterval(timer);
    },
  };
}
