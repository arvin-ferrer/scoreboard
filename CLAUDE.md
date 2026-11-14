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
