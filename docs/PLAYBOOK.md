# Vibe coding playbook

Build the scoreboard in 5 small sessions with the Claude CLI, after the skeleton you already have. Each session has one goal, ends with a git commit, and is checked by you on real laptops before the next one starts.

## Ground rules

1. **It is only a scoreboard.** Scorers add or subtract points, and proctors do the checking in person. If Claude starts building rule checks, stop it.
2. **The spec lives in the repo.** `docs/PLAN.md` is the plan, `docs/MECHANICS.md` is the game reference, and `CLAUDE.md` holds the constraints.
3. **One session, one goal.** Start a fresh session for each step.
4. **Plan before code.** Read Claude's plan, then say go.
5. **Commit after every working step.** A commit is your undo button.
6. **Check it yourself on real laptops** after every step.

## Setup for the new direction

1. Revert the step 1 rules-engine work so the repo is back at the step 0 skeleton.
2. Replace `docs/PLAN.md`, `docs/MECHANICS.md` and `CLAUDE.md` with the new versions.
3. Move the repo off `/mnt/c` into the WSL filesystem, e.g. `~/get-one-fourth-scoreboard`.
4. Unzip the Balmoral font into `client/assets/ui/fonts/`.
5. Commit, then run the step 1 prompt.

## Build order

| Step | Goal | You check it by |
| --- | --- | --- |
| 0 | Project skeleton (done) | `npm test` and `npm run dev` both run. |
| 1 | Score log and sync | Two browser windows stay in sync. Restart the server and the totals return. |
| 2 | Scorer screens for each round | Someone who has never seen it scores a mock round with no instructions. Turn Wi-Fi off, tap 3 entries, turn it on: nothing lost or doubled. |
| 3 | Admin, projector and history | Switch rounds, run a timer, undo an entry, hide and reveal scores. Read the projector from across a room. |
| 4 | Theme with your assets, and chamber music | Every screen uses your art. Change the leader and hear the crossfade. |
| 5 | Backup, start script, load test, dry run | 8 laptops on the real hotspot. Pull the host's power and recover on the standby. |

## Prompts

Paste one prompt per fresh session. Each asks for a plan first; reply "go" once the plan looks right.

### Step 1: score log and sync

```text
Read CLAUDE.md and docs/PLAN.md. The project direction changed: this is only a scoreboard with no rule checking. First, trim shared/scoring.json to just the per-round quick-button values in the "Round screens" table, and remove anything left over from the old rules-engine design (list what you will delete before deleting it).

Then build the server core: an append-only SQLite score log, entries with client-made unique IDs (duplicates ignored), void entries for undo, totals rebuilt by replaying the log on start, the current round and a host-time timer as shared state, and Socket.IO broadcast so every client sees the same totals. Add a bare test page with a few +/- buttons and the raw totals, so I can check sync in two browser windows. Add tests for sums, voids, duplicate IDs and replay after restart. Plan first.
```

### Step 2: scorer screens

```text
Read CLAUDE.md and the "Round screens", "Screens" and "Simple scoring" sections of docs/PLAN.md. Build the scorer screen: chamber cards with totals, and the quick buttons for the current round read from shared/scoring.json. The screen switches automatically when the round changes. Include the custom +/- number pad, an undo toast after each entry, and the last few entries on each card. Add offline handling: an offline banner, keep unsent entries, resend on reconnect. Keep the styling simple for now; the theme comes in step 4. Tell me how to test offline by hand. Plan first, with a rough layout.
```

### Step 3: admin, projector and history

```text
Read CLAUDE.md and the "Screens" and "Edge cases" sections of docs/PLAN.md. Build: (1) the admin screen behind a PIN: switch rounds, start/pause/reset the timer, undo any entry, hide or reveal scores, set the order of tied chambers, see connected laptops; (2) the read-only projector screen: leaderboard with animated rank changes, round name, big timer, readable from across a room; (3) the history screen with a chamber filter. Plan first.
```

### Step 4: theme and chamber music

```text
Read CLAUDE.md and the "Look and feel" and "Chamber music" sections of docs/PLAN.md. List everything in client/assets/ and tell me what is missing. Then:

1. Theme every screen with my assets (backgrounds, frames, fonts, chamber logos and colours). Scorer buttons must stay large and obvious. Projector text must stay readable from across a room.
2. Add chamber music on the PROJECTOR screen only: play client/assets/chambers/<id>/song.mp3 for the chamber in 1st place, looping. Crossfade about 2 seconds on a lead change. A new leader must hold 1st for a configurable time (default 10 s) before switching. On a tie for 1st, keep the current song. Add an "Enable sound" button for the browser autoplay rule, and volume and mute on the admin screen. Stop the music while scores are hidden. Preload the songs.

If a chamber is missing a logo or song, fall back gracefully and list it. Plan first.
```

### Step 5: backup, start script and load test

```text
Read CLAUDE.md and the "Undo and recovery" and "Venue setup" sections of docs/PLAN.md. Add: (1) a backup of the score log plus a standings CSV written every minute to a folder I choose, and a way to start the app from a backup on another laptop; (2) a double-click start script for Windows that restarts the server if it crashes and prints the URL scorers should open; (3) a load-test script with 8 bot clients each sending 2 entries per second for 5 minutes to an address I pass in, reporting lost entries, duplicates and latency. Plan first.
```

### After any step: review prompt (fresh session)

```text
Read CLAUDE.md and docs/PLAN.md. Review the last commit as a strict reviewer who did not write it. List anything that could lose or double-count an entry, anything more complicated than the plan needs, any rule checking that crept in, and anything loaded from the internet. Do not fix anything yet; give me the list.
```

## When things go wrong

| Problem | What to do |
| --- | --- |
| A bug you can describe | Paste: "Bug: [what I did, what I expected, what happened]. Find the cause, show me, then fix it." |
| Claude keeps failing at the same fix | Stop after two tries. Go back to the last good commit, start a fresh session, and describe the goal again with what didn't work. |
| Claude is over-building | Say: "This is too complicated. This is only a scoreboard. Give me the simplest version that meets docs/PLAN.md." |
| A point value changes | Edit `shared/scoring.json`. No code change is needed. |
| It works on your laptop but not across laptops | Check the firewall and the host IP before blaming the code. |
| You don't understand what Claude built | Ask: "Explain how [feature] works in 10 lines, and which files I would open to change it." |

Freeze the code after the final dry run. On event day, the only allowed change is editing `scoring.json`.