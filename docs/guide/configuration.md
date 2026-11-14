# Configuration reference

Everything that can be changed without touching code. All files are read **once when the server starts**; restart the server after editing any of them. Browser screens pick up the new values when they reconnect (they do so automatically after a restart).

Files:

| File | What it holds |
| --- | --- |
| `shared/scoring.json` | Rounds and the quick-button values per round |
| `shared/settings.json` | Admin PIN, backup folder, timer presets, scorer-screen numbers and texts |
| `shared/effects.json` | Projector effect thresholds, words and switches |
| `data/chambers.csv` | The chambers: id, name, colour, logo and song paths |
| `client/assets/` | Bundled art, fonts and per-chamber files |

Keys starting with `_note` are comments and are ignored.

---

## scoring.json

```json
{
  "rounds": {
    "adagio": { "name": "Adagio", "groups": [{ "label": "Correct", "values": [10, 20, 30] }] },
    "vivace": { "name": "Vivace", "tiebreak": true, "groups": [] },
    "awarding": { "name": "Awarding", "groups": [] }
  }
}
```

| Key | Type | Default | Effect |
| --- | --- | --- | --- |
| `rounds` | object | 5 rounds | One entry per round. The **key** is the round id stored on every entry (never change an id after scoring has started). The **order** of keys is the order of the admin's round buttons. The first key is the round after a fresh start. |
| `rounds.<id>.name` | string | | Shown on the scorer top bar, the admin buttons, the projector and the curtains. |
| `rounds.<id>.groups` | array | | Button groups shown on the scorer panel, in order. Empty array = **No scoring this round**. |
| `groups[].label` | string | | Heading above the buttons, and the **Why** text stored on each entry. Labels must be unique within a round (they are used as keys). |
| `groups[].values` | integer array | | One button per value. Positive = green add button, negative = red dashed subtract button. 0 is not allowed (the server rejects 0-point entries). |
| `groups[].counter` | boolean | false | Shows **× N** next to the label: how many entries with this label this chamber has in this round. Used for Syntax error. |
| `rounds.<id>.tiebreak` | boolean | false | Marks a round as having no scoring. The scorer screen shows **No scoring this round**. The load test skips it. The server still accepts entries tagged with this round (see [ANALYSIS](ANALYSIS.md)). |

Current values (verified against the file):

| Round | Groups |
| --- | --- |
| adagio (Adagio) | Correct 10, 20, 30 |
| andante (Andante) | Defense won 10, 20, 30 · Defense lost −10, −20, −30 · Pool 5, 15, 20 |
| allegro (Allegro) | Correct 15, 30, 60 · Incorrect −15, −30, −60 · Syntax error −5 (counter) · Power-up bonus 10, 15, 40 · Magnum Opus 100 · Special problem 100, −50 |
| vivace (Vivace) | none, `tiebreak: true` |
| awarding (Awarding) | none |

**To change a point value:** edit the number, save, restart the server. No rebuild. The test `shared/tests/skeleton.test.js` asserts the round list and Adagio's values; update it if you change those.

**To add a button:** add a value to an existing group, or add a new `{ "label": "...", "values": [...] }` object to the round's `groups`.

**To add a round:** add a new key to `rounds` in the position you want. The admin gets a button for it automatically. Entries for a removed round keep their old round id and show it raw in the history.

---

## settings.json

```json
{
  "adminPin": "<choose your own>",
  "backupDir": "E:\\scoreboard-backup",
  "backupKeep": 10,
  "timerPresetsMinutes": [1, 5, 10, 15, 20, 30],
  "recentEntries": 3,
  "undoToastSeconds": 6,
  "cardColumns": 4,
  "buttonHeightPx": 56,
  "customPadMaxPoints": 1000,
  "customLabel": "Custom",
  "ackTimeoutMs": 4000,
  "musicHoldSeconds": 10,
  "musicCrossfadeSeconds": 2,
  "texts": { "offline": "...", "sending": "...", "pickChamber": "...", "noScoring": "...", "unsent": "..." }
}
```

Server-only keys (never sent to browsers):

| Key | Type | Default | Effect |
| --- | --- | --- | --- |
| `adminPin` | string | a committed placeholder, see [Admin PIN](#admin-pin) | The PIN for `/admin`. Compared as an exact string. Empty string = nobody can log in. |
| `backupDir` | string | `""` (no backups) | Folder for the minute backups. Absolute Windows path recommended, with doubled backslashes in JSON. A relative path is resolved from the scoreboard folder. Empty = no backups and a `WARNING` at start. |
| `backupKeep` | number | 10 | How many stamped `backup-<date>-<time>` pairs to keep. Older ones are deleted. `scores-latest.*` is always kept. |

Keys sent to every screen (any missing key falls back to the default in `client/src/settings.js`):

| Key | Type | Default | Effect |
| --- | --- | --- | --- |
| `timerPresetsMinutes` | number array | `[1, 5, 10, 15, 20, 30]` | The admin's timer length buttons, as **N min**. |
| `recentEntries` | number | 3 | How many of its latest entries each scorer card lists (each with an Undo). |
| `undoToastSeconds` | number | 6 | How long the **+20 to Chamber 1 / Undo** message stays. |
| `cardColumns` | number | 4 | Chamber-card columns on a wide scorer screen (3 columns under 1500 px wide, 2 under 1100 px). |
| `buttonHeightPx` | number | 56 | Minimum height of the scoring buttons. Keep at 48 or more. |
| `customPadMaxPoints` | number | 1000 | Largest amount the Custom pad accepts. |
| `customLabel` | string | `"Custom"` | Heading of the pad and the **Why** stored on pad entries. |
| `ackTimeoutMs` | number | 4000 | How long a scorer waits for the host to confirm one entry before sending it again. |
| `musicHoldSeconds` | number | 10 | How long a new leader must hold 1st before the projector switches songs. |
| `musicCrossfadeSeconds` | number | 2 | Fade between songs. |
| `texts.offline` | string | `Offline. Your entries are saved and will send when the connection returns.` | Red bar text. |
| `texts.sending` | string | `Sending…` | Yellow bar text, followed by the count. |
| `texts.pickChamber` | string | `Tap a chamber first` | Panel heading before a card is tapped. |
| `texts.noScoring` | string | `No scoring this round` | Panel text in rounds with no buttons. |
| `texts.unsent` | string | `not sent yet` | Suffix on queued entries under a card. |

### Admin PIN

- Set `adminPin` in `shared/settings.json`, or set the environment variable `ADMIN_PIN` (it wins over the file). The PIN never leaves the server: it is checked there and stripped from what browsers receive (`server/src/app.js:27-28`).
- **The repository ships with a short placeholder PIN in `settings.json`. Change it before the event.** The file is committed, so anyone with the repo knows the placeholder.
- Five wrong attempts from any laptop lock all admin logins for 10 seconds.
- The admin browser tab remembers a successful PIN until the tab is closed (session storage), not across laptops.

---

## effects.json

Projector effects only. Nothing here affects scores. Times are milliseconds. Each effect can be turned off alone with `"enabled": false`; the admin screen has the master switch and Full/Reduced. Missing keys fall back to the bundled copy of this file.

| Key | Type | Default | Effect |
| --- | --- | --- | --- |
| `effects.streakFire.tiers` | number array | `[3, 5, 7]` | Flame sizes at this many positive entries in a row for one chamber. A negative entry or an undo of one of them ends the streak. |
| `effects.shake.atOrBelow` / `.ms` | number | `-30` / `700` | Row shake and red flash on an entry this low or lower. Not in Reduced. |
| `effects.fortissimo.atOrAbove` / `.word` | number / string | `100` / `FORTISSIMO!` | Word flash on an entry this high or higher. |
| `effects.crescendo.ranksClimbed` / `.word` | number / string | `3` / `CRESCENDO!` | Word flash when one entry lifts a chamber this many places. |
| `effects.encore.streak` / `.word` | number / string | `5` / `ENCORE!` | Word flash when a streak reaches exactly this length. |
| `effects.daCapo.word` | string | `DA CAPO!` | Word flash when a total goes from below 0 to above 0. |
| `effects.newLeader.ms` | number | `2600` | Spotlight on a chamber that takes 1st place outright. |
| `effects.scorePop.ms` / `.countUpMs` | number | `1500` / `700` | Floating **+20** on the row, and the total's count-up time. |
| `effects.overtake.ms` | number | `1100` | Trail on a row that passes another. |
| `effects.goldBurst.atOrAbove` / `.particles` | number | `100` / `110` | Gold confetti from the row on a big entry. |
| `effects.noteRain.atOrAbove` / `.pointsPerNote` / `.maxNotes` | number | `10` / `10` / `12` | Music notes drift up from the row; one note per `pointsPerNote`. |
| `effects.offKey.below` | number | `0` | Rows with a total below this look grey. |
| `effects.finalMinute.underSeconds` / `.fastUnderSeconds` | number | `60` / `10` | Timer pulses under a minute, faster under 10 s. |
| `effects.metronome.enabled` | boolean | `true` | Swinging metronome next to a running timer. |
| `effects.curtains.closeMs` / `.holdMs` / `.openMs` | number | `900` / `1500` / `900` | Curtains on a round change. |
| `effects.podium.round` | string | `awarding` | The round id during which the projector shows the podium instead of the leaderboard. |
| `effects.podium.stepMs` / `.confettiParticles` | number | `1800` / `260` | Preview step time, and the confetti for 1st place. |
| `word.ms` | number | `1900` | How long a word flash stays. |
| `queue.max` / `queue.staleMs` | number | `4` / `6000` | Full-screen effects (words, curtains, spotlight) play one at a time. At most `max` wait; a waiting word older than `staleMs` is dropped. |
| `reduced.particleScale` | number | `0.3` | Confetti multiplier in Reduced mode. |

---

## chambers.csv

```csv
id,name,colour,logo,song,members
c01,Chamber 1,#e63946,client/assets/chambers/c01/logo.png,client/assets/chambers/c01/song.mp3,3
```

| Column | Type | Used for |
| --- | --- | --- |
| `id` | short string, unique | Stored on every entry. The folder name under `client/assets/chambers/`. **Never change an id after scoring has started**: entries for an unknown id disappear from the totals. |
| `name` | string | Shown everywhere. The fallback logo uses the trailing number of the name (`Chamber 7` → **7**), or its first letter. |
| `colour` | CSS colour, e.g. `#e63946` | Card edge, projector row edge, fallback logo disc. |
| `logo` | path from the scoreboard folder | PNG (or any image). Must be inside `client/assets/chambers/`. Missing file = fallback disc, listed under **Missing chamber files**. |
| `song` | path from the scoreboard folder | MP3 (or any browser-playable audio). Must be inside `client/assets/chambers/`. Missing file = no music for that chamber. |
| `members` | anything | Not used by the scoreboard. Kept for the organisers. |

Rules: first line is the header; blank lines are skipped; a field may be wrapped in double quotes if it contains a comma (a quote inside a quoted field is not supported). Column order does not matter. The file is read at server start. The test `shared/tests/skeleton.test.js` asserts 15 chambers.

The logo and song **file existence** is checked every time a screen connects, so adding a file needs only a reload of that screen, not a restart.

**Rename a chamber:** change `name` (and `colour` if you like), keep `id`, restart the server.

**Add a chamber:** add a row with a new `id`, create `client/assets/chambers/<id>/` with `logo.png` (and `song.mp3`), restart. The projector fits 8 rows in one column and uses two columns above that.

**Remove a chamber:** only before scoring starts. Delete the row and restart.

---

## Chamber assets

```text
client/assets/chambers/
  c01/logo.png      <- referenced by chambers.csv "logo"
  c01/song.mp3      <- referenced by chambers.csv "song"  (missing for all chambers as of this writing)
  ...
  notes.png         <- not referenced anywhere
```

Served at `/chamber-assets/<path>` straight from disk; anything outside this folder is refused.

## Theme assets (bundled at build time)

Used by the screens; changing them requires `npm run build`:

| File | Where it shows |
| --- | --- |
| `client/assets/ui/logo/logo.svg` | Top bar of every screen, PIN gate, projector header |
| `client/assets/ui/optimized/wall_pattern.png` | Page background (scorer, admin, history, projector) |
| `client/assets/ui/optimized/wooden_wall.png` | Top bar strip, podium blocks |
| `client/assets/ui/optimized/frame.png` | Oval frame around the selected chamber's logo on the scorer panel |
| `client/assets/ui/optimized/square_frame.png` | Gold frame around the projector leaderboard |
| `client/assets/ui/optimized/blue_curtain_1.png` | Projector side curtains and the round-change curtains |
| `client/assets/ui/structure/note.svg` | Floating music notes |
| `client/assets/ui/fonts/general-sans/*.otf` (Regular, Medium, Semibold, Bold) | Body font |
| `client/assets/ui/fonts/balmoral/BalmoralStd-Regular.otf` | Headings, round names |

Not referenced by any screen: `ui/footer/Placeholder_Footer.png`, `ui/yses/*`, `ui/structure/*.png` (the `optimized/` copies are used instead), `ui/optimized/music_sheet.png`, `ui/optimized/musician_shadow.png`, the two font `.zip` files, `chambers/notes.png`.

---

## Environment variables and command-line options

Read by `server/src/index.js` and `scripts/supervisor.js`.

| Name | Type | Default | Effect |
| --- | --- | --- | --- |
| `PORT` | number | `3000` | TCP port the server listens on, on all interfaces. The firewall script hard-codes 3000. |
| `SCORE_DB` | path | `data/scores.sqlite` | The score log file. Use a temp path for load tests and experiments so the real log is never touched. |
| `BACKUP_DIR` | path | unset | Backup folder; wins over `settings.json`, loses to `--backup-dir`. The start script sets it from `--backup-dir`. |
| `ADMIN_PIN` | string | unset | Admin PIN; wins over `settings.json`. |

| Option | Effect |
| --- | --- |
| `--backup-dir <folder>` | Backup folder for this run. Highest priority. |
| `--from-backup <folder or .sqlite file>` | Before starting, copy that backup in as the local score log. A folder means its `scores-latest.sqlite`, or the newest `backup-*.sqlite` if that is missing. Refuses if the local log already has entries. Applied only on the first start, never on a crash-restart. |
| `--force` | Lets `--from-backup` replace a local log that has entries. The old file is kept as `data/scores.before-restore-<time>.sqlite`. |

Examples (Command Prompt on Windows):

```bat
start-scoreboard.bat
node scripts\supervisor.js --backup-dir E:\scoreboard-backup
npm start -- --from-backup E:\scoreboard-backup --force
set SCORE_DB=%TEMP%\loadtest.sqlite && npm start
```

Double-clicking a `.bat` passes no options; to pass `--backup-dir` run it from a Command Prompt, or set `backupDir` in `settings.json` instead.

## Backup folder contents

Written every minute while the server runs, and once more on Ctrl+C:

| File | What |
| --- | --- |
| `scores-latest.sqlite` | Complete copy of the score log and game state. What a restore uses. |
| `standings-latest.csv` | `rank,chamber_id,name,total,as_of` (UTF-8 with BOM, CRLF, opens in Excel). Rank is the projector order after tie picks. |
| `backup-YYYYMMDD-HHMMSS.sqlite` / `.csv` | Stamped copies, written only when something changed, newest `backupKeep` kept. |

Both `*-latest` files are written to a temp name and renamed, so a pulled USB drive never leaves a half-written file.
