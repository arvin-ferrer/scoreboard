import express from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { Server } from 'socket.io';
import { openScoreLog } from './scoreLog.js';
import { createGameState } from './gameState.js';
import { loadChambers, saveChambers, validName, withAssetUrls, CHAMBER_ASSET_DIR } from './chambers.js';
import { rank } from '../../shared/ranking.js';
import { PREVIEW_IDS } from '../../shared/effects.js';

// Builds the whole server. Tests call this with a temp db path and port 0.
export function createScoreboard({ root, dbPath, clock = Date.now, adminPin, chambersFile = path.join(root, 'data/chambers.csv') }) {
  const chambers = loadChambers(chambersFile);
  const chamberIds = chambers.map((c) => c.id);
  const chamberList = () => withAssetUrls(root, chambers);
  const scoring = JSON.parse(fs.readFileSync(path.join(root, 'shared/scoring.json'), 'utf8'));
  const roundIds = Object.keys(scoring.rounds);
  const settingsFile = path.join(root, 'shared/settings.json');
  const settings = fs.existsSync(settingsFile) ? JSON.parse(fs.readFileSync(settingsFile, 'utf8')) : {};

  // Effect thresholds, words and switches. Read once at start, like the settings.
  const effectsFile = path.join(root, 'shared/effects.json');
  const effects = fs.existsSync(effectsFile) ? JSON.parse(fs.readFileSync(effectsFile, 'utf8')) : {};

  // The PIN never leaves the server: it is checked here and stripped from the settings sent to clients.
  const pin = String(adminPin ?? process.env.ADMIN_PIN ?? settings.adminPin ?? '');
  const { adminPin: _hidden, backupDir: _backupDir, backupKeep: _backupKeep, ...publicSettings } = settings;

  const log = openScoreLog(dbPath, clock);
  const game = createGameState(log, roundIds, clock, chamberIds);

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);

  // Logos and songs are read from disk on every request, so adding a file needs no rebuild.
  app.use('/chamber-assets', express.static(path.join(root, CHAMBER_ASSET_DIR)));
  app.use('/chamber-assets', (_req, res) => res.sendStatus(404));

  const dist = path.join(root, 'client/dist');
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.use((_req, res) => res.sendFile(path.join(dist, 'index.html')));
  } else {
    app.get('/', (_req, res) => res.send('Client not built yet. Run: npm run build'));
  }

  const totals = () => log.totals(chamberIds);
  const standings = () => rank(chamberIds, totals(), game.get().tieOrder);
  const snapshot = () => ({
    chambers: chamberList(), scoring, settings: publicSettings, effects, totals: totals(), entries: log.entriesSince(0), state: game.get(), ...standings(),
  });
  // After any score or state change, every client gets fresh totals, standings and state.
  const broadcastState = () =>
    io.emit('state', { totals: totals(), state: game.get(), ...standings() });

  const ROLES = ['scorer', 'admin', 'projector', 'history'];
  const laptops = new Map();
  const laptopList = () => [...laptops.values()];
  const sendLaptops = () => io.to('admins').emit('laptops', laptopList());
  let fails = 0, lockedUntil = 0;

  const isId = (v) => typeof v === 'string' && v.length > 0 && v.length <= 100;

  io.on('connection', (socket) => {
    socket.emit('snapshot', snapshot());
    const reply = (ack, payload) => typeof ack === 'function' && ack(payload);

    socket.on('entry:add', (msg, ack) => {
      const m = msg ?? {};
      if (!isId(m.id) || !chamberIds.includes(m.chamber) || !Number.isInteger(m.points) || m.points === 0 || !roundIds.includes(m.round))
        return reply(ack, { status: 'rejected' });
      const res = log.addEntry(m);
      if (res.status === 'added') { io.emit('entry', res.entry); broadcastState(); }
      reply(ack, { status: res.status });
    });

    socket.on('entry:void', (msg, ack) => {
      const m = msg ?? {};
      if (!isId(m.id) || !isId(m.voids)) return reply(ack, { status: 'rejected' });
      const res = log.voidEntry(m);
      if (res.status === 'added') { io.emit('entry', res.entry); broadcastState(); }
      reply(ack, { status: res.status });
    });

    // Reconnect catch-up: everything after the last seq this client saw.
    socket.on('sync:since', (seq, ack) => reply(ack, { entries: log.entriesSince(Number(seq) || 0), totals: totals() }));

    // Connected laptops. Each client says who it is; admins get the list.
    socket.on('hello', (msg) => {
      const m = msg ?? {};
      const role = ROLES.includes(m.role) ? m.role : 'scorer';
      const tag = typeof m.device === 'string' ? m.device.replace(/^dev-/, '').slice(0, 6).toUpperCase() : '';
      const prev = laptops.get(socket.id);
      if (role === 'projector') socket.join('projectors');
      laptops.set(socket.id, {
        id: socket.id, role, label: `${role[0].toUpperCase()}${role.slice(1)} ${tag}`.trim(),
        since: prev?.since ?? clock(), unsent: Number.isInteger(m.unsent) ? m.unsent : 0,
      });
      sendLaptops();
    });
    socket.on('disconnect', () => { if (laptops.delete(socket.id)) sendLaptops(); });

    // Admin login. Five wrong PINs in a row lock logins for 10 seconds.
    socket.on('admin:login', (given, ack) => {
      if (clock() < lockedUntil) return reply(ack, { ok: false, locked: true });
      const ok = pin !== '' && typeof given === 'string' && given === pin;
      if (!ok) { if (++fails >= 5) { lockedUntil = clock() + 10_000; fails = 0; } return reply(ack, { ok: false }); }
      fails = 0;
      socket.data.admin = true;
      socket.join('admins');
      socket.emit('laptops', laptopList());
      reply(ack, { ok: true });
    });

    // Everything below changes shared state, so only a logged-in admin may use it.
    const adminOnly = (fn) => (...args) => {
      if (socket.data.admin) return fn(...args);
      const last = args[args.length - 1];
      reply(last, { ok: false, denied: true });
    };
    const on = (event, fn) => socket.on(event, adminOnly(fn));

    on('round:set', (round, ack) => { const ok = game.setRound(round); if (ok) broadcastState(); reply(ack, { ok }); });
    on('timer:start', (sec) => { game.startTimer(Number(sec)); broadcastState(); });
    on('timer:pause', () => { game.pauseTimer(); broadcastState(); });
    on('timer:reset', (sec) => { game.resetTimer(Number(sec)); broadcastState(); });
    // Music volume (0 to 1) and mute. The projector plays the music; the admin only sets these.
    on('music:set', (m, ack) => { game.setMusic(m); broadcastState(); reply(ack, { ok: true }); });
    on('scores:hide', (hidden, ack) => { game.setHidden(hidden === true); broadcastState(); reply(ack, { ok: true }); });
    // Projector effects: master switch, Full/Reduced, and the test buttons.
    on('effects:set', (m, ack) => { game.setEffects(m); broadcastState(); reply(ack, { ok: true }); });
    // A preview only goes to projector screens. It changes nothing stored.
    on('effects:preview', (m, ack) => {
      const name = m?.name;
      const chamber = chamberIds.includes(m?.chamber) ? m.chamber : chamberIds[0];
      const ok = PREVIEW_IDS.includes(name);
      if (ok) io.to('projectors').emit('effects:preview', { name, chamber });
      reply(ack, { ok });
    });
    // Awarding: how many podium places are shown. Needs every podium tie settled, so the wrong chamber is never revealed.
    on('podium:set', (n, ack) => {
      const open = standings().ties.length > 0;
      const ok = !(open && n > game.get().podiumRevealed) && game.setPodium(n);
      if (ok) broadcastState();
      reply(ack, { ok });
    });
    // Vivace: proctors click which tied chamber won the open place.
    on('tie:pick', (chamberId, ack) => {
      const open = standings().ties.some((t) => t.chambers.includes(chamberId));
      if (open) { game.pickTieWinner(chamberId); broadcastState(); }
      reply(ack, { ok: open });
    });
    on('tie:undo', () => { game.undoTiePick(); broadcastState(); });
    // Andante: "defending against" shown on the projector. Display only; nothing is scored from it.
    on('defense:set', (m, ack) => { const ok = game.setDefense(m?.defender, m?.attackers); if (ok) broadcastState(); reply(ack, { ok }); });
    on('defense:clear', () => { game.clearDefense(); broadcastState(); });
    // Rename a chamber. Scores are stored by id, so a rename never touches the score log.
    on('chamber:rename', (m, ack) => {
      const c = chambers.find((x) => x.id === m?.id);
      if (!c || !validName(m?.name)) return reply(ack, { ok: false });
      const before = c.name;
      c.name = m.name.trim();
      try { saveChambers(chambersFile, chambers); } catch (e) { c.name = before; console.error(`chamber rename not saved: ${e.message}`); return reply(ack, { ok: false }); }
      io.emit('chambers', chamberList());
      reply(ack, { ok: true });
    });
    on('tie:clear', () => { game.clearTieOrder(); broadcastState(); });
  });

  return {
    app, server, io, log, game, chamberList, totals, standings,
    listen: (port, host = '0.0.0.0') => new Promise((r) => server.listen(port, host, () => r(server.address().port))),
    close: () => new Promise((r) => { io.close(() => { log.close(); r(); }); }),
  };
}
