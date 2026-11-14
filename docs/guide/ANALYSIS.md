# Analysis report

Written 2026-11-14 against the working tree of branch `project-skeleton` (HEAD `f09646f` plus 49 uncommitted changed or new files). The code, not the plan documents, was treated as the source of truth.

## Summary

The project is a complete offline LAN scoreboard. Every feature in `docs/PLAN.md` steps 0 to 5 exists in code: append-only SQLite log with client-made ids, void-based undo, totals rebuilt by replay, Socket.IO sync with full snapshot on connect, an offline outbox that resends, four themed screens, admin PIN, host-time timers, tie picks, hidden scores, podium reveal, chamber music logic, projector effects, minute backups with a standings CSV, restore-from-backup, a crash-restarting Windows start script, a firewall script and a load test. Nothing loads from the internet. 95 automated tests pass. Restart recovery, restore and an 8-bot load test were exercised here and behaved as designed.

**Is it ready for event day?** The software is. The deployment is not yet:

1. `data/scores.sqlite` holds test entries and tie picks and would be the opening board.
2. No backup folder is configured, so a host failure today would lose every score.
3. The admin PIN is the committed placeholder.
4. No chamber has a song file, so the music feature is silent.
5. The last two build steps exist only as uncommitted files.

All five are fixes of minutes, not code changes. They are in the [runbook](event-day-runbook.md) "day before" list.

## Planned versus built

From `docs/PLAN.md`.

| Plan item | Status | Notes |
| --- | --- | --- |
| Two-tap scoring, round-specific buttons from `scoring.json` | Built | `client/src/scorer/`, values only from the file |
| Custom +/− pad, undo toast, last few entries per card | Built | 6 s toast, 3 entries, both from settings |
| Projector updates within 1 s | Built | Load test broadcast latency p99 64 ms on one machine |
| Offline banner, keep unsent, resend on reconnect, no double count | Built | `outbox.js`, `useScoreboard.js:66-77`; host dedupes by id |
| "Reconnecting laptop asks for everything after the last entry it saw" | Built differently | Client takes a full snapshot instead (`useScoreboard.js:41-48`). `sync:since` exists (`app.js:89`) but only the load test calls it. |
| Host restart brings back every score and state | Built | Verified by running |
| Undo adds a void; log never edited | Built | Triggers block UPDATE/DELETE (`scoreLog.js:20-23`) |
| Undo "from the toast, the card, or the history" | Partial | Toast and card: yes. History screen (`/history`) is read-only; undo of any entry is on the admin screen's **All entries** table (`HistoryScreen.jsx:4`, `AdminScreen.jsx:165`). |
| Admin: rounds, timers, undo, hide/reveal, tie order, music, connected laptops, **export**, PIN | Partial | All present except an export button. The "export" is the standings CSV written to the backup folder every minute (`backup.js`). |
| Projector: themed leaderboard, animated rank changes, round name, big timer | Built | `ProjectorScreen.jsx`, `projector.css` |
| History with chamber filter | Built | `HistoryTable.jsx` |
| Theme with the event art, bundled fonts | Built | Fonts, wall, wood, frames, curtains, logo used; some assets unused (see Minor) |
| Chamber music: leader's song, 2 s crossfade, 10 s hold, tie keeps song, Enable sound, volume/mute, stop while hidden, preload | Built, no content | Logic complete and tested (`shared/leader.js`, `musicPlayer.js`). **Zero `song.mp3` files exist**, so nothing plays. |
| Projector effects, all listed triggers, one queue, Full/Reduced, preview panel, hidden-scores guard | Built | `shared/effects.js`, `useFx.js`, `effects.json` |
| Awarding podium 3rd/2nd/1st on admin click, confetti | Built | `Podium.jsx`, `podium:set` |
| Backup of log + standings CSV every minute to a chosen folder | Built | `backup.js`; folder from settings/env/flag |
| Standby loads the backup and takes over | Built | `restore.js`, `restore-from-backup.bat`; verified by running |
| Double-click start script that restarts on crash and prints the URL | Built | `start-scoreboard.bat` → `scripts/supervisor.js`; verified from WSL and the server start verified under Windows Node |
| Load test: 8 bots, 2/s, 5 min, lost/dup/latency | Built | `scripts/load-test.js`, refuses without `--yes-write-to-this-server` |
| Automated tests for sums, voids, duplicate ids, replay | Built | plus sync, backup, restore, effects, scripts |
| Firewall allowance | Built | `allow-firewall.bat`, TCP 3000, all profiles |
| Static IP, hotspot settings, bookmarks | Operations, not code | Documented in the runbook with `TODO: verify` on the Windows steps |
| Open items: event date, which laptop hosts, chamber logos and songs, final chamber names | Open | Logos present for c01-c15; songs absent; names are still "Chamber 1" to "Chamber 15" |

## Findings

### Critical (could lose scores or stop the event)

**C1. The real score log already contains test data.**
Evidence: a read-only copy of `data/scores.sqlite` holds 11 entries across c03 and c08 (totals 38 and 90) from two devices, and a saved game state with round `andante`, a 60 s timer and tie picks `c04, c08, c13`.
Impact: starting the server as-is puts those scores and picks on the board. The log cannot be edited, so they cannot be removed later, only voided one by one.
Fix: before the event, with the server stopped, rename `data\scores.sqlite` aside on the host and the standby (runbook step). Consider having `npm run dev` refuse to open the default path, or default `SCORE_DB` to a dev file when `--watch` is used.

**C2. No backup folder is configured.**
Evidence: `shared/settings.json` has `"backupDir": ""`; `server/src/index.js:51-53` logs a WARNING and runs with no backups.
Impact: if the host dies, the standby has nothing to restore. Every score is lost.
Fix: set `backupDir` to the USB drive on both laptops before the dry run and confirm the files appear. Optionally make the supervisor refuse to start without a backup folder unless `--no-backup` is passed.

**C3. The last two build steps are not committed.**
Evidence: `git status` lists 49 modified or untracked files, including all of `server/src/backup.js`, `restore.js`, `cli.js`, `scripts/`, the `.bat` files, the effects and music code and `client/assets/chambers/`. HEAD is `f09646f Add admin, projector and history screens`.
Impact: a bad `git checkout`, a sync-folder conflict (the repo lives in a SyncFolder) or a laptop swap could silently revert to a version without backups or the start script.
Fix: commit now; tag the dry-run build.

**C4. Up to one minute of scores is lost in a host-death failover.**
Evidence: backups run every 60 s (`backup.js:99`). Entries acknowledged after the last backup exist only in the dead host's `data/scores.sqlite`.
Impact: on failover, scorers' outboxes re-send only what was never acknowledged, so acknowledged-but-unbacked-up entries must be re-entered from paper.
Fix (operations): documented in troubleshooting. Fix (code, optional): a shorter interval (the backup is cheap), or SQLite WAL on the USB path. This is by design and acceptable if the committee knows.

### Important

**I1. Admin PIN is a committed, well-known placeholder.**
Evidence: `shared/settings.json:3` sets `adminPin` to a 4-digit placeholder; the file is tracked in git. The value is deliberately not repeated here or in the guides.
Impact: any participant who has seen the repo can switch rounds, hide scores or undo entries.
Fix: change it before the event; or set `ADMIN_PIN` in the environment of the start script; consider removing the real value from git.

**I2. No chamber songs.**
Evidence: `client/assets/chambers/c*/` contain only `logo.png`; the server prints `Missing chamber files … c01 song, … c15 song`.
Impact: the "plays the leading chamber's song" feature does nothing. Not a scoring risk.
Fix: add `song.mp3` per chamber (reload the projector; no restart), or drop the music from the show plan.

**I3. The server accepts entries tagged with a no-scoring round.**
Evidence: `app.js:73` checks `roundIds.includes(m.round)` where `roundIds` includes `vivace` and `awarding`. Verified by sending an entry with `round: "vivace"`: `{"status":"added"}`.
Impact: the scorer UI hides the buttons, so this needs a crafted client. The load test correctly skips tiebreak rounds. Low practical risk; it contradicts the `tiebreak: true` intent.
Fix: reject rounds whose definition has `tiebreak` or an empty `groups` list.

**I4. A second server on the same port causes a restart loop, not a clear stop.**
Evidence: `listen EADDRINUSE` is an unhandled error (exit code 1), so `supervisor.js` restarts every 2 s, then every 10 s after 5 stops, printing a hint about another window.
Impact: a confusing window on event day if someone double-clicks the start script twice. Scores are unaffected.
Fix: catch `EADDRINUSE` in `index.js` and exit with code 2 (setup error) with a plain message.

**I5. PIN lockout is global.**
Evidence: `fails` and `lockedUntil` are shared across all sockets (`app.js:63, 107-111`).
Impact: anyone can lock the admin out in 10-second bursts by sending wrong PINs. Nuisance only on a closed hotspot.
Fix: lock per socket or per IP, or ignore.

**I6. Timer preset buttons stop a running timer.**
Evidence: each preset sends `timer:reset` (`AdminScreen.jsx:76`), which clears `startedAt` (`gameState.js:44-50`).
Impact: a mis-tap mid-round resets the countdown with no confirmation.
Fix: disable presets while running, or confirm. Documented as a warning in the admin guide.

**I7. Effects preview "Podium reveal" is only UI-guarded.**
Evidence: the admin button is disabled while scores are hidden (`AdminScreen.jsx:243`), but `app.js:136-142` accepts the preview regardless. The projector's `runPreview('podium')` shows the real top three.
Impact: a stale admin tab or crafted client could leak the ranking during a hidden-scores segment.
Fix: refuse `name === 'podium'` on the server while `scoresHidden`.

**I8. Running the app from WSL is a trap for the host.**
Evidence: the README warned about it; the supervisor's banner in WSL printed `http://192.168.254.107:3113`, a WSL-only address.
Impact: a server started in WSL is unreachable from hotspot laptops; it looks healthy on the host.
Fix: documented. Verified that Windows Node starts the server from the same folder, so no reinstall is needed.

**I9. Scorer screen never shows its own device code.**
Evidence: the code appears only in the admin's **Connected laptops** and the **Device** column of the entry tables (`app.js:95`, `HistoryTable.jsx:36`).
Impact: when an admin sees "Scorer 9WWQ has 3 unsent", nobody can tell which physical laptop that is without checking each one.
Fix: show the code in the scorer top bar, or let the organisers write each laptop's code on a sticker during the one-hour-before check.

### Minor

**M1. `sync:since` is dead code for the browser client.** `app.js:89` vs `useScoreboard.js:41` (snapshot on every connect). Keep for the load test or remove.

**M2. Plan/code mismatches in the plan documents** (listed below under "Where the plan and the code disagree").

**M3. Unused assets.** `client/assets/ui/fonts/*.zip`, `ui/structure/*.png` (the `optimized/` copies are used), `ui/footer/Placeholder_Footer.png`, `ui/yses/*`, `ui/optimized/music_sheet.png`, `ui/optimized/musician_shadow.png`, `chambers/notes.png`. Harmless; they are not bundled unless imported.

**M4. `members` column is read and sent to every client but never shown** (`chambers.js:19`, snapshot). Harmless.

**M5. `_note` keys in `settings.json` and `scoring.json` are sent to clients.** Harmless.

**M6. `backupDir` relative paths resolve from the repo root** (`index.js:47`), which may surprise someone typing `scoreboard-backup`. Documented.

**M7. Double-clicking `start-scoreboard.bat` cannot pass `--backup-dir`** although the old README showed that form. Documented: use `settings.json` or a Command Prompt.

**M8. Backup CSV `as_of` is UTC ISO while file names are local time.** Cosmetic.

**M9. Vite dev server binds all interfaces (`host: true`)** in `client/vite.config.js:15`. Dev only.

**M10. `client/dist` is checked into the working folder but git-ignored.** Fine for the folder-copy deployment; a fresh clone needs `npm run build`.

**M11. No leftovers from the rules-engine design were found.** No TODO/FIXME in source (the only hit is inside `package-lock.json`). `scoring.json` holds only button values. No question pool, Treble or power-up code exists.

**M12. Test gaps.** No tests for React components, for `useScoreboard`'s flush loop against a real socket drop, for the music player or canvas, for the `.bat` files, or for the supervisor's health wait and banner. The pure parts of each are tested.

## Where the plan documents and the code disagree

| Document says | Code does | Where |
| --- | --- | --- |
| PLAN: a reconnecting laptop asks for everything after the last entry it saw | Full snapshot on every connect; `sync:since` unused by the client | `useScoreboard.js:41`, `app.js:68, 89` |
| PLAN: undo from the toast, the card, or the history | History screen is read-only; undo of any entry is on the admin screen | `HistoryScreen.jsx:4` |
| PLAN: admin has "export" | No export control; the standings CSV is written to the backup folder every minute | `backup.js` |
| PLAN: Round table lists Adagio, Andante, Allegro, Awarding | `scoring.json` also has `vivace` with `tiebreak: true`; the admin shows five round buttons | `shared/scoring.json:27` |
| PLAN: start script "restarts it" | Also: refuses to restart on exit code 2 (setup error), slows to 10 s after 5 crashes in 30 s | `supervisor.js:26-37` |
| PLAN: "Flames, spotlight and confetti are drawn in code until art is added" | Still drawn in code; notes use `note.svg` | `particles.js`, `effects.css` |
| PLAYBOOK: "Move the repo off /mnt/c into the WSL filesystem" | The repo is on `/mnt/c` in a SyncFolder | working directory |
| PLAYBOOK: "Unzip the Balmoral font into client/assets/ui/fonts/" | Done; the zip is still there too | `client/assets/ui/fonts/` |
| Old README: `start-scoreboard.bat --backup-dir E:\…` | Works only from a Command Prompt, not by double-click | `start-scoreboard.bat:11` |
| CLAUDE.md: "Quick-button point values live in shared/scoring.json" | True. The load test and scorer both read them from there; no hard-coded values found | grep |
| MECHANICS §10: "Fortissimo wager, Crescendo bonus: custom amount" | Custom pad, max 1000 by setting | `settings.json` |

## Open questions and `TODO: verify` items

1. **Static IP on the host** (runbook): the Windows steps for a manual IPv4 on the hotspot network were not verified on the real laptop. The start script prints the current address, so this is a convenience, not a requirement.
2. **Hotspot power-saving toggle name** (runbook): the setting that turns the hotspot off when idle exists in Windows Mobile hotspot settings; the exact label on the event laptop's Windows build was not checked.
3. **Which laptop hosts and which runs the hotspot** (PLAN open item). The runbook assumes the plan: standby runs the hotspot.
4. **Final chamber names and songs** (PLAN open item). CSV still says "Chamber 1 … 15".
5. **Windows firewall script on the standby**: `allow-firewall.bat` was read, not run (needs a Windows admin prompt). Its `netsh` rule is standard.
6. **Whether 8 real laptops over Wi-Fi match the load-test latency** measured on one machine. The load test tool works; the real-network run is the dry run's job.
7. **Browser walkthrough**: no browser automation was available in this environment. Screen behaviour was verified by reading the components and by exercising every socket event they call. Button texts in the guides are copied from the JSX.

## What was verified by running, and what by reading

**Run (on a temporary database, never `data/scores.sqlite`; backups to a scratch folder):**

- `npm install` state checked, `npm test`: 14 files, 95 tests passed (25.7 s). `npm run build`: clean, 82 modules; bundle grep found no external URL.
- `npm start` equivalent with `PORT=3111 SCORE_DB=<scratch> BACKUP_DIR=<scratch>`: health route, `/`, `/admin`, `/chamber-assets/c01/logo.png` 200, missing song 404; backup files appeared within a minute with the stamped pair.
- Socket API end to end: add → both clients see total; duplicate id → `duplicate`; 0 points / empty id → `rejected`; void → total 0; second void and void-of-void → `rejected`; `sync:since`; admin events denied without PIN; wrong PIN; right PIN; round switch; timer start/pause with host times; hide scores; podium guard while hidden and while tied; music, effects, preview, bogus preview; `hello` → `laptops` list; fresh connect sees persisted state.
- Load test: 8 bots, 2 entries/s, 10 s: 160 sent, 160 acked, 0 lost, 0 duplicated, totals matched, `RESULT: PASS`. Refusal without `--yes-write-to-this-server` confirmed.
- Host restart: killed and restarted the server; 164 entries, totals, round `allegro` and the paused timer came back.
- Restore: `--from-backup <folder>` into an empty laptop (164 entries); second run refused with the `--force` message and exit code 2; `--force` kept the old file as `scores.before-restore-<time>.sqlite`. Unknown option exits 2.
- Supervisor: normal start prints the banner with the LAN URL after health; `--from-backup /nonexistent` prints `RESTORE FAILED` and `Not restarting` with exit 2; bad option exits 1.
- `npm run dev` with `SCORE_DB` set: Vite on 5173 and the server on 3000 both start.
- Windows: `node server\src\index.js` started under Windows Node 22.23 from the same folder and answered `/api/health` (so the WSL-installed `node_modules` works on Windows). A second Windows start on the same port crashed with `EADDRINUSE` (finding I4).
- Inspected a read-only copy of the real `data/scores.sqlite` (finding C1). The original was not opened for writing.

**Read only:**

- All React components and CSS (no browser automation available): scorer two-tap flow, toast, card undo, offline banner texts, admin controls, projector podium/effects, history filter.
- `allow-firewall.bat`, `start-scoreboard.bat`, `restore-from-backup.bat` (CRLF, plain `cmd` syntax; the underlying `supervisor.js` paths were run).
- Music player and leader tracker in the browser (pure tracker is tested; the `<audio>` crossfade is not).
- Effects rendering (engine and queue are tested; CSS/canvas are not).

**Not covered:** behaviour on the real hotspot with 8 laptops; Windows power and sleep settings; the actual sound output path; `prefers-reduced-motion` handling beyond reading the CSS.

## Databases used

- Real log `data/scores.sqlite`: copied once to a scratch folder and opened read-only for inspection. Never opened by any server started during this work.
- All servers, restores and the load test used files under the session scratch folder (`.../scratchpad/db*`, `.../scratchpad/bk`) or Windows `%TEMP%` (removed afterwards).
