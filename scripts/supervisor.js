// Runs the scoreboard server and restarts it if it stops. Used by start-scoreboard.bat.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lanUrls } from './lan-url.js';
import { parseArgs } from '../server/src/cli.js';

const RESTART_DELAY_MS = 2000;
const SLOW_DELAY_MS = 10_000;
const BURST_COUNT = 5;      // this many stops ...
const BURST_WINDOW_MS = 30_000; // ... within this long means something is badly wrong: slow down
const SETUP_ERROR = 2;      // server exit code meaning "do not restart" (bad options, failed restore)

// spawnChild({ first }) resolves with the server's exit code. `first` is true only for the first start,
// so one-time options such as --from-backup are never applied again after a crash.
export async function runSupervisor({ spawnChild, sleep, now = Date.now, log = console.log, isStopping = () => false }) {
  const stops = [];
  let first = true;
  let restarts = 0;
  while (!isStopping()) {
    const code = await spawnChild({ first });
    first = false;
    if (isStopping()) break;
    if (code === SETUP_ERROR) {
      log('The server could not start because of a setup problem (see the message above). Not restarting.');
      return SETUP_ERROR;
    }
    const t = now();
    stops.push(t);
    while (stops.length && t - stops[0] > BURST_WINDOW_MS) stops.shift();
    const slow = stops.length >= BURST_COUNT;
    const delay = slow ? SLOW_DELAY_MS : RESTART_DELAY_MS;
    restarts++;
    log(`\nServer stopped (exit code ${code}). Restarting in ${delay / 1000} s (restart #${restarts}). Scores are kept.`);
    if (slow) log('It keeps stopping. If another scoreboard window is already open on this laptop, close it.');
    await sleep(delay);
  }
  return 0;
}

const waitHealthy = (port, tries = 60) => new Promise((resolve) => {
  const attempt = (n) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/api/health', timeout: 1000 }, (res) => {
      res.resume();
      if (res.statusCode === 200) resolve(true);
      else if (n > 1) setTimeout(() => attempt(n - 1), 500);
      else resolve(false);
    });
    req.on('error', () => (n > 1 ? setTimeout(() => attempt(n - 1), 500) : resolve(false)));
    req.on('timeout', () => req.destroy());
  };
  attempt(tries);
});

function banner(port) {
  const urls = lanUrls(port);
  const lines = urls.length
    ? urls.map((u, i) => `   ${i === 0 ? 'SCORERS OPEN:' : '       or:    '}  ${u.url}${urls.length > 1 ? `   (${u.name})` : ''}`)
    : [`   No network found. Connect to the hotspot, then restart. (This laptop only: http://localhost:${port})`];
  console.log(['', '='.repeat(64), '  Scoreboard is running.', ...lines, '='.repeat(64), ''].join('\n'));
}

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  let args;
  try { args = parseArgs(process.argv.slice(2)); } catch (e) { console.error(e.message); return 1; }
  if (!fs.existsSync(path.join(root, 'node_modules'))) { console.error('Dependencies are missing: run "npm install" once (needs internet) or copy the full folder.'); return 1; }
  if (!fs.existsSync(path.join(root, 'client/dist'))) { console.error('The screens are not built yet: run "npm run build" once.'); return 1; }

  const port = Number(process.env.PORT) || 3000;
  let child = null;
  let stopping = false;
  const stop = () => { stopping = true; child?.kill(); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  const spawnChild = ({ first }) => new Promise((resolve) => {
    const childArgs = [path.join(root, 'server/src/index.js')];
    if (first && args.fromBackup) childArgs.push('--from-backup', args.fromBackup);
    if (first && args.force) childArgs.push('--force');
    const env = { ...process.env, ...(args.backupDir ? { BACKUP_DIR: args.backupDir } : {}) };
    child = spawn(process.execPath, childArgs, { cwd: root, env, stdio: 'inherit' });
    waitHealthy(port).then((ok) => { if (ok && child && child.exitCode === null) banner(port); });
    child.on('error', (e) => { console.error(`Could not start the server: ${e.message}`); resolve(1); });
    child.on('exit', (code) => resolve(code ?? 1));
  });

  return runSupervisor({ spawnChild, sleep: (ms) => new Promise((r) => setTimeout(r, ms)), isStopping: () => stopping });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
