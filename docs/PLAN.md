# Get One Fourth: Reprise — Offline Synced Scoreboard Plan

## Overview and goals

This is only a scoreboard. The game is played face to face and human proctors do all the checking, so the software enforces no game rules. Scorers on laptops add or subtract decibels for a chamber, and every screen shows the same totals within a second. It runs on one host laptop and a Wi-Fi hotspot with no internet.

What success looks like on event day:

- A scorer records any score change in two taps: pick the chamber, tap the points.
- The scorer screen changes with the round, so only that round's point buttons show.
- The projector leaderboard updates within 1 second.
- A laptop that drops off Wi-Fi loses nothing and catches up when it reconnects.
- A host restart brings back every score.
- Any wrong entry can be undone, and the history shows who entered what.
- The scoreboard is themed with the event's own art and plays the leading chamber's song.

## Decisions

| Topic | Decision |
| --- | --- |
| Scope | Scoreboard only: add or subtract points. No question pool, Trebles, attack or power-up tracking, and no rule checking. Proctors handle all of that in person. |
| Network | A laptop hotspot with no internet, for 7 to 8 laptops. Run it from the standby laptop, not the host. The host gets a static IP address. |
| Scorers | Any scorer laptop can score any chamber. |
| Stack | Node.js with Express, Socket.IO and SQLite on the host. React with Vite in the browser. Other laptops install nothing. |
| Packaging | One folder with every dependency, started by a double-click script. Nothing loads from the internet. |

## Architecture

The host laptop holds the one true score log. Scorer laptops send entries to it, and the host saves each entry and pushes the new totals to every screen.

Clients: scorer laptops (add or subtract points), the admin screen (rounds, timers, undo), the projector (leaderboard and music), and a standby laptop (loads the latest backup if the host fails).

### How sync works

1. A scorer taps a points button. The browser gives the entry a unique ID and sends it over Socket.IO.
2. The host ignores an entry ID it has already seen, stamps the entry with host time, and appends it to the SQLite log.
3. The host broadcasts the entry, and every screen updates its totals.

### Offline and reconnect

- If Wi-Fi drops, the scorer screen shows an offline banner and keeps unsent entries. It resends them on reconnect, and the duplicate check means nothing is counted twice.
- A reconnecting laptop asks for everything after the last entry it saw.
- Timers run on host time, so every screen shows the same countdown.

### Undo and recovery

- The log is never edited or deleted. Undo adds a void entry that cancels the original.
- On restart, the host replays the log and every total comes back.
- The host writes a backup of the log and a standings CSV every minute to a folder you choose, such as a USB drive. The standby laptop can load that backup and take over.

## Data

| Item | Fields |
| --- | --- |
| Chamber | id, name, colour, logo, song. Loaded from `data/chambers.csv`. |
| Entry | id, chamber, points (+ or −), round, label, scorer device, host time, voids (the entry it cancels, if any) |
| Game state | current round, scores hidden or shown, manual order for tied chambers |
| Timer | duration, started at, paused at |

A chamber's total is the sum of its entries that are not voided. Totals can go below 0.

## Round screens

The admin picks the current round, and every scorer screen switches to it. Each screen shows the chamber cards and that round's quick buttons. The button values live in `shared/scoring.json`.

| Round | Quick buttons |
| --- | --- |
| Adagio | +10, +20, +30 |
| Andante | Defense won: +10, +20, +30. Defense lost: −10, −20, −30. Pool: +5, +15, +20. |
| Allegro | Correct: +15, +30, +60. Syntax error: −5 with a counter. Power-up bonus: +10, +40. Magnum Opus: +100, −50. Lifeline (special problem): +100, −50. |
| Awarding | No scoring. The admin orders any tied chambers after Vivace and reveals the ranks. |

Every scoring screen also has a custom + / − number pad for anything else, such as a Fortissimo stake, and an undo for the last entry.

## Screens

| Screen | Who | What it does |
| --- | --- | --- |
| Scorer | Scorers on laptops | Chamber cards with totals and the current round's buttons. Tap a chamber, tap the points. A short undo toast follows each entry, and each card shows its last few entries. |
| Admin | Tech lead | Switch rounds, start and pause timers, undo any entry, hide or reveal scores, set tie order, set "Defending against" for Andante, control music, see connected laptops, export. PIN protected. |
| Projector | Big screen, read-only | Themed leaderboard with animated rank changes, the round name, a big centered timer, and in Andante "Defending against" under each attacked chamber (up to 2 attackers, set by the admin, display only). |
| History | Admin and scorers | Every entry with time, chamber, points, label and device. Filter by chamber. |

### Look and feel

The scoreboard is themed, not plain. It uses the art in `client/assets/`: backgrounds, frames, logos and fonts in `ui/`, and a logo and song for each chamber in `chambers/<chamber-id>/`. The theme follows the Reprise music motif. All assets are bundled so they load with no internet.

### Projector effects

Visual effects on the projector, for show only. They never decide or track anything about the game. Every threshold, word and on/off switch is in `shared/effects.json` (restart the server after editing).

- Triggers: live score entries, rank changes, the timer and round changes. A snapshot (start or reconnect) never plays effects. Undo plays no pop, word or spotlight.
- Streak fire (3, 5, 7 positives in a row), shake and red flash (−30 or worse), word flashes (Fortissimo! at +100, Crescendo! on a 3-rank climb, Encore! at a streak of 5, Da Capo! when a total climbs from below 0 to above 0), new-leader spotlight, score pop with count-up, overtake trail, gold burst (+100), note rain, off-key grey (total below 0), final-minute pulse with a metronome, round-change curtains, and the Awarding podium (3rd, 2nd, 1st on the admin's click, confetti for 1st).
- Word flash, curtains and spotlight go through one queue, one at a time. Row effects run together.
- While scores are hidden, no effect that shows scores or ranks plays, and the podium cannot be revealed.
- Admin: effects on/off, Full or Reduced, the podium reveal buttons, and an effects preview panel with one button per effect. Previews go only to projector screens and change nothing stored.
- Scorer screens get only a short ring on the tapped button.
- CSS animations and one canvas only. Flames, spotlight and confetti are drawn in code until art is added.

### Simple scoring

- A scorer never types unless using the custom pad.
- Buttons are large, at least 48 px tall, and show their value, such as "+20".
- Buttons that subtract are visually distinct from buttons that add.
- No menus, settings or jargon on the scorer screen.
- It works on a 13-inch laptop with a touchpad.

### Chamber music

The projector laptop plays the song of whichever chamber is in 1st place.

- On a lead change, the old song fades out and the new one fades in over about 2 seconds.
- A new leader must hold 1st for about 10 seconds before the song switches. On a tie for 1st, the current song keeps playing.
- Browsers block sound until someone clicks the page, so the admin clicks "Enable sound" once on the projector laptop.
- The admin has volume and mute. Music stops while scores are hidden, or the song would give away the leader.

## Edge cases

| Situation | What happens |
| --- | --- |
| Double tap or resend after reconnect | The host ignores repeated entry IDs. |
| Two scorers score the same chamber | Both entries count. Each card shows its latest entries, so a duplicate is easy to spot and undo. |
| Wrong entry | Undo it from the toast, the card, or the history. The admin can undo anyone's entry. |
| Scorer laptop goes offline | Entries wait and send on reconnect. |
| Host crashes | Restart it. The log replays and totals return. |
| Tie for a podium place | Proctors run Vivace in person. The admin then sets the order of the tied chambers. Totals don't change. |

## Venue setup

**Hardware**

- Hotspot laptop: use the standby laptop, kept plugged in, with Mobile Hotspot on and no internet. Windows allows 8 connected devices.
- Host laptop with a static IP address on the hotspot's network, e.g. `192.168.137.10`.
- Projector laptop on HDMI, with speakers for the chamber music.
- Extension cords so every laptop stays plugged in.
- A USB drive for the backup folder.
- Backup network: a phone hotspot or borrowed router with the same network name and password.

**Laptop prep (the day before)**

- Turn off sleep, screen lock, OS updates and VPNs on every laptop.
- On the hotspot laptop, turn off the Windows setting that switches the hotspot off when no devices are connected.
- Bookmark `http://192.168.137.10:3000` on every laptop and test it with only the hotspot on.
- Allow the host's port through its firewall, and set the hotspot network to Private.

**Fallbacks, from mildest to worst**

1. A laptop drops off Wi-Fi: it resends on its own.
2. The host app crashes: the start script restarts it, and the log replays.
3. The host laptop dies: start the app on the standby with the latest backup. Scorers open the standby's URL.
4. Everything fails: each proctor keeps a paper tally, and the last standings CSV gives the numbers to continue from.

## Build order and testing

| Step | Goal | Check |
| --- | --- | --- |
| 0 | Project skeleton (done) | `npm test` and `npm run dev` both run. |
| 1 | Score log and sync | Two browser windows stay in sync. Restart the server and the totals return. |
| 2 | Scorer screens for each round | Someone who has never seen it scores a mock round with no instructions. Turn Wi-Fi off, tap 3 entries, turn it on: nothing lost or doubled. |
| 3 | Admin, projector and history | Switch rounds, run a timer, undo an entry, hide and reveal scores. Read the projector from across a room. |
| 4 | Theme with the assets, and chamber music | Every screen uses the art. Change the leader and hear the crossfade. |
| 5 | Backup, start script, load test, dry run | 8 laptops on the real hotspot. Pull the host's power and recover on the standby. |

Automated tests cover the totals: sums, voids, duplicate IDs, and replay after a restart. Everything else is checked by hand in the dry run with the committee.

## Open items

- Event date and dry-run dates.
- Which laptop runs the hotspot, and which is the host.
- Chamber logos and songs for `client/assets/chambers/`, needed before step 4.
- The final chamber names for `data/chambers.csv`.