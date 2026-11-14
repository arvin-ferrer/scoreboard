# Get ¼: Reprise — Offline Synced Scoreboard Project Plan

Nov 3, 2026 · @Ian

## Overview and goals

We will build a scoreboard that runs on one host laptop and a Wi-Fi hotspot with no internet. Every scorer laptop and the projector connect through a browser and see the same live state within about a second. The system tracks the whole game, not only the totals: questions, Trebles, attacks, power-ups, timers and the special problems. It applies the scoring rules itself, so proctors tap what happened and the system works out the decibels.

What success looks like on event day:

- Proctors record every scoring event in two taps or fewer, and the projector updates within 1 second.
- If a laptop loses Wi-Fi, nothing it recorded is lost. It catches up by itself when it reconnects.
- If the host laptop crashes, a restart brings back the exact state in under 1 minute, and a standby laptop can take over.
- Every decibel can be traced to who entered it, when, and why. Any wrong entry can be voided with a reason.
- Nothing at the venue needs internet or an install: the scorer laptops open a URL, and that's all.
- Scoring values and rule options live in a config file, so if the committee changes a rule late, nobody has to edit code.

## Decisions so far

| Topic | Decision | Why |
| --- | --- | --- |
| Network | A laptop hotspot with no internet, run from the standby laptop rather than the host. The host gets a static IP address on the hotspot's network. | Only 7–8 laptops will connect, which fits a hotspot's limit (Windows allows 8). Keeping it off the host means a host crash doesn't take the network down too. |
| Scorer laptops | Flexible. Any laptop can score any chamber, or a laptop can be locked to the chambers assigned to it. | The proctor count isn't fixed yet. Assigning chambers to laptops is a setting, not a code change. |
| Scope | The full game state: pool, Trebles, attacks, power-ups, timers, Magnum Opus, envelopes and the Vivace tiebreak. | Proctors don't have to calculate anything. The system enforces the rules and flags anything that breaks them. |
| Stack | A Node.js server on the host, with a SQLite file and WebSockets (Socket.IO). The frontend is React built with Vite and served by the same server. | It's JavaScript all the way through, which UPLB students already know. The browser clients need nothing installed. |
| Packaging | One folder with Node and every dependency included, started by a double-click script. No CDN fonts or scripts. | It has to run with zero internet on the day. |

## Architecture

The host laptop is the single source of truth. The other laptops never write scores directly: they send commands like "Chamber 4 answered Q-M-12 correctly," and the host checks each one, logs it, then broadcasts it.

&#91;embedded content: system architecture · 1 host, N browser clients, 1 standby\]

Commands come in from the laptops on the left. Each one runs clockwise through the host's loop, and the updated state goes back out to every screen.

**How sync works**

1. A proctor taps an action. The browser gives the command a unique ID and sends it over Socket.IO.
2. The rules engine checks that the current movement and phase allow it, and that the chamber and question are in the right state. It also checks the entity version the client saw, so stale screens get rejected.
3. If the command is accepted, the host appends one event to the SQLite log (in WAL mode), updates the in-memory state, and broadcasts the event to all clients. If it's rejected, only the sender gets a plain-language reason, such as "Chamber 7 is already under attack."
4. The proctor's screen shows the change as pending until the host confirms it. On a LAN that takes under 100 ms.

**Offline and reconnect**

- If Wi-Fi drops, the browser stores unsent commands in IndexedDB and shows a red "offline" banner. When it reconnects, it resends them. The host ignores any command ID it has already seen, so nothing gets counted twice.
- On reconnect, the client sends the last event number it saw and gets back only what it missed.
- Timers run on the host. Clients measure their clock difference from the host with a ping when they connect, so every screen's countdown matches within about 100 ms.

**Undo and recovery**

- The log is never edited. To correct a mistake, someone adds a void event with a reason, and the state is recalculated. Voids in Allegro and Andante, and any void more than 2 minutes old, need the admin PIN.
- Restarting the host replays the log, so a few thousand events load in under a second. The standby laptop connects as a mirror and keeps its own copy of the log. If the host dies, the admin promotes the standby, and the clients switch to its IP address.
- At the end of each movement, the admin exports the log and a standings CSV to a USB drive.

## Data model

The event log is the only thing stored permanently. Every table below is rebuilt from it, which is what makes undo and crash recovery dependable. Chambers and the question bank are loaded once, before the event, from two CSV files.

| Entity | Key fields | Notes |
| --- | --- | --- |
| Chamber | id, name, members (2–3), runner, seat, colour | Up to 15 chambers. The runner is fixed once Adagio starts. |
| Question | code (e.g. `A1-E-07`), movement, difficulty, pool (1 or 2), status, holder, solvedBy\[\] | Status is one of: in pool, issued, Treble, retired, discarded. `solvedBy` lets the system block an attack using a Treble the defender already answered. |
| Treble | question code, owner chamber, acquiredAt | Each chamber holds 0 to 2. A chamber with 0 skips its attack. Swapping a Treble is one event. |
| Attack | sequence (1–4), attacker, defender, question, startedAt, result | Result is pending, correct, wrong, or timeout. Only one can be pending per defender. |
| Allegro sheet | chamber, 15 items (3 Easy, 5 Medium, 7 Hard), each with: outcome, syntaxErrors, powerUpTag | Outcome is correct (with a syntax-error count), incorrect (including semantic errors), unanswered, or discarded. |
| Power-up | type, copy number, owner, usedOn, wager | 15 copies in all: Pianissimo 5, Ritardando 4, Fortissimo 3, Hemiola 2, Crescendo 1. |
| Magnum Opus | submissions\[\] (chamber, server time, result), winner | Two correct submissions less than 3 seconds apart get flagged for a tiebreak. |
| Envelope | chamber, opened, result | Opened and correct is +100. Opened and wrong or late is −50. Unopened is 0. |
| Vivace | chambers, rounds\[\] (question, winner) | At most 3 questions, and each winner takes the next open podium place. It doesn't change decibels, only the final rank. |
| Timer | name, durationMs, startedAt, pausedAt | Started and paused only from the admin console. |
| Event | seq, commandId, serverTime, device, role, type, payload, voids? | The append-only source of truth. |

**Score ledger.** Each chamber's total is the sum of every decibel delta in its events. Each delta carries its movement and a reason, so the projector can show a total per movement, and the power-up draft can rank chambers by their Adagio plus Andante score.

## Rules engine by movement

The rules engine is one shared JavaScript module. The server uses it to validate commands. The client uses it to preview a result before the proctor confirms ("this will give −30 dB"). Every number lives in `scoring.json`. The tables include the committee's answers from Nov 14. Rows marked **(tentative)** aren't confirmed yet and are listed in the last section.

**Adagio: Question Pool (15 min)**

| Proctor action | Effect |
| --- | --- |
| Start Adagio | Each chamber gets an Easy starter question. The 15-minute timer starts. |
| Issue question to chamber | Blocked if the chamber already has an open question. It must answer or discard first. |
| Correct | Easy +10, Medium +20, Hard +30. If the chamber holds fewer than 2 Trebles, the question becomes a Treble. If it holds 2, the chamber can swap one out. Whichever question it doesn't keep goes back to the pool. |
| Wrong or Discard | 0 dB. The question goes back to the pool. |
| Pool empty or timer ends | The admin gets a prompt to start Andante. A chamber can enter Andante with 0, 1 or 2 Trebles. |

**Andante: Chamber Battles (3 min strategy + 4 sequences + pool)**

| Proctor action | Effect |
| --- | --- |
| Strategy timer | 3 minutes. The projector shows each chamber's Trebles. |
| Attack phase (30 s) | A chamber with at least 1 Treble must attack. A chamber with none skips this sequence. The defender's proctor records the attacker and the question. The system rejects it if the defender is already under attack, the defender has already solved that Treble, the chamber is attacking itself, or the attacker already attacked this sequence. If no valid target is left, the attack is skipped. Once a chamber is attacked, the projector shows it as locked. |
| Defense correct | The defender gets +Treble value. The attacker gains and loses nothing. The Treble moves to the defender. |
| Defense wrong or 3-minute timeout | The defender loses the Treble value, and the Treble still moves to the defender. A timeout is applied automatically when the defense timer runs out. |
| Treble lands on a chamber holding 2 | **(tentative)** The chamber can't swap. It keeps its 2 Trebles, and the incoming Treble goes back to the pool. |
| Pool question correct | Easy +5, Medium +15, Hard +20. The question becomes a Treble if the chamber holds fewer than 2. That's how a chamber refills its Trebles. Allowed while defending. **(tentative)** If the chamber already holds 2, it can't swap, and the question goes back to the pool. |
| Pool question wrong | 0 dB. The question goes back to the pool. |
| End of sequence 4 | The standings freeze for the power-up draft. |

**Allegro: Pen and Paper Coding (40 min)**

| Proctor action | Effect |
| --- | --- |
| Power-up draft | The order is lowest Adagio + Andante score first. Ties are settled by rock-paper-scissors, and the admin records who won. Each chamber picks 1 power-up from the copies that are left. |
| Declare power-up | Must happen before that item is graded. The item is tagged, and the copy is marked as used. |
| Grade item | Correct gives the base value minus 5 per syntax error, with a floor of 0 (Easy 15, Medium 30, Hard 60). Incorrect, which includes any semantic error, gives −base. Unanswered gives 0. Only incorrect answers subtract. |
| Pianissimo | Discards the item and gives +10. |
| Ritardando | +40 if the tagged Hard item is correct. No extra penalty if it's wrong. |
| Fortissimo | The chamber wagers up to 100, and never more than its current total. A correct Hard answer gives base + wager. A wrong one gives −base − wager. A chamber with 0 or fewer decibels can't pick Fortissimo in the draft. |
| Hemiola | While active, each correct Hard answer adds +15 and discards one remaining Easy item that the chamber picks. It ends at the first incorrect answer. |
| Crescendo | Discards every remaining Easy and Medium item. Every later correct Hard answer gets +5 × the number of items discarded. |
| Magnum Opus (minute 20) | The projector shows a 10-minute exclusive window. The first correct answer, by server time, gets +100. |
| Envelope (minute 35) | Proctors mark each envelope opened or unopened, then correct or wrong. Correct is +100. Wrong, or unanswered when the timer ends, is −50. |

**Definitions for proctors.** A *syntax error* is a mistake in how the code is written, like a missing semicolon or bracket. The answer still counts, at −5 per error. A *semantic error* means the logic is wrong, so the whole answer is incorrect.

**Vivace: Clincher (5 min)**

- Vivace runs only when a tie affects 1st, 2nd or 3rd place. Decibel totals don't change, only the final rank.
- The tied chambers fill the open podium places in order. The first to answer question 1 correctly takes the highest open place, question 2's winner takes the next, and so on. There are at most 3 questions.
- When only one tied chamber is left for the last open place, it takes that place without a question.
- Example: two chambers tie for 2nd. One question decides it. The winner is 2nd and the other is 3rd.
- Example: four chambers tie for 1st. Question 1's winner is 1st, question 2's is 2nd, and question 3's is 3rd. The fourth chamber doesn't place.

## Screens and roles

The same web app serves five screens. Which screen a laptop gets depends on the role picked at login and a 4-digit PIN for that role. Every action shows only the buttons that are valid for the current phase, which avoids most mistakes.

| Screen | Who | What it shows and does |
| --- | --- | --- |
| Proctor | One per chamber, or one per group of chambers | A card for each assigned chamber with its total, current question, Trebles, attack status and power-ups. There are big buttons for the actions the current phase allows, a preview of the decibel change, and a 3-second undo toast. |
| Pool desk (optional) | A committee member at the question pool | Issue a question by typing or scanning its code. Live counts per pool and difficulty. Warns when a pool is about to run out. |
| Admin console | Head proctor or tech lead | Start and stop movements and phases, control timers, assign chambers to laptops, view connected devices, void entries, run the power-up draft, export to USB, promote the standby. |
| Projector | Big screen, read-only, no login | Leaderboard with animated reordering, the movement name and a big timer. Shows the attack board in Andante and a banner during Magnum Opus. A "hide scores" switch keeps the reveal for Presto. |
| Audit log | Admin, and proctors read-only | Every event with its time, device and reason. Filter by chamber. |

Design notes for the proctor screen: it must work on small laptop screens and with touchpads. Use high-contrast buttons at least 48 px tall, and put the chamber colour on each card. A destructive action, such as a wrong answer or a timeout, needs a second tap.

**Look and feel.** The scoreboard is themed, not plain. It uses the event's own art from the `assets/` folder in the codebase: backgrounds, logos, fonts, and a logo, colour and song for each chamber. The theme follows the "Reprise" music motif, and all assets are bundled so they load with no internet.

**Simple scoring.** A proctor never types a number or does maths. Each chamber card shows only the one or two actions valid right now, as large buttons with the decibel change printed on them.

- **Slide to attack.** The proctor drags the attacker's Treble card onto the target chamber, or picks both and slides a bar to confirm. Invalid targets are greyed out.
- **Slide to confirm** replaces the second tap for anything that loses decibels.
- **Steppers and sliders.** Syntax errors use a + / − counter. The Fortissimo wager uses a slider that stops at the chamber's limit.
- Every gesture also has a plain click version, because dragging is awkward on some touchpads.

**Chamber music.** Each chamber has its own song, and the projector laptop plays the song of whichever chamber is in 1st place.

- When the lead changes, the old song fades out and the new one fades in over about 2 seconds.
- A new leader must hold 1st for about 10 seconds before the song switches, so the music doesn't flip back and forth. On a tie for 1st, the current song keeps playing.
- Browsers block sound until someone clicks the page, so the admin clicks "Enable sound" once on the projector laptop before the event.
- The admin console has volume and mute. Music stops when "hide scores" is on, or the song would give away the leader before Presto.

## Conflict handling and edge cases

The host applies commands one at a time, in arrival order. So a race between two laptops always has a single winner, and the loser gets a clear message instead of a silent overwrite.

| Situation | What the system does |
| --- | --- |
| Two proctors issue the same pool question | The first one wins. The second is told "A1-M-04 is already with Chamber 3." |
| Two attacks on one defender in the same phase | The first one locks the defender. The second attacker's proctor is told to pick another target. |
| Last attacker has only itself left as a target | The system detects that no valid target is left and skips that attack. A chamber with no Trebles also skips. |
| Defender has already solved the Treble | Rejected with "Return to runner." This is checked against `solvedBy` from every movement. |
| Double tap or resend after reconnect | The host ignores repeated command IDs. |
| A laptop goes offline mid-entry | Its entries are queued locally and sent on reconnect. If one of them is now invalid, for example the question was given to someone else, the host rejects it and the proctor sees it in a "needs attention" tray. |
| Simultaneous Magnum Opus answers | Each proctor taps "submitted" the moment the paper arrives, and the host stamps the server time. If two correct submissions are less than 3 seconds apart, the admin is asked to resolve them (Bato Bato Pick) and records the winner. |
| Grading before the power-up was declared | Blocked: a power-up can only be attached to an ungraded item. |
| Defense timer runs out while grading | If the proctor tapped "submitted" before 0:00, the grade still counts. Otherwise the timeout stands. |
| Wrong entry noticed later | The proctor requests a void, and the admin approves it with a reason. Totals recalculate everywhere. |
| Host clock or laptop clocks are wrong | Only host time is used. Client offsets are measured when each client connects. |

## Venue setup, reliability and backups

The software is the easy part. Most event-day failures come from Wi-Fi, power and sleeping laptops, so this checklist matters as much as the code.

**Hardware**

- [ ] Hotspot laptop: use the standby laptop, kept plugged in, with Mobile Hotspot on and no internet. Check that its device limit covers every other laptop. Windows allows 8.
- [ ] Host laptop with a static IP address on the hotspot's network, e.g. `192.168.137.10`, so the URL never changes.
- [ ] The projector laptop connects by HDMI.
- [ ] Extension cords so every scorer laptop stays plugged in.
- [ ] 2 USB drives for exports.
- [ ] Printed question cards, each with its code (`A1-E-07`) in large type. This is a dependency on the logistics committee.
- [ ] Backup network: a phone hotspot or a borrowed router, set up with the same network name and password, in case the hotspot laptop fails.

**Laptop prep (the day before)**

- [ ] Turn off sleep, screen lock, OS updates and VPNs on every laptop.
- [ ] On the hotspot laptop, turn off the Windows setting that switches the hotspot off when no devices are connected.
- [ ] Bookmark `http://192.168.137.10:3000`, then test it on every laptop with only the hotspot on, no internet.
- [ ] Allow the host's port through the host laptop's firewall, and set the hotspot network to Private on Windows.

**Fallbacks, from mildest to worst**

1. A laptop drops off Wi-Fi: it queues entries and resyncs on its own.
2. The host app crashes: the start script restarts it automatically, and it replays the log in seconds.
3. The host laptop dies: promote the standby. Proctors open the standby's bookmarked URL. You lose at most the last second of events.
4. Everything fails: each proctor keeps a one-page paper tally of their chambers, and the last USB export gives the numbers to restart from.

## Milestones and testing

The plan assumes 6 weeks of part-time work by 1 or 2 developers. It's counted from kickoff because the event date isn't set yet. If the event is sooner, cut the optional pool desk and the projector animations, never the dry runs.

&#91;embedded content: build roadmap · 5 phases, 3 gates, weeks counted from kickoff\]

The rules gate matters most. Week 3's rules code can't be finished until the committee answers the open questions below.

**Testing plan**

1. **Rules unit tests.** Write a scripted scenario for every row in the rules tables, e.g. "Hemiola active, Hard correct, then the Easy item auto-discards." Run them on every change.
2. **Full-game replay.** A script plays a whole 15-chamber game of about 400 events, then checks the final standings against a hand-computed spreadsheet.
3. **Load test.** 15 bot clients each send 2 commands a second for 10 minutes over the real hotspot. Pass: no lost or duplicated events, and median latency under 200 ms.
4. **Chaos tests.** Turn off Wi-Fi on one laptop mid-entry, kill the server process, and pull the host's power cord. Each time, the state has to come back exact.
5. **Dry runs with the committee.** Real proctors, real question cards, and the special problem envelopes once their contents can be shared. Time how long proctors take per action, and fix anything slower than 5 seconds.

## Committee decisions and open questions

The committee answered the rule questions on Nov 14, and each answer is now a setting in `scoring.json`. Items marked Tentative below are working answers that still need the committee's confirmation.

| Movement | Question | Decision |
| --- | --- | --- |
| Adagio | Does a wrong answer or a discard cost decibels? | No, 0 dB. |
| Adagio | At 2 Trebles with no swap, where does the new question go? | Back to the pool. |
| Adagio | What if a chamber ends with fewer than 2 Trebles? | That's allowed. A chamber with 0 can't attack. It refills from pool questions or from Trebles it's attacked with, up to 2. |
| Andante | Does the attacker gain or lose anything? | No, only the defender does. |
| Andante | How is a defense scored? | Correct is +value. Wrong or timeout is −value. |
| Andante | What if no valid target is left? | The attack is skipped. |
| Andante | Can a chamber answer pool questions while defending? | Yes. |
| Andante | Does a wrong pool answer cost decibels? | No, 0 dB. |
| Allegro | How many power-ups does each chamber get? | 1. |
| Allegro | How are ties in the draft order broken? | Rock-paper-scissors. |
| Allegro | How does the Fortissimo wager work? | It's added on top of the base score, capped at 100 and at the chamber's current total. A wrong answer loses the wager too. |
| Allegro | How does Hemiola work? | It applies to Hard questions, and the chamber picks which Easy item to discard. |
| Allegro | When does the Crescendo bonus apply? | +5 per discarded question on every later correct Hard answer. |
| Allegro | Does a wrong Ritardando answer cost extra? | No. |
| Allegro | Semantic error vs. syntax error? | A semantic error makes the answer incorrect, so it's −base. A syntax error costs −5 each, with a floor of 0. |
| All | Can a total go below 0? | Yes. |
| Vivace | What about ties of 3 or more? | At most 3 questions. Each winner takes the next open podium place. |
| Vivace | Which ties go to Vivace? | Only ties that affect the top 3. |
| Allegro | Does an unanswered item cost anything? | No. It scores 0. Only incorrect answers subtract. |
| Allegro | Can a chamber with 0 or fewer decibels use Fortissimo? | No. It must pick another power-up. |

**Still open**

- [ ] What is the event date, and when are the dry runs? This sets the timeline above.
- [ ] Which laptop runs the hotspot, and is its device limit enough for every other laptop?
- [ ] **Tentative:** A defender that already holds 2 Trebles can't swap. The Treble it's attacked with goes back to the pool.
- [ ] **Tentative:** In Andante, a chamber that already holds 2 Trebles can't swap after a correct pool answer. It still gets the decibels, and the question goes back to the pool.
