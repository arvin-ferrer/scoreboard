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
  const sb = createScoreboard({ root, dbPath, adminPin: '4321' });
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
const login = (s, pin = '4321') => ack(s, 'admin:login', pin);
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
    await login(a.s);
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
    await login(a.s);
    for (const [i, c] of ['c01', 'c02'].entries())
      await ack(a.s, 'entry:add', { id: `t${i}`, chamber: c, points: 50, round: 'allegro' });
    const st = await new Promise((r) => { a.s.once('state', r); a.s.emit('tie:pick', 'c02'); });
    expect(st.order.slice(0, 2)).toEqual(['c02', 'c01']);
    expect(st.ties.map((t) => t.place)).toEqual([3]); // the six chambers at 0 are still tied for 3rd
  });

  it('admin events need the PIN; the PIN is never sent to clients', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-'));
    cleanup.push(async () => fs.rmSync(dir, { recursive: true, force: true }));
    const { url } = await start(path.join(dir, 's.sqlite'));
    const a = await client(url);
    expect(JSON.stringify(a.snap)).not.toContain('4321');
    expect((await ack(a.s, 'round:set', 'allegro')).ok).toBe(false);
    expect((await ack(a.s, 'scores:hide', true)).ok).toBe(false);
    expect((await login(a.s, '0000')).ok).toBe(false);
    expect((await ack(a.s, 'round:set', 'allegro')).ok).toBe(false);
    expect((await login(a.s)).ok).toBe(true);
    expect((await ack(a.s, 'round:set', 'allegro')).ok).toBe(true);
  });

  it('five wrong PINs lock logins briefly', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-'));
    cleanup.push(async () => fs.rmSync(dir, { recursive: true, force: true }));
    const { url } = await start(path.join(dir, 's.sqlite'));
    const a = await client(url);
    for (let i = 0; i < 5; i++) await login(a.s, 'nope');
    expect((await login(a.s)).ok).toBe(false); // right PIN, but locked
  });

  it('hidden scores and tie picks persist/undo; connected laptops are listed to admins only', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-'));
    cleanup.push(async () => fs.rmSync(dir, { recursive: true, force: true }));
    const file = path.join(dir, 's.sqlite');
    const first = await start(file);
    const admin = await client(first.url), scorer = await client(first.url);
    const lists = [];
    admin.s.on('laptops', (l) => lists.push(l));
    scorer.s.emit('hello', { role: 'scorer', device: 'dev-ab12', unsent: 2 });
    await login(admin.s);
    await new Promise((r) => setTimeout(r, 100));
    expect(lists.at(-1).map((l) => [l.label, l.unsent])).toEqual([['Scorer AB12', 2]]);
    const scorerSaw = [];
    scorer.s.on('laptops', (l) => scorerSaw.push(l));
    scorer.s.emit('hello', { role: 'scorer', device: 'dev-ab12', unsent: 0 });
    await new Promise((r) => setTimeout(r, 100));
    expect(scorerSaw).toEqual([]);
    scorer.s.close();
    await new Promise((r) => setTimeout(r, 100));
    expect(lists.at(-1)).toEqual([]);

    expect((await ack(admin.s, 'scores:hide', true)).ok).toBe(true);
    for (const [i, c] of ['c01', 'c02', 'c03'].entries())
      await ack(admin.s, 'entry:add', { id: `h${i}`, chamber: c, points: 50, round: 'allegro' });
    await ack(admin.s, 'tie:pick', 'c02');
    await ack(admin.s, 'tie:pick', 'c01');
    const st = await new Promise((r) => { admin.s.once('state', r); admin.s.emit('tie:undo'); });
    expect(st.order.slice(0, 3)).toEqual(['c02', 'c01', 'c03']);
    expect(st.state.tieOrder).toEqual(['c02']);

    admin.s.close();
    await first.sb.close();
    cleanup.pop();
    const second = await start(file);
    const c = await client(second.url);
    expect(c.snap.state.scoresHidden).toBe(true);
    expect(c.snap.state.tieOrder).toEqual(['c02']);
  });
  it('music volume and mute are admin only, kept between 0 and 1, and survive a restart', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-'));
    cleanup.push(async () => fs.rmSync(dir, { recursive: true, force: true }));
    const file = path.join(dir, 's.sqlite');
    const first = await start(file);
    const admin = await client(first.url), other = await client(first.url);
    expect(admin.snap.state.musicVolume).toBe(0.7);
    expect(admin.snap.state.musicMuted).toBe(false);

    expect((await ack(other.s, 'music:set', { volume: 0.1 })).denied).toBe(true);
    await login(admin.s);
    const seen = nextState(other.s);
    await ack(admin.s, 'music:set', { volume: 3 });
    expect((await seen).state.musicVolume).toBe(1);
    await ack(admin.s, 'music:set', { volume: 0.4, muted: true });
    await ack(admin.s, 'music:set', { volume: 'loud' }); // junk is ignored
    await ack(admin.s, 'music:set', null);

    admin.s.close();
    await first.sb.close();
    cleanup.pop();
    const second = await start(file);
    const c = await client(second.url);
    expect(c.snap.state.musicVolume).toBe(0.4);
    expect(c.snap.state.musicMuted).toBe(true);
  });

  it('chambers carry logo and song URLs, or null while the files are missing', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-'));
    cleanup.push(async () => fs.rmSync(dir, { recursive: true, force: true }));
    const { url } = await start(path.join(dir, 's.sqlite'));
    const { snap } = await client(url);
    expect(snap.chambers).toHaveLength(15);
    for (const c of snap.chambers) expect(c).toHaveProperty('songUrl');
    // Files that exist get a URL the server really serves; a missing one is a 404, not the app page.
    const miss = await fetch(`${url}/chamber-assets/c99/song.mp3`);
    expect(miss.status).toBe(404);
  });
});
