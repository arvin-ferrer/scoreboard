# Developer guide

For whoever maintains this next year. Read [Architecture](architecture.md) first for how it fits together, and [Configuration](configuration.md) for everything that is data rather than code.

## Setup

Requirements: Node.js 22 or 24 and npm. Developed in WSL (Node 24.17) and run on Windows (Node 22.23). Both work from the same folder: `better-sqlite3` ships prebuilt binaries for Linux and Windows, so a `node_modules` installed in WSL also runs under Windows Node (verified).

```bash
git clone <repo> && cd get-one-fourth-scoreboard
npm install
npm test        # 14 files, 95 tests, about 25 s on a laptop
npm run build   # client/dist
npm start       # http://localhost:3000
```

Development with hot reload (server on 3000 with `--watch`, Vite on 5173 proxying `/socket.io`, `/api` and `/chamber-assets` to it):

```bash
SCORE_DB=/tmp/dev.sqlite npm run dev
# open http://localhost:5173/  (also /admin, /projector, /history)
```

**Always set `SCORE_DB` to a throwaway file when developing.** Without it, `npm run dev` and `npm start` open the real `data/scores.sqlite`, and every click adds a permanent row. The repository's `data/scores.sqlite` already contains test entries for this reason (see [ANALYSIS](ANALYSIS.md)).

WSL note: a server started inside WSL listens inside the WSL VM. Other laptops on a Windows hotspot cannot reach it. For LAN tests run from Windows (`start-scoreboard.bat` or `npm start` in Command Prompt).

## Repository layout

```text
server/src/
  index.js        entry: env, CLI flags, restore, backups, clean shutdown
  app.js          Express + Socket.IO; all events live here
  scoreLog.js     SQLite schema, addEntry, voidEntry, totals, state kv, backupTo
  gameState.js    round, timer, tie picks, hidden, music, effects, podium
  chambers.js     CSV reader, asset URL resolution
  backup.js       minute backups + standings CSV
  restore.js      --from-backup
  cli.js          flag parser shared with the supervisor
  *.test.js       Vitest, real sockets on 127.0.0.1:0 and temp databases
client/src/
  App.jsx         path → screen
  useScoreboard.js  the one hook: socket, mirror, outbox, totals, admin login
  outbox.js, entries.js, history.js, settings.js   pure helpers (tested)
  scorer/  admin/  projector/  history/            screens and their CSS
  projector/effects/   useFx.js controller, canvas particles, CSS effects, podium
  projector/musicPlayer.js, ProjectorMusic.jsx     crossfading <audio> player
shared/
  scoring.json  settings.json  effects.json
  ranking.js  timer.js  leader.js  effects.js  fxQueue.js   pure, tested in shared/tests
scripts/
  supervisor.js  lan-url.js  load-test.js  scripts.test.js
data/chambers.csv                 chambers
data/scores.sqlite                the log (git-ignored)
client/assets/                    art, fonts, chamber logos and songs
*.bat                             Windows entry points
docs/PLAN.md MECHANICS.md PLAYBOOK.md   intent documents; docs/guide/ is what is true
```

Code style: ES modules, no TypeScript, no linter configured, plain CSS, comments explain intent. Files are small on purpose; most logic that can be pure is pure and lives in `shared/` or next to its screen with a `.test.js`.

## Tests

`npm test` runs Vitest once over `shared/**/*.test.js`, `server/**/*.test.js`, `client/**/*.test.{js,jsx}` and `scripts/**/*.test.js` (`vitest.config.js`). `npx vitest` watches.

What is covered:

| Area | File | Covers |
| --- | --- | --- |
| Log | `server/src/scoreLog.test.js` | sums, negative totals, voids and their rejections, UPDATE/DELETE blocked, duplicate ids, replay after restart, timer resume maths |
| Sync | `server/src/sync.test.js` | two clients, duplicate/rejected inputs, void sync, catch-up, restart, tie picks, PIN gating and lockout, PIN not leaked, hidden/tie persistence, laptops list, music bounds, asset URLs and 404 |
| Effects server side | `server/src/effects.test.js` | effects file in snapshot, admin-only events, persistence, preview routing, podium guard |
| Backup/restore | `server/src/backup.test.js` | CSV quoting/BOM, backup correctness, stamped retention, unusable folder, restore into empty, refuse/force, bad source, CLI flags |
| Chambers | `server/src/chambers.test.js` | existing/missing/outside-folder paths |
| Client helpers | `client/src/entries.test.js`, `history.test.js` | totals with outbox, dedupe, void of unsent, recent, counter, outbox storage |
| Shared | `shared/tests/*.test.js` | ranking, timer, leader tracker, effects engine, fx queue, scoring/chambers shape |
| Scripts | `scripts/scripts.test.js` | LAN URL ordering, supervisor restart/backoff/setup-stop, load test pass and fail detection |

Not covered (checked by hand only): React rendering, `useScoreboard`'s flush loop against a real disconnect, the music player and canvas (browser APIs), the `.bat` files, and the supervisor's banner/health wait.

Test conventions: every server test creates its own temp directory with `fs.mkdtempSync`, starts `createScoreboard({ root, dbPath, adminPin: '4321' })` on port 0, and cleans up in `afterEach`. Never point a test at `data/scores.sqlite`.

### Writing a test

```js
import { describe, it, expect } from 'vitest';
import { openScoreLog } from './scoreLog.js';

describe('my feature', () => {
  it('does the thing', () => {
    const log = openScoreLog();                 // in-memory
    log.addEntry({ id: 'a', chamber: 'c01', points: 5, round: 'adagio' });
    expect(log.totals(['c01']).c01).toBe(5);
  });
});
```

For socket tests copy the `start`/`client`/`ack` helpers at the top of `sync.test.js`.

## Common changes

**Change a point value or a button label**: edit `shared/scoring.json`, restart the server. See [Configuration](configuration.md#scoringjson). Update `shared/tests/skeleton.test.js` if you changed the round list or Adagio's values.

**Add a round**: add a key to `rounds` in `scoring.json`. Everything else (admin button, scorer panel, projector round name, curtains, load test) follows from the file. If the podium should show in a different round, set `effects.podium.round` in `effects.json`.

**Add a chamber**: see [Configuration](configuration.md#chamberscsv).

**Add a setting the screens need**: add the key and default to `DEFAULT_SETTINGS` in `client/src/settings.js`, put the real value in `shared/settings.json`, read it from `settings` in the screen. Server-only keys must also be stripped from `publicSettings` in `app.js:28` if they are secret.

**Add an admin action**: add a `socket.on` via the `on(...)` wrapper in `app.js` (that makes it admin-only), change state in `gameState.js` (remember `save()`), call `broadcastState()`, add a button in `AdminScreen.jsx` that calls `send('your:event', payload)`, and add a test in `sync.test.js` that checks a non-admin is denied.

**Add a projector effect**: make the engine in `shared/effects.js` return a new `{ type }` from `apply()`, handle it in `play()` in `useFx.js`, draw it in `effects.css` or `particles.js`, add its switch to `effects.json`, add a preview id to `PREVIEW_EFFECTS` and a case in `runPreview()`. Test the engine in `shared/tests/effects.test.js`.

## Deploying to the event laptops

1. `npm run build` on a machine with the dev dependencies.
2. Copy the **whole folder**, including `node_modules` and `client/dist`, to the host and the standby. No internet is needed after that. (The supervisor refuses to start if either is missing.)
3. Follow the [Event-day runbook](event-day-runbook.md). Code freeze after the dry run; on event day the only edits should be to the JSON files, and even those need a restart.

## Reusing this next year

1. Rename the event where it shows: `client/index.html` `<title>`, the logo at `client/assets/ui/logo/logo.svg`, `package.json` description, and the alt text in `ProjectorScreen.jsx:55`.
2. Replace the theme art in `client/assets/ui/` and the fonts in `client/src/styles.css`. Rebuild.
3. New rounds and buttons: `shared/scoring.json`. New words for effects: `shared/effects.json`.
4. New chambers: `data/chambers.csv` and `client/assets/chambers/`.
5. Start from an empty log: rename or move `data/scores.sqlite`. There is no reset command, on purpose.
6. New PIN and backup folder: `shared/settings.json`.
7. Run `npm test`, do a two-laptop dry run, run the load test against a throwaway server:

   ```bash
   SCORE_DB=/tmp/loadtest.sqlite npm start
   # another terminal
   npm run load-test -- 127.0.0.1:3000 --yes-write-to-this-server --seconds 60
   ```

   Expected last lines: `LOST entries … 0`, `DUPLICATE entries in the log: 0`, `RESULT: PASS`.

## Known rough edges

See [ANALYSIS.md](ANALYSIS.md) for the full list with evidence. The ones a maintainer meets first:

- `sync:since` is implemented on the server but unused by the browser client.
- The server accepts entries tagged with a `tiebreak` round; only the UI prevents it.
- Several files in `client/assets/ui/` are unused (zips, `structure/*.png`, footer and YSES logos, `music_sheet.png`, `musician_shadow.png`) and `client/assets/chambers/notes.png` is unreferenced.
- The `members` column in `chambers.csv` is read and sent to clients but never displayed.
