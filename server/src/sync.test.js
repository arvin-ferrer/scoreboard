import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { io as connect } from 'socket.io-client';
import { createScoreboard } from './app.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const cleanup = [];
afterEach(async () => { while (cleanup.length) await cleanup.pop()(); });

async function start(dbPath) {
  const sb = createScoreboard({ root, dbPath });
  const port = await sb.listen(0, '127.0.0.1');
  cleanup.push(() => sb.close());
  return { sb, url: `http://127.0.0.1:${port}` };
}
async function client(url) {
  const s = connect(url, { transports: ['websocket'] });
  const snap = await new Promise((r) => s.once('snapshot', r));
  cleanup.push(async () => s.close());
  return { s, snap };
}
const ack = (s, ev, msg) => new Promise((r) => s.emit(ev, msg, r));
const nextState = (s) => new Promise((r) => s.once('state', r));

describe('socket sync', () => {
  it('two clients see the same totals, duplicates and bad input are ignored, undo syncs', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-'));
    cleanup.push(async () => fs.rmSync(dir, { recursive: true, force: true }));
    const { url } = await start(path.join(dir, 's.sqlite'));
    const a = await client(url), b = await client(url);

    const seen = nextState(b.s);
    const e = { id: 'x1', chamber: 'c01', points: 20, round: 'adagio', label: 'test', device: 'A' };
    expect((await ack(a.s, 'entry:add', e)).status).toBe('added');
    expect((await seen).totals.c01).toBe(20);

    expect((await ack(a.s, 'entry:add', e)).status).toBe('duplicate');
    expect((await ack(b.s, 'entry:add', { ...e, id: 'x2', chamber: 'nope' })).status).toBe('rejected');
    expect((await ack(b.s, 'entry:add', { ...e, id: 'x3', points: 1.5 })).status).toBe('rejected');

    const seen2 = nextState(a.s);
    expect((await ack(b.s, 'entry:void', { id: 'v1', voids: 'x1' })).status).toBe('added');
    expect((await seen2).totals.c01).toBe(0);

    const late = await client(url);
    expect(late.snap.totals.c01).toBe(0);
    expect(late.snap.entries).toHaveLength(2);
    const missed = await ack(late.s, 'sync:since', 1);
    expect(missed.entries.map((x) => x.id)).toEqual(['v1']);
  });

  it('round change reaches other clients and totals survive a host restart', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-'));
    cleanup.push(async () => fs.rmSync(dir, { recursive: true, force: true }));
    const file = path.join(dir, 's.sqlite');
    const first = await start(file);
    const a = await client(first.url), b = await client(first.url);
    const seen = nextState(b.s);
    await ack(a.s, 'round:set', 'allegro');
    expect((await seen).state.round).toBe('allegro');
    await ack(a.s, 'entry:add', { id: 'y1', chamber: 'c02', points: 60, round: 'allegro' });
    a.s.close(); b.s.close();
    await first.sb.close();
    cleanup.pop(); // already closed

    const second = await start(file);
    const c = await client(second.url);
    expect(c.snap.totals.c02).toBe(60);
    expect(c.snap.state.round).toBe('allegro');
  });

  it('vivace: tied chambers are listed and picking winners resolves places', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-'));
    cleanup.push(async () => fs.rmSync(dir, { recursive: true, force: true }));
    const { url } = await start(path.join(dir, 's.sqlite'));
    const a = await client(url);
    for (const [i, c] of ['c01', 'c02'].entries())
      await ack(a.s, 'entry:add', { id: `t${i}`, chamber: c, points: 50, round: 'allegro' });
    const st = await new Promise((r) => { a.s.once('state', r); a.s.emit('tie:pick', 'c02'); });
    expect(st.order.slice(0, 2)).toEqual(['c02', 'c01']);
    expect(st.ties.map((t) => t.place)).toEqual([3]); // the six chambers at 0 are still tied for 3rd
  });
});
