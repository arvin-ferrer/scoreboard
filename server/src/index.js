import express from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dist = path.join(root, 'client/dist');
const port = Number(process.env.PORT) || 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.use((_req, res) => res.sendFile(path.join(dist, 'index.html')));
} else {
  app.get('/', (_req, res) => res.send('Client not built yet. Run: npm run build'));
}

io.on('connection', (socket) => {
  console.log(`client connected: ${socket.id}`);
});

server.listen(port, '0.0.0.0', () => console.log(`Scoreboard server on port ${port}`));
