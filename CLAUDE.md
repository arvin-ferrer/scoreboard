# Get One Fourth Scoreboard

Offline LAN scoreboard for a face-to-face programming contest. Spec: docs/PLAN.md. Read it before planning any work. docs/MECHANICS.md is only a reference for what the point values mean.

## What this is
- ONLY a scoreboard. Scorers add or subtract points for a chamber. Human proctors do all checking in person.
- Do NOT enforce, validate or track game rules: no question pool, Trebles, attacks, power-ups or rule engine.
- A chamber's total = the sum of its entries that are not voided. Totals may be negative.

## Hard constraints
- Runs with NO internet on event day. Never load anything from a CDN or external URL. Fonts, scripts, styles, images and audio are bundled.
- One host laptop runs the server. All other laptops use only a browser.
- The score log (SQLite) is append-only. Never edit or delete entries. Undo adds a void entry. Totals are rebuilt by replaying the log.
- Each entry has a unique ID made by the client. The host ignores duplicate IDs.
- Quick-button point values live in shared/scoring.json, per round. Never hard-code them.
- Timers use host time only.

## Design and assets
- This is NOT a plain scoreboard. It is themed around the event ("Get One Fourth: Reprise", a music motif).
- Use the assets in client/assets/. Look at what is there before designing:
  - client/assets/ui/ : backgrounds, frames, logos, fonts
  - client/assets/chambers/<chamber-id>/ : logo.png, song.mp3
- Never invent placeholder art when a real asset exists. If an asset is missing, list it and ask me.

## Scoring UX
- Two taps to score: pick the chamber, tap the points.
- Big buttons (48 px or taller) that show their value. Subtract buttons look different from add buttons.
- No menus, settings or jargon on the scorer screen. Works on a 13-inch laptop with a touchpad.

## Stack
- Node.js + Express + Socket.IO + better-sqlite3 (server/)
- React + Vite, plain CSS (client/)
- Tests: Vitest

## How to work
- Plan first and wait for my approval before writing code.
- Keep it simple. Prefer the smallest solution that works. Do not add features that are not in docs/PLAN.md. Ask instead.
- Run the tests before saying a task is done.
- When done, summarize what changed and give me exact steps to check it by hand.