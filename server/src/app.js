import express from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { Server } from 'socket.io';
import { openScoreLog } from './scoreLog.js';
import { createGameState } from './gameState.js';
import { loadChambers } from './chambers.js';
import { rank } from '../../shared/ranking.js';

// Builds the whole server. Tests call this with a temp db path and port 0.
export function createScoreboard({ root, dbPath, clock = Date.now }) {
  const chambers = loadChambers(path.join(root, 'data/chambers.csv'));
  const chamberIds = chambers.map((c) => c.id);
  const scoring = JSON.parse(fs.readFileSync(path.join(root, 'shared/scoring.json'), 'utf8'));
  const roundIds = Object.keys(scoring.rounds);
  const settingsFile = path.join(root, 'shared/settings.json');
  const settings = fs.existsSync(settingsFile) ? JSON.parse(fs.readFileSync(settingsFile, 'utf8')) : {};

  const log = openScoreLog(dbPath, clock);
  const game = createGameState(log, roundIds, clock);

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);

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
    chambers, scoring, settings, totals: totals(), entries: log.entriesSince(0), state: game.get(), ...standings(),
  });
  // After any score or state change, every client gets fresh totals, standings and state.
  const broadcastState = () =>
    io.emit('state', { totals: totals(), state: game.get(), ...standings() });

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

    socket.on('round:set', (round, ack) => { const ok = game.setRound(round); if (ok) broadcastState(); reply(ack, { ok }); });
    socket.on('timer:start', (sec) => { game.startTimer(Number(sec)); broadcastState(); });
    socket.on('timer:pause', () => { game.pauseTimer(); broadcastState(); });
    socket.on('timer:reset', (sec) => { game.resetTimer(Number(sec)); broadcastState(); });
    // Vivace: proctors click which tied chamber won the open place.
    socket.on('tie:pick', (chamberId, ack) => {
      const open = standings().ties.some((t) => t.chambers.includes(chamberId));
      if (open) { game.pickTieWinner(chamberId); broadcastState(); }
      reply(ack, { ok: open });
    });
    socket.on('tie:clear', () => { game.clearTieOrder(); broadcastState(); });
  });

  return {
    app, server, io, log, game,
    listen: (port, host = '0.0.0.0') => new Promise((r) => server.listen(port, host, () => r(server.address().port))),
    close: () => new Promise((r) => { io.close(() => { log.close(); r(); }); }),
  };
}
