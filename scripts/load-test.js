// Load test: bot clients each send entries to a scoreboard server, then the log is checked.
//   npm run load-test -- <host:port or URL> --yes-write-to-this-server
// WRITES REAL ENTRIES to that server's append-only log. Point it at a throwaway server only,
// e.g.  SCORE_DB=%TEMP%\loadtest.sqlite npm start   (never the live scoreboard).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { io as connect } from 'socket.io-client';

export const percentile = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] : null);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const withTimeout = (p, ms, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`timed out: ${what}`)), ms))]);

export function normalizeUrl(addr) {
  const a = String(addr).trim();
  return /^https?:\/\//.test(a) ? a.replace(/\/+$/, '') : `http://${a.replace(/\/+$/, '')}`;
}

// Every non-tiebreak round's quick-button values, read from shared/scoring.json (never hard-coded).
export function scoringChoices(scoring) {
  return Object.entries(scoring.rounds)
    .filter(([, r]) => !r.tiebreak)
    .flatMap(([round, r]) => r.groups.flatMap((g) => g.values.map((points) => ({ round, points }))));
}

export async function runLoadTest({ url, clients = 8, rate = 2, seconds = 300, dupEvery = 50, log = () => {} }) {
  const runId = Date.now().toString(36);
  const prefix = `lt-${runId}-`;
  const sockets = [];
  const open = async (name) => {
    const s = connect(url, { reconnection: true });
    sockets.push(s);
    const snap = new Promise((resolve) => s.once('snapshot', resolve));
    const err = new Promise((_, rej) => s.once('connect_error', (e) => rej(new Error(`cannot connect to ${url} (${e.message})`))));
    return { s, snap: await withTimeout(Promise.race([snap, err]), 10_000, `${name} connecting to ${url}`) };
  };

  try {
    const observer = await open('observer');
    const { chambers, scoring, entries: before, totals: totalsBefore } = observer.snap;
    const choices = scoringChoices(scoring);
    if (!chambers.length || !choices.length) throw new Error('server has no chambers or scoring values');
    const baseSeq = before.reduce((m, e) => Math.max(m, e.seq), 0);

    const sent = new Map(); // id -> { sentAt, points, ackAt, status, seenAt }
    const resends = { sent: 0, wronglyAdded: 0 };
    observer.s.on('entry', (e) => {
      const rec = sent.get(e.id);
      if (rec && rec.seenAt === undefined) rec.seenAt = performance.now();
    });

    const bots = await Promise.all(Array.from({ length: clients }, (_, i) => open(`bot ${i}`)));
    const total = Math.round(seconds * rate);
    const period = 1000 / rate;
    log(`${clients} bots connected. Sending ${total} entries each (${clients * total} total) over ${seconds} s.`);
    const t0 = performance.now();

    const runBot = (i) => new Promise((resolve) => {
      const { s } = bots[i];
      const startAt = Date.now() + (i / clients) * period; // bots are not in lockstep
      let n = 0;
      const emit = (entry, isResend) => s.emit('entry:add', entry, (res) => {
        const rec = sent.get(entry.id);
        if (isResend) { if (res?.status === 'added') resends.wronglyAdded++; return; }
        rec.ackAt = performance.now();
        rec.status = res?.status;
      });
      const tick = () => {
        if (n >= total) return resolve();
        const pick = choices[(i + n) % choices.length];
        const entry = {
          id: `${prefix}${i}-${n}`, chamber: chambers[(i * 3 + n) % chambers.length].id, points: pick.points,
          round: pick.round, label: 'loadtest', device: `bot-${runId}-${i}`,
        };
        sent.set(entry.id, { sentAt: performance.now(), points: pick.points });
        emit(entry, false);
        if (dupEvery > 0 && n % dupEvery === dupEvery - 1) { resends.sent++; emit(entry, true); }
        n++;
        setTimeout(tick, Math.max(0, startAt + n * period - Date.now()));
      };
      setTimeout(tick, Math.max(0, startAt - Date.now()));
    });

    const ticker = setInterval(() => {
      const acked = [...sent.values()].filter((r) => r.ackAt !== undefined).length;
      log(`  ${((performance.now() - t0) / 1000).toFixed(0)} s: sent ${sent.size}, acked ${acked}`);
    }, 10_000);
    await Promise.all(bots.map((_, i) => runBot(i)));
    clearInterval(ticker);
    const elapsed = (performance.now() - t0) / 1000;

    // Let late acks and broadcasts arrive, then read back what the server actually stored.
    for (let waited = 0; waited < 5000 && [...sent.values()].some((r) => r.ackAt === undefined); waited += 100) await sleep(100);
    await sleep(1000);
    const after = await withTimeout(new Promise((r) => observer.s.emit('sync:since', baseSeq, r)), 20_000, 'reading back the log');

    const mine = after.entries.filter((e) => e.id.startsWith(prefix));
    const others = after.entries.length - mine.length;
    const storedIds = new Map();
    for (const e of mine) storedIds.set(e.id, (storedIds.get(e.id) ?? 0) + 1);
    const lost = [...sent.keys()].filter((id) => !storedIds.has(id));
    const duplicated = [...storedIds].filter(([, n]) => n > 1).map(([id]) => id);
    const unknown = [...storedIds.keys()].filter((id) => !sent.has(id));

    const recs = [...sent.values()];
    const ackMs = recs.filter((r) => r.ackAt !== undefined).map((r) => r.ackAt - r.sentAt).sort((a, b) => a - b);
    const seenMs = recs.filter((r) => r.seenAt !== undefined).map((r) => r.seenAt - r.sentAt).sort((a, b) => a - b);
    const stats = (a) => ({ n: a.length, p50: percentile(a, 50), p95: percentile(a, 95), p99: percentile(a, 99), max: a.at(-1) ?? null });

    const expectedDelta = recs.reduce((s, r) => s + r.points, 0);
    const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
    const actualDelta = sum(after.totals) - sum(totalsBefore);
    const sumChecked = others === 0;
    const sumOk = !sumChecked || actualDelta === expectedDelta;

    const report = {
      url, clients, entriesSent: sent.size, resendsSent: resends.sent, seconds: elapsed,
      acked: ackMs.length, neverAcked: recs.length - ackMs.length,
      lost: lost.length, lostIds: lost.slice(0, 10),
      duplicatesInLog: duplicated.length, resendsWronglyCounted: resends.wronglyAdded, unexpectedEntries: unknown.length,
      otherEntriesDuringTest: others, expectedDelta, actualDelta, sumChecked, sumOk,
      ackLatencyMs: stats(ackMs), broadcastLatencyMs: stats(seenMs),
    };
    report.pass = report.lost === 0 && report.duplicatesInLog === 0 && report.resendsWronglyCounted === 0 && report.unexpectedEntries === 0 && sumOk;
    return report;
  } finally {
    for (const s of sockets) s.close();
  }
}

export function formatReport(r) {
  const ms = (v) => (v === null ? '-' : v.toFixed(1));
  const lat = (name, s) => `${name} (${s.n}): p50 ${ms(s.p50)}  p95 ${ms(s.p95)}  p99 ${ms(s.p99)}  max ${ms(s.max)}`;
  return [
    '', `Load test result for ${r.url}`, '-'.repeat(60),
    `${r.entriesSent} entries from ${r.clients} bots in ${r.seconds.toFixed(1)} s (+ ${r.resendsSent} deliberate re-sends)`,
    `Acknowledged: ${r.acked} / ${r.entriesSent}   (never acknowledged: ${r.neverAcked})`,
    `LOST entries (sent, not in the log): ${r.lost}${r.lost ? `   e.g. ${r.lostIds.join(', ')}` : ''}`,
    `DUPLICATE entries in the log: ${r.duplicatesInLog}   re-sends wrongly counted: ${r.resendsWronglyCounted}   unexpected: ${r.unexpectedEntries}`,
    lat('Ack latency ms     ', r.ackLatencyMs),
    lat('Broadcast latency ms', r.broadcastLatencyMs),
    r.sumChecked
      ? `Total points check: expected ${r.expectedDelta}, server ${r.actualDelta} -> ${r.sumOk ? 'OK' : 'MISMATCH'}`
      : `Total points check skipped: ${r.otherEntriesDuringTest} other entries were added during the test`,
    '-'.repeat(60), r.pass ? 'RESULT: PASS' : 'RESULT: FAIL', '',
  ].join('\n');
}

const USAGE = `Usage: npm run load-test -- <host:port> --yes-write-to-this-server [--clients 8] [--rate 2] [--seconds 300] [--dup-every 50]
Writes real entries to the server's append-only log. Use a throwaway server (SCORE_DB=<temp file> npm start), not the live one.`;

async function main(argv) {
  const opts = { clients: 8, rate: 2, seconds: 300, dupEvery: 50 };
  const flags = { '--clients': 'clients', '--rate': 'rate', '--seconds': 'seconds', '--dup-every': 'dupEvery' };
  let addr = null, yes = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--yes-write-to-this-server') yes = true;
    else if (flags[argv[i]]) {
      const v = Number(argv[++i]);
      if (!Number.isFinite(v) || v < 0) { console.error(`${argv[i - 1]} needs a number\n${USAGE}`); return 2; }
      opts[flags[argv[i - 1]]] = v;
    } else if (!argv[i].startsWith('--') && !addr) addr = argv[i];
    else { console.error(`Unknown option: ${argv[i]}\n${USAGE}`); return 2; }
  }
  if (!addr) { console.error(USAGE); return 2; }
  if (!yes) {
    console.error(`REFUSING TO RUN: this adds ${opts.clients * Math.round(opts.rate * opts.seconds)} real entries to ${normalizeUrl(addr)}, and the log can never be cleaned.\nUse a throwaway server, then add --yes-write-to-this-server.\n\n${USAGE}`);
    return 2;
  }
  try {
    const report = await runLoadTest({ ...opts, url: normalizeUrl(addr), log: console.log });
    console.log(formatReport(report));
    return report.pass ? 0 : 1;
  } catch (e) {
    console.error(`Load test could not run: ${e.message}`);
    return 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
