# Get One Fourth Scoreboard

An offline scoreboard for **Get One Fourth: Reprise**, a face-to-face pen-and-paper programming contest. One host laptop runs the server on a Wi-Fi hotspot with no internet. Scorer laptops, the admin laptop and the projector laptop only need a browser.

It is **only a scoreboard**. Scorers add or subtract points (decibels) for a chamber (a team). Human proctors check every answer in person. The software enforces no game rules.

## Who should read what

| You are | Read |
| --- | --- |
| A scorer or proctor | [Scorer guide](docs/guide/scorer-guide.md) (one page) |
| The admin / tech lead on event day | [Admin guide](docs/guide/admin-guide.md), [Event-day runbook](docs/guide/event-day-runbook.md), [Troubleshooting](docs/guide/troubleshooting.md) |
| Setting up chambers, buttons or the PIN | [Configuration](docs/guide/configuration.md) |
| A developer | [Architecture](docs/guide/architecture.md), [Developer guide](docs/guide/developer-guide.md), [Analysis report](docs/guide/ANALYSIS.md) |

The planning documents (`docs/PLAN.md`, `docs/MECHANICS.md`, `docs/PLAYBOOK.md`, `CLAUDE.md`) describe intent. The guides above describe what the code does today.

## Quick start on one laptop

Prerequisites: Node.js 22 or 24 with npm. Verified with Node 24.17 (WSL) and Node 22.23 (Windows).

```bash
npm install          # once, needs internet
npm run build        # builds the browser screens into client/dist
npm test             # expected: "Test Files 14 passed", "Tests 95 passed"
npm start
```

Expected output of `npm start`:

```text
Scoreboard server on port 3000. 0 entries replayed from .../data/scores.sqlite
WARNING: no backup folder set. Set backupDir in shared/settings.json or pass --backup-dir.
Missing chamber files (fallbacks will be used): c01 song, c02 song, ...
```

Then open these in a browser on the same laptop:

| Screen | URL |
| --- | --- |
| Scorer | `http://localhost:3000/` |
| Admin (asks for a PIN) | `http://localhost:3000/admin` |
| Projector | `http://localhost:3000/projector` |
| History | `http://localhost:3000/history` |

The admin PIN is set in `shared/settings.json` under `adminPin`. Change it before the event. See [Configuration](docs/guide/configuration.md#admin-pin).

Stop the server with Ctrl+C. It writes one last backup first, if a backup folder is set.

## Event day in three steps (host laptop, Windows)

1. Once per host laptop: double-click `allow-firewall.bat` and accept the administrator prompt. Without it, other laptops cannot reach the host.
2. Set `backupDir` in `shared/settings.json` to a folder on a USB drive, for example `E:\\scoreboard-backup`.
3. Double-click `start-scoreboard.bat`. It restarts the server if it crashes and prints the URL scorers should open, for example `http://192.168.137.10:3000`.

Full checklist: [Event-day runbook](docs/guide/event-day-runbook.md).

## Repository layout

```text
server/src/     Express + Socket.IO server, SQLite score log, backup and restore
client/src/     React screens: scorer, admin, projector, history
client/assets/  Bundled art, fonts, chamber logos and songs
shared/         scoring.json, settings.json, effects.json and pure helpers
scripts/        start-script supervisor, LAN URL finder, load test
data/           chambers.csv and scores.sqlite (the score log, not committed)
docs/guide/     The guides linked above
*.bat           Windows double-click scripts: start, restore, firewall
```
