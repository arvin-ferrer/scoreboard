import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import http from 'node:http';
import { lanUrls } from './lan-url.js';
import { runSupervisor } from './supervisor.js';
import { runLoadTest, formatReport, percentile, normalizeUrl } from './load-test.js';
import { createScoreboard } from '../server/src/app.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('lanUrls', () => {
  it('prefers the hotspot network, skips loopback and link-local', () => {
    const v4 = (address, internal = false) => ({ family: 'IPv4', address, internal });
    const urls = lanUrls(3000, {
      Ethernet: [v4('10.0.0.5'), { family: 'IPv6', address: 'fe80::1', internal: false }],
      Loopback: [v4('127.0.0.1', true)],
      Hotspot: [v4('192.168.137.10')],
      Auto: [v4('169.254.1.1')],
    });
    expect(urls.map((u) => u.url)).toEqual(['http://192.168.137.10:3000', 'http://10.0.0.5:3000']);
  });
});

describe('supervisor', () => {
  const run = async (codes, opts = {}) => {
    const sleeps = [], firsts = [], logs = [];
    let t = 0;
    const left = [...codes];
    let stopping = false;
    const code = await runSupervisor({
      spawnChild: async ({ first }) => { firsts.push(first); const c = left.shift(); if (!left.length) stopping = true; return c; },
      sleep: async (ms) => { sleeps.push(ms); t += ms + (opts.runMs ?? 0); },
      now: () => t, log: (m) => logs.push(m), isStopping: () => stopping,
    });
    return { code, sleeps, firsts, logs };
  };

  it('restarts after a crash, and only the first start is "first"', async () => {
    const r = await run([1, 1, 0]);
    expect(r.firsts).toEqual([true, false, false]);
  });
  it('waits 2 s, then 10 s once it crashes 5 times in 30 s', async () => {
    const r = await run([1, 1, 1, 1, 1, 1, 0]);
    expect(r.sleeps.slice(0, 4)).toEqual([2000, 2000, 2000, 2000]);
    expect(r.sleeps[4]).toBe(10_000);
  });
  it('does not slow down when crashes are far apart', async () => {
    const r = await run([1, 1, 1, 1, 1, 1, 0], { runMs: 20_000 });
    expect(new Set(r.sleeps)).toEqual(new Set([2000]));
  });
  it('stops (no restart) on a setup error', async () => {
    const r = await run([2, 1, 1]);
    expect(r.code).toBe(2);
    expect(r.firsts).toEqual([true]);
  });
});

describe('load test', () => {
  it('helpers', () => {
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 95)).toBe(10);
    expect(percentile([], 50)).toBeNull();
    expect(normalizeUrl('192.168.137.10:3000/')).toBe('http://192.168.137.10:3000');
  });

  it('against a real server: nothing lost, re-sends not double counted', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lt-'));
    const sb = createScoreboard({ root, dbPath: path.join(dir, 's.sqlite') });
    const port = await sb.listen(0, '127.0.0.1');
    try {
      const r = await runLoadTest({ url: `http://127.0.0.1:${port}`, clients: 3, rate: 10, seconds: 2, dupEvery: 5 });
      expect(r.entriesSent).toBe(60);
      expect(r.resendsSent).toBe(12);
      expect(r.lost).toBe(0);
      expect(r.duplicatesInLog).toBe(0);
      expect(r.resendsWronglyCounted).toBe(0);
      expect(r.sumChecked && r.sumOk).toBe(true);
      expect(r.pass).toBe(true);
      expect(sb.log.count()).toBe(60);
      expect(formatReport(r)).toContain('RESULT: PASS');
    } finally {
      await sb.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it('reports lost entries when a server acks but drops them', async () => {
    const server = http.createServer();
    const io = new Server(server);
    const stored = [];
    let n = 0;
    io.on('connection', (s) => {
      s.emit('snapshot', { chambers: [{ id: 'c01' }], scoring: { rounds: { r: { groups: [{ values: [10] }] } } }, entries: [], totals: { c01: 0 } });
      s.on('entry:add', (e, ack) => { if (++n % 5 !== 0) stored.push({ ...e, seq: stored.length + 1 }); ack({ status: 'added' }); });
      s.on('sync:since', (_seq, ack) => ack({ entries: stored, totals: { c01: stored.length * 10 } }));
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    try {
      const r = await runLoadTest({ url: `http://127.0.0.1:${server.address().port}`, clients: 2, rate: 10, seconds: 1, dupEvery: 0 });
      expect(r.entriesSent).toBe(20);
      expect(r.lost).toBe(4);
      expect(r.pass).toBe(false);
      expect(formatReport(r)).toContain('RESULT: FAIL');
    } finally {
      io.close();
    }
  }, 30_000);
});
