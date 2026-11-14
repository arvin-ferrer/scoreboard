import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { LATEST_DB, stamp } from './backup.js';

// A backup is either a .sqlite file, or the backup folder (newest backup inside is used).
export function findBackupFile(src) {
  if (!fs.existsSync(src)) throw new Error(`Backup not found: ${src}`);
  if (fs.statSync(src).isFile()) return src;
  const latest = path.join(src, LATEST_DB);
  if (fs.existsSync(latest)) return latest;
  const stamped = fs.readdirSync(src).filter((f) => /^backup-\d{8}-\d{6}\.sqlite$/.test(f)).sort();
  if (!stamped.length) throw new Error(`No backup files in ${src} (looked for ${LATEST_DB} and backup-*.sqlite)`);
  return path.join(src, stamped.at(-1));
}

function inspect(file) {
  const db = new Database(file, { readonly: true, fileMustExist: true });
  try {
    if (db.pragma('integrity_check', { simple: true }) !== 'ok') throw new Error('file is damaged');
    const r = db.prepare('SELECT COUNT(*) AS n, MAX(host_time) AS last FROM entries').get();
    return { entries: r.n, lastEntryAt: r.last };
  } finally {
    db.close();
  }
}

// Copies a backup into place as the local score log. Run before the server opens the database.
// Refuses to replace a local log that has entries unless `force`; the old file is then kept aside.
export function restoreBackup(src, dbPath, { force = false, clock = Date.now } = {}) {
  const file = findBackupFile(src);
  let info;
  try { info = inspect(file); } catch (e) { throw new Error(`${file} is not a usable score backup: ${e.message}`); }

  let movedTo = null;
  if (fs.existsSync(dbPath)) {
    let have = -1;
    try { have = inspect(dbPath).entries; } catch { /* unreadable: treated as unknown */ }
    if (have !== 0 && !force) {
      throw new Error(
        `This laptop already has scores (${have < 0 ? 'unreadable file' : `${have} entries`}) in ${dbPath}. ` +
        'Restoring would replace them. If that is what you want, run again with --force (the old file is kept aside).'
      );
    }
    movedTo = path.join(path.dirname(dbPath), `scores.before-restore-${stamp(clock())}.sqlite`);
    fs.renameSync(dbPath, movedTo);
  }
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const tmp = `${dbPath}.restoring`;
  fs.copyFileSync(file, tmp);
  fs.renameSync(tmp, dbPath);
  return { file, ...info, movedTo };
}
