import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createScoreboard } from './app.js';
import { createBackup } from './backup.js';
import { restoreBackup } from './restore.js';
import { parseArgs } from './cli.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const port = Number(process.env.PORT) || 3000;
const dbPath = process.env.SCORE_DB || path.join(root, 'data/scores.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

// Exit code 2 means "setup problem, restarting will not help": the start script stops instead of looping.
const SETUP_ERROR = 2;
let args;
try {
  args = parseArgs(process.argv.slice(2));
} catch (e) {
  console.error(e.message);
  process.exit(SETUP_ERROR);
}

if (args.fromBackup) {
  try {
    const r = restoreBackup(args.fromBackup, dbPath, { force: args.force });
    const when = r.lastEntryAt ? new Date(r.lastEntryAt).toLocaleString() : 'no entries';
    console.log(`Restored ${r.entries} entries from ${r.file} (last entry: ${when}).`);
    if (r.movedTo) console.log(`The previous scores on this laptop were kept as ${r.movedTo}`);
  } catch (e) {
    console.error(`RESTORE FAILED: ${e.message}`);
    process.exit(SETUP_ERROR);
  }
}

const settingsFile = path.join(root, 'shared/settings.json');
const settings = fs.existsSync(settingsFile) ? JSON.parse(fs.readFileSync(settingsFile, 'utf8')) : {};
const backupDir = args.backupDir || process.env.BACKUP_DIR || settings.backupDir || '';

const sb = createScoreboard({ root, dbPath });
const p = await sb.listen(port);
console.log(`Scoreboard server on port ${p}. ${sb.log.count()} entries replayed from ${dbPath}`);

let backup = null;
if (backupDir) {
  backup = createBackup({
    log: sb.log, chambers: sb.chamberList(), dir: path.resolve(root, backupDir), keep: Number(settings.backupKeep) || 10,
  });
  backup.start();
  console.log(`Backing up every minute to ${path.resolve(root, backupDir)}`);
} else {
  console.log('WARNING: no backup folder set. Set backupDir in shared/settings.json or pass --backup-dir.');
}

const missing = sb.chamberList().flatMap((c) => [c.logoUrl ? null : `${c.id} logo`, c.songUrl ? null : `${c.id} song`]).filter(Boolean);
if (missing.length) console.log(`Missing chamber files (fallbacks will be used): ${missing.join(', ')}`);

// Clean stop (Ctrl+C): one last backup, then exit. Falls back to a hard exit if closing hangs.
let closing = false;
const shutdown = async () => {
  if (closing) return;
  closing = true;
  setTimeout(() => process.exit(0), 3000).unref();
  backup?.stop();
  await backup?.run();
  await sb.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
