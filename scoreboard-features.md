# GET 1/4! Reprise Live Scoreboard: Current Features

Compiled Nov 17, 2026 from Arvin's Claude Code session (Nov 14–16). The repo itself was not read, so check this against the code before using it as a spec.

Repo: `get-one-fourth-scoreboard` (Arvin, Tech)

## How it runs

- **Offline by design.** It runs on a local network with no internet needed.
- **One host laptop** runs the server (Node.js) and holds the only score log (SQLite).
- **Other devices** open `http://<host IP>:3000` in a browser. Nothing gets installed on them.
- **Windows shortcuts**
  - `start-scoreboard.bat` starts the server, using `scripts/supervisor.js`, which restarts the server if it crashes.
  - `allow-firewall.bat` opens port 3000. Run it once.
  - `restore-from-backup.bat` restores from a backup.
- **Linux or Mac:** run `node scripts/supervisor.js`. On Fedora, port 3000 also has to be opened in the `nm-shared` firewall zone.
- `better-sqlite3` is built for one OS, so run `npm install` on the same OS as the host laptop.

## Screens

| Screen | Use |
|---|---|
| Scorer | Tap a chamber, then tap the points. All 15 chamber cards are shown in 4 columns. It is built for laptops and not tested on phones. |
| Projector | Shows the standings and the timer, and plays the leader's song. |
| Admin | Protected by a PIN, which defaults to `1234` and should be changed. Sets the round and the timer, and sets the order of tied chambers for Vivace. |

## Scoring model

- **Tap buttons, not a calculator.** The proctor or scorer works out the points, and the scorer taps the matching button.
- **Custom pad.** Each scoring screen has a +/− number pad for amounts with no fixed button, such as the Fortissimo stake.
- **Undo** removes the last entry. There is also a history of every entry.
- **No double counting.** Each entry has its own ID, so an entry sent twice is only counted once.
- **Unsent entries are kept.** If a device drops off Wi-Fi, its entries stay in the browser and are sent when it reconnects.
  - These entries are tied to the exact address the browser opened. If the host's IP changes, they get stuck.
- **Saving:** every score is written to disk before the scorer's screen confirms it, so a crash or power cut loses nothing that was confirmed. Unsent entries wait in each scorer's browser.
- **Backups** are copied every minute to `backupDir` (a USB drive), or to `data/backups` on the host laptop when none is set.

## Point buttons (`shared/scoring.json`)

| Round | Buttons |
|---|---|
| Adagio | Correct +10 / +20 / +30 |
| Andante | Defense won +10 / +20 / +30 · Defense lost −10 / −20 / −30 · Pool +5 / +15 / +20 |
| Allegro | Correct +15 / +30 / +60 · Syntax error −5 (counter) · Power-up bonus +10 / +40 · Magnum Opus +100 / −50 · Lifeline (special problem) +100 / −50 |
| Vivace | No scoring. The admin sets the order of the tied chambers. |
| Awarding | No scoring. |

## Data

- **Chambers:** `data/chambers.csv` holds the id, name, colour, logo, song and members.
  - The 15 chambers are still named "Chamber 1"–"Chamber 15".
  - All song files are missing. With no song, no music plays and no error is shown.
- **Renaming a chamber:** on `/admin`, under **Chamber names**: type, then Save. Every screen updates at once and the CSV is saved. (Editing the CSV and restarting still works; keep the id c01–c15.)

## Tested

- **Unit tests:** 97/97 pass.
- **Server load test:** 18 bots and 40 bots, with 0 lost and 0 doubled. Updates showed on every screen in under 0.1 s.
- **Fedora hotspot test (Nov 16)**
  - 7 devices joined, but at most 6 were connected at the same time.
  - Only 1 device actually sent scores.
  - There were 7 drops and 28 Realtek driver errors.
  - The setup is not event-ready.

## Known gaps

Status as of Nov 19: items 1–4 are fixed in the code and docs (uncommitted).

1. **Timer presets** are 1, 5, 10, 15, 20 and 30 min. Allegro needs 40 min, and Andante needs 3 min and 30 s.
2. **Timer position.** The projector timer is not centered.
3. **Andante display.** There is no "Defending Against" display for Andante.
4. **Rules that differ from the Decision Log:**
   - **Magnum Opus scoring:** a correct answer that was not first gets −50. Decided: 0 for correct-but-late; −50 for a wrong answer or an envelope opened with nothing submitted, once per chamber (DL #75).
   - **Magnum Opus timing:** MECHANICS.md still has the 20-min reveal and the 10-min Magnum-Opus-only window. Decided: envelope at the 10-minute mark of Allegro (10:15), open until 10:45, no Magnum-Opus-only window (DL #76).
   - **Magnum Opus checking:** correct or wrong only, no syntax −5. Submissions are checked in order of the proctor's written time; the queue keeps being checked after a winner is confirmed (DL #93). No correct answer = no +100 (DL #94).
   - **Ritardando:** Arvin assumed +40 whether the answer is right or wrong. Decided: +40 only on a correct Hard answer (DL #77).
   - **Allegro incorrect:** the buttons subtract −15 / −30 / −60. Decided: remove them; a wrong answer gets 0 (DL #63). Syntax −5 per occurrence, minimum 0 per question.
   - **Power-ups (Nov 19):** only Pianissimo, Ritardando and Fortissimo. Hemiola and Crescendo are dropped, so the +15 bonus button is gone. Fortissimo wrong = −stake only.
5. **Uncommitted changes.** Arvin's `package-lock.json` had uncommitted changes as of Nov 14.

## Event workflow (decided Nov 17)

- **Only the checkers encode.** Proctors check at the chamber's seats and keep the Back Up Score Sheet; couriers bring the sheets to the checkers' laptop station (DL #80, #88).
- **Network:** Windows hotspot, or a router if one can be borrowed. Devices: 5 checker laptops and the slides laptop (DL #96).
- **Dry run test (Nov 18):** checkers encode at the same time for 10+ minutes, then test Wi-Fi off and on.

## Recommended event setup (from the session)

- **One Windows laptop** does the hotspot, server, admin page and projector. The projector page goes out over HDMI.
- **Up to 8 scoring devices** on the hotspot. Laptops are preferred.
- **Phones on the hotspot** need these settings:
  - Mobile data off
  - Wi-Fi Assist or auto-switch off
  - Other saved networks forgotten
  - Screen never locks
- **Standby laptop** with the same hotspot name and password, ready for the restore steps.
- **Router or pocket Wi-Fi** is better than any of these workarounds, if one can be borrowed.
