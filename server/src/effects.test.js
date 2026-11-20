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

async function start() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-'));
  cleanup.push(async () => fs.rmSync(dir, { recursive: true, force: true }));
  const sb = createScoreboard({ root, dbPath: path.join(dir, 's.sqlite'), adminPin: '4321' });
  const port = await sb.listen(0, '127.0.0.1');
  cleanup.push(() => sb.close());
  return `http://127.0.0.1:${port}`;
}
async function client(url, role) {
  const s = connect(url, { transports: ['websocket'] });
  const snap = await new Promise((r) => s.once('snapshot', r));
  cleanup.push(async () => s.close());
  if (role) { s.emit('hello', { role, device: 'dev-test', unsent: 0 }); await new Promise((r) => setTimeout(r, 50)); }
  return { s, snap };
}
const ack = (s, ev, msg) => new Promise((r) => s.emit(ev, msg, r));
const login = (s) => ack(s, 'admin:login', '4321');

describe('projector effects on the host', () => {
  it('sends the effects file in the snapshot, with the master switch on and Full intensity', async () => {
    const { snap } = await client(await start());
    expect(snap.effects.effects.fortissimo.word).toBe('Fortissimo!');
    expect(snap.state).toMatchObject({ effectsOn: true, effectsIntensity: 'full', podiumRevealed: 0 });
  });

  it('effects:set, effects:preview and podium:set need the admin PIN', async () => {
    const { s } = await client(await start());
    expect((await ack(s, 'effects:set', { on: false })).ok).toBe(false);
    expect((await ack(s, 'effects:preview', { name: 'shake' })).ok).toBe(false);
    expect((await ack(s, 'podium:set', 0)).ok).toBe(false);
  });

  it('on/off and intensity are saved and sent to everyone', async () => {
    const url = await start();
    const a = await client(url), b = await client(url);
    await login(a.s);
    const st = new Promise((r) => b.s.once('state', r));
    await ack(a.s, 'effects:set', { on: false, intensity: 'reduced' });
    expect((await st).state).toMatchObject({ effectsOn: false, effectsIntensity: 'reduced' });
    await ack(a.s, 'effects:set', { intensity: 'loud' }); // junk is ignored
    const c = await client(url);
    expect(c.snap.state).toMatchObject({ effectsOn: false, effectsIntensity: 'reduced' });
  });

  it('a preview reaches only projector screens, and only known effect names', async () => {
    const url = await start();
    const admin = await client(url), proj = await client(url, 'projector'), scorer = await client(url, 'scorer');
    await login(admin.s);
    const got = [], other = [];
    proj.s.on('effects:preview', (m) => got.push(m));
    scorer.s.on('effects:preview', (m) => other.push(m));
    expect((await ack(admin.s, 'effects:preview', { name: 'goldBurst', chamber: 'c02' })).ok).toBe(true);
    expect((await ack(admin.s, 'effects:preview', { name: 'rm -rf' })).ok).toBe(false);
    await new Promise((r) => setTimeout(r, 100));
    expect(got).toEqual([{ name: 'goldBurst', chamber: 'c02' }]);
    expect(other).toEqual([]);
  });

  it('podium: places are 0 to 3, and cannot be revealed while a podium tie is open', async () => {
    const url = await start();
    const a = await client(url);
    await login(a.s);
    expect((await ack(a.s, 'podium:set', 1)).ok).toBe(false); // everyone is tied at 0
    for (const [i, c] of ['c01', 'c02', 'c03', 'c04'].entries()) await ack(a.s, 'entry:add', { id: `p${i}`, chamber: c, points: 40 - i * 10, round: 'allegro' });
    // c05..: still tied at 0 for 5th, which is not a podium place
    expect((await ack(a.s, 'podium:set', 1)).ok).toBe(true);
    expect((await ack(a.s, 'podium:set', 4)).ok).toBe(false);
    expect((await ack(a.s, 'podium:set', 0)).ok).toBe(true);
  });
});
