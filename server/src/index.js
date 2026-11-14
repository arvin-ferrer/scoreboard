import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createScoreboard } from './app.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const port = Number(process.env.PORT) || 3000;
const dbPath = process.env.SCORE_DB || path.join(root, 'data/scores.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sb = createScoreboard({ root, dbPath });
const p = await sb.listen(port);
console.log(`Scoreboard server on port ${p}. ${sb.log.count()} entries replayed from ${dbPath}`);
