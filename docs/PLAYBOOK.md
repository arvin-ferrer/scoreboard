# Vibe coding playbook

Build the scoreboard in 10 small sessions with the Claude CLI. Each session has one goal, ends with passing tests and a git commit, and is checked by you on real laptops before the next one starts.

## Ground rules

Vibe coding goes wrong in two ways: the AI forgets the rules halfway through, and bugs pile up unseen until the dry run. These seven habits prevent both.

1. **The spec lives in the repo, not in your head.** Export the Plan tab as Markdown into `docs/PLAN.md`. Claude reads it every session, so you never retype rules.
2. **One session, one goal.** Start a fresh session (`/clear` or a new terminal) for each step in the build order. Long sessions drift and forget.
3. **Plan before code.** For each step, ask Claude for a plan first, read it, then say go. Fixing a plan takes one message; fixing code takes ten.
4. **Rules engine first, tests always.** Scoring is pure logic that tests can prove right. Every row in the rules tables becomes a test before any screen is built.
5. **Commit after every working step.** A git commit is your undo button. If a session makes a mess, you roll back instead of arguing with it.
6. **Check it yourself on real laptops.** Passing tests don't show a button that is too small or a sync that lags. Open two laptops after every sync or UI step.
7. **Rule changes go into the spec first.** When the committee changes or confirms a rule, edit `docs/PLAN.md` and `scoring.json`, then tell Claude to update the tests and code to match.

## One-time setup

1. Install Node.js (LTS), git and the Claude CLI on your development laptop.
2. Create a folder `get-one-fourth-scoreboard`, run `git init`, and make a private GitHub repo as an off-laptop backup.
3. Export the Plan tab as Markdown and save it as `docs/PLAN.md`. Save the mechanics text as `docs/MECHANICS.md`.
4. Create `CLAUDE.md` in the project root with the text below. The CLI loads this file automatically in every session.
5. Run prompt 0 from the Prompts section.

```markdown
# Get One Fourth Scoreboard

Offline LAN scoreboard for a programming contest. Full spec: docs/PLAN.md. Game rules: docs/MECHANICS.md. Read both before planning any work.

## Hard constraints
- Runs with NO internet on event day. Never load anything from a CDN or external URL. All fonts, scripts, styles, images and audio are bundled.
- One host laptop runs the server. All other laptops use only a browser.
- The event log (SQLite, append-only) is the single source of truth. Never edit or delete events. Corrections are void events. All state is rebuilt by replaying the log.
- All scoring numbers and rule switches live in shared/scoring.json. Never hard-code a decibel value.
- Rules marked (tentative) in docs/PLAN.md must be config switches in scoring.json so they can flip without code changes.
- Timers use host time only.

## Design and assets
- This is NOT a plain scoreboard. It is themed around the event ("Get One Fourth: Reprise", a music motif).
- Use the assets I put in client/assets/. Look at what is there before designing anything:
  - client/assets/ui/ : backgrounds, logos, fonts, icons
  - client/assets/chambers/<chamber-id>/ : logo.png, song.mp3
- Never invent placeholder art when a real asset exists. If an asset you need is missing, list it and ask me.
- Chamber name, colour, logo and song are mapped in data/chambers.csv.

## Scoring UX
- Scoring must be dead simple. A proctor never types a number or does maths.
- Show only the actions valid right now, as big buttons with the decibel change on them.
- Be creative with direct gestures: slide/drag a Treble onto a chamber to attack, slide to confirm anything that loses decibels, +/- steppers for syntax errors, a slider for wagers.
- Every gesture must also work with a plain click, for touchpads.
- No settings, menus or jargon on the proctor screen.

## Stack
- Node.js + Express + Socket.IO + better-sqlite3 (server/)
- React + Vite, plain CSS (client/)
- Rules engine: pure functions with no I/O (shared/rules/), used by both server and client
- Tests: Vitest

## How to work
- Plan first and wait for my approval before writing code.
- Write or update tests with every rules change. Run the full test suite before saying a task is done.
- Keep changes small. Do not refactor files outside the current task.
- Do not add features that are not in docs/PLAN.md. Ask instead.
- If the spec is unclear or contradicts itself, stop and ask. Do not guess a game rule.
- When done, summarize what changed and give me exact steps to check it by hand.
```

## Build order

Do the steps in order, each in a fresh session, and don't start one until the check for the previous one passes. The rules engine comes before any screen, so every screen is built on scoring that tests already prove.

| Step | Goal | You check it by |
| --- | --- | --- |
| 0 | Project skeleton, `scoring.json`, sample CSVs | `npm test` and `npm run dev` both run. |
| 1 | Rules engine: Adagio | Reading the test names against the Adagio table. |
| 2 | Rules engine: Andante | Same, against the Andante table. |
| 3 | Rules engine: Allegro, power-ups, Vivace | Same. Compute 3 power-up cases by hand and compare. |
| 4 | Server: event log, replay, void, Socket.IO sync | Two browser windows stay in sync. Kill and restart the server; the state returns. |
| 5 | Offline queue, reconnect, timers | Turn Wi-Fi off on one laptop, tap 3 entries, turn it back on. Nothing is lost or doubled. |
| 6 | Proctor screen, with slide to attack and the other gestures | Hand it to someone who has never seen it. They score a mock Adagio and Andante with no instructions. |
| 7 | Admin console and projector | Run a phase change, a void and the power-up draft. Watch the projector from across a room. |
| 8 | Allegro grading screen, Magnum Opus, envelopes, Vivace | Grade one full 15-item sheet with each power-up. |
| 8b | Theme pass with your assets, and chamber music on the projector | Every screen uses your art. Change the leader and hear the song crossfade. |
| 9 | Standby mirror, USB export, start script, full-game replay test | Pull the host's power mid-game and promote the standby. |
| 10 | Load test and fixes on the real hotspot | 8 laptops connected, bot test passes, then the committee dry run. |

Put your art and songs in `client/assets/` before step 6, so the screens are built around them. Step 8b is the polish pass once everything works.

## Prompts

Paste one prompt per fresh session. Every prompt asks for a plan first; reply "go" once the plan looks right, or correct it.

**Step 0: skeleton**

```text
Read CLAUDE.md, docs/PLAN.md and docs/MECHANICS.md. Then set up the project skeleton only: folders server/, client/, shared/, package.json scripts (dev, test, build, start), Vitest, and a Vite React client served by the Express server. Create shared/scoring.json with every decibel value and rule switch from the plan, including a switch for each rule marked (tentative). Create sample data/chambers.csv (8 chambers) and data/questions.csv (60 Adagio questions with codes like A1-E-07). Do not write any game logic yet. Show me your plan first.
```

**Steps 1 to 3: rules engine (one movement per session)**

```text
Read CLAUDE.md and the "Rules engine by movement" and "Data model" sections of docs/PLAN.md. Build the rules engine for [ADAGIO / ANDANTE / ALLEGRO + VIVACE] in shared/rules/ as pure functions: (state, command) -> { ok, events } or { ok: false, reason }, plus a reducer (state, event) -> state. No I/O, no timers, no sockets.

First write a Vitest test for every row in that movement's table in the plan, plus every related row in "Conflict handling and edge cases". Show me the list of test names before writing the implementation. Then implement until all tests pass. All numbers must come from scoring.json.
```

**Step 4: server and sync**

```text
Read CLAUDE.md and the "Architecture" section of docs/PLAN.md. Build the server: an append-only SQLite event log (WAL mode), state rebuilt by replaying the log on start, a Socket.IO gateway that accepts commands with a unique commandId, runs them through shared/rules, appends events, and broadcasts them. Duplicate commandIds must be ignored. Add void events (never delete). Add a bare test page that shows the raw state and has a few buttons, so I can check sync in two browser windows. Include tests for replay, duplicate commands and voids. Plan first.
```

**Step 5: offline and timers**

```text
Read CLAUDE.md and the "Offline and reconnect" part of docs/PLAN.md. Add to the client: an IndexedDB queue for unsent commands, automatic resend on reconnect, catch-up from the last seen event number, a visible offline banner, and a "needs attention" tray for commands the host rejected after reconnect. Add host-controlled timers with client clock-offset measurement. Tell me exactly how to test each of these by hand with two laptops. Plan first.
```

**Steps 6 to 8: screens (one screen per session)**

```text
Read CLAUDE.md and the "Screens and roles" section of docs/PLAN.md, including "Look and feel" and "Simple scoring". List what is in client/assets/ first. Build the [PROCTOR SCREEN / ADMIN CONSOLE + PROJECTOR / ALLEGRO GRADING + MAGNUM OPUS + ENVELOPES + VIVACE] screen, themed with those assets.

Make scoring as simple as possible: only show actions valid in the current phase, as big buttons with the decibel change printed on them, using the shared rules engine for the preview. Use direct gestures where they help: slide or drag a Treble onto a chamber to attack, slide to confirm anything that loses decibels, +/- steppers for syntax errors, a slider for the wager. Every gesture needs a click fallback. Propose 2 or 3 interaction ideas of your own and let me pick.

Must work on a 13-inch laptop with a touchpad. Nothing from a CDN. Do not change the rules engine; if you think it has a bug, stop and tell me. Plan first, including a rough layout description.
```

**Step 8b: theme pass and chamber music**

```text
Read CLAUDE.md and the "Look and feel" and "Chamber music" parts of docs/PLAN.md. List everything in client/assets/ and tell me which screens still use plain or placeholder styling. Then:

1. Do a theme pass so every screen uses my assets consistently (backgrounds, fonts, chamber logos and colours), with tasteful motion on the projector leaderboard. Text must stay readable from across a room.
2. Add chamber music on the PROJECTOR screen only: play client/assets/chambers/<id>/song.mp3 for the chamber in 1st place. Crossfade about 2 seconds on a lead change. A new leader must hold 1st for a configurable time (default 10 s) before switching. On a tie for 1st, keep the current song. Loop the song. Add an "Enable sound" button for the browser autoplay rule, and volume and mute controls in the admin console. Stop the music when "hide scores" is on. Preload all songs so there is no delay.

If any chamber is missing a logo or song, list it and fall back gracefully. Plan first.
```

**Step 9: reliability**

```text
Read CLAUDE.md and the "Undo and recovery" and "Venue setup" sections of docs/PLAN.md. Add: a standby mode where a second laptop mirrors every event into its own log and can be promoted to host, an export of the log plus a standings CSV to a chosen folder, a double-click start script for Windows that restarts the server if it crashes, and a full-game replay test that plays about 400 scripted events for 8 chambers and asserts the final standings. Plan first.
```

**Step 10: load test**

```text
Write a load-test script: 8 bot clients, each sending 2 valid commands per second for 10 minutes to a server address I pass in. Report lost events, duplicated events, and median and worst latency. Then help me read the results and fix anything it finds.
```

**After any step: review prompt (fresh session)**

```text
Read CLAUDE.md and docs/PLAN.md. Review the code changed in the last commit as a strict reviewer who did not write it. Check it against the plan row by row: list every rule that is missing, wrong, or hard-coded instead of read from scoring.json, and every place that could lose or double-count an event. Do not fix anything yet; give me the list.
```

## When things go wrong

| Problem | What to do |
| --- | --- |
| A bug you can describe | Paste: "Bug: \[what I did, what I expected, what happened\]. First write a failing test that reproduces it, show me, then fix it." |
| Claude keeps failing at the same fix | Stop after two tries. Run `git reset --hard` to the last good commit, start a fresh session, and describe the goal again with what didn't work. |
| The code is drifting from the plan | Run the review prompt in a fresh session, then fix its list one item at a time. |
| The committee changes or confirms a rule | Edit `docs/PLAN.md` first. Then paste: "The rule for \[X\] changed in docs/PLAN.md. Update scoring.json, the tests, then the code. Show me which tests changed." |
| It works on your laptop but not across laptops | Check the firewall and the host IP before blaming the code. Then paste the browser console error and the server log into Claude. |
| You don't understand what Claude built | Ask: "Explain how \[feature\] works in 10 lines, and which files I would open to change it." You need this for event day. |

Freeze the code after the final dry run. On event day, the only allowed change is editing `scoring.json`.
