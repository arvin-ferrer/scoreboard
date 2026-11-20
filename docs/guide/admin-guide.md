# Admin guide

The admin screen controls the round, the timer, what the projector shows, undo of any entry, tie-break order and the projector's music and effects. One admin laptop is enough. Several admin tabs work, but keep it to one person.

Related: [Event-day runbook](event-day-runbook.md) for the order of the day, [Troubleshooting](troubleshooting.md) when something is wrong, [Configuration](configuration.md) to change the PIN or button values.

## Open the admin screen

1. On any laptop on the hotspot, open `http://<host-address>:3000/admin`, for example `http://192.168.137.10:3000/admin`.
2. Type the PIN in the **PIN** field and tap **Unlock**. The PIN is set in `shared/settings.json` (see [Configuration](configuration.md#admin-pin)).
3. The PIN is remembered in that browser tab until the tab is closed. Closing the tab logs you out.

**Wrong PIN. Try again. (After 5 wrong tries, wait 10 seconds.)** The lock applies to everyone, not just your laptop: five wrong tries from any laptop block all admin logins for 10 seconds. The correct PIN also fails during those 10 seconds.

The top bar shows **Connected** or **Offline**, and links to the **Projector**, **History** and **Scorer** screens.

## Round

One button per round: **Adagio**, **Andante**, **Allegro**, **Vivace**, **Awarding**. The current one is highlighted.

Tapping a round changes every scorer screen at once to that round's buttons. The projector closes its curtains, shows the new round name, and opens again. The round survives a host restart.

- **Vivace** and **Awarding** have no scoring buttons. Scorer screens say **No scoring this round**.
- **Awarding** also switches the projector from the leaderboard to the podium (see [Podium reveal](#podium-reveal)).

Entries are stamped with the round that was current when the scorer tapped. Switching rounds never changes totals.

## Timer

The timer runs on the host's clock, so every screen shows the same time.

1. Tap a length: **30 s** (Andante attack phase), **3 min** (strategy, Andante defense), **5 min** (Vivace), **15 min** (Adagio, Andante), **40 min** (Allegro). (The list comes from `timerPresetsMinutes` in settings.) This sets the timer and stops it if it was running.
   For any other length, type minutes and seconds in the boxes under the presets (for example **7** min **30** s, up to 3 hours) and tap **Set** or press Enter. It works like a preset: it sets the timer and stops it if it was running.
2. Tap **Start**. While running, the button becomes **Pause**. After a pause it becomes **Resume**.
3. **Reset** stops the timer and puts it back to the chosen length.

**Start** is greyed out until a length has been chosen.

**Tapping a length while the timer is running stops it.** To change the length mid-round, pause first, or accept the restart.

On the projector, the timer turns red in the last 10 seconds and blinks at 0:00. The timer never scores anything and never ends a round by itself.

## Defending against (Andante)

Shows on the projector, under the attacked chamber: "Defending against Chamber 2, Chamber 3". Display only; scores still come from the scorers.

1. Pick the **Defender**, then the **Attacker**, then tap **Add**. A chamber can have at most 2 attackers.
2. When a defense ends, tap **Clear** next to that chamber. At the start of a new sequence, tap **Clear all**.
3. Changing the round clears everything by itself.

## Scores on the projector

Shows **Showing** or **Hidden**. Tap **Hide scores** / **Reveal scores**.

On the projector, the top 3 rows are taller, with a gold, silver or bronze rank badge, border and glow, and a thin gold line sits under 3rd place. A place that is still tied gets no medal until you settle it under **Tied chambers**. While scores are hidden there are no medals and all rows are the same size.

While hidden:

- The projector shows **?** instead of totals, no rank numbers, and the chambers in their list order (so the order gives nothing away).
- Music stops, because the song would reveal the leader.
- No visual effects play.
- The podium cannot be revealed.

Scorer screens are not affected: scorers always see totals. The hidden state survives a restart.

## Undo any entry

Scroll to **All entries** at the bottom. It is the same table as the History screen, plus an **Undo** button on each row.

1. Pick a chamber in the **Chamber** drop-down to shorten the list, or leave **All chambers**.
2. Find the row. Columns: **Time**, **Chamber**, **Points**, **Why** (the button label, or **Custom**), **Round**, **Device** (a 4-character code for the scorer's browser; the same codes appear in [Connected laptops](#connected-laptops)).
3. Tap **Undo** on that row.

The row turns grey and crossed out with **— voided** after its label, and the chamber's total drops by that amount. The **Undo** button on a voided row is disabled. Nothing is ever deleted: an undo is a new entry that cancels the old one. An undo cannot itself be undone. If you undid the wrong entry, enter the points again from a scorer screen.

Entries marked **(not sent yet)** belong to this admin laptop's own unsent queue (only possible if you also scored from this browser while offline).

## Tied chambers (Vivace)

The projector ranks chambers by total. Chambers with the same total share a place. When a tie affects 1st, 2nd or 3rd place, this box lists it:

> Tied for place 2 at 120 points. Tap the winner of place 2:

followed by one button per tied chamber. The projector marks these chambers **tied**.

1. Proctors run Vivace in person.
2. Tap the chamber that won the open place. It moves to that place on the projector. If more chambers are still tied for the next place, the box asks again.
3. **Undo last pick** takes back the most recent tap. **Clear all picks** removes them all.
4. **Picked so far:** lists the winners in order.

Picks only change the order on the projector and in the standings CSV. Totals never change. Picks survive a restart. Ties for 4th place or lower are not asked about: those chambers stay in id order.

A pick is remembered, but it only takes effect while those chambers are actually tied. If a later score change ends the tie, the pick does nothing. If the same chambers tie again, the old pick applies again, so use **Clear all picks** before a fresh Vivace.

## Podium reveal (Awarding)

The projector shows the podium (three plinths) only while the round is **Awarding**. In any other round the box says so: *The projector shows the podium in the Awarding round (now: Allegro)*.

1. Make sure scores are **Showing** and the **Tied chambers** box says **No tie for a podium place.** Otherwise the reveal button is disabled and the box says **Reveal scores first.** or **Settle the tied podium places first.**
2. Switch the round to **Awarding**. The projector shows three empty plinths.
3. Tap **Reveal 3rd place**. The projector shows the chamber's logo, name and total on the 3rd plinth.
4. Tap **Reveal 2nd place**, then **Reveal 1st place**. First place gets confetti.
5. **Hide podium** puts all three back to empty, for a re-run.

The reveal count survives a restart and a projector reload (the revealed places just appear without animation).

## Music on the projector

The projector laptop plays the song of the chamber in 1st place, looping. A new leader must stay alone in 1st for 10 seconds before the song switches, with a 2-second crossfade. On a tie for 1st the current song keeps playing.

Admin controls:

- **Volume** slider (0 to 100%).
- **Mute** / **Muted. Tap to unmute**.

The projector laptop must have had one click on the page: tap **Enable sound** in the bottom-right corner of the projector screen once after it loads. Browsers block sound until then. The button disappears after the click.

Music stops while scores are hidden and resumes when they are revealed.

**Songs are files.** A chamber with no `song.mp3` has no music. The **Missing chamber files** box (see below) lists them. As of this writing, no chamber has a song file, so there is no music until the files are added. See [Configuration](configuration.md#chamber-assets).

## Effects on the projector

Visual effects are for show only. They never change a score.

- **Turn effects off** / **Turn effects on**: the master switch. Off leaves the plain leaderboard. Rows still slide to their new rank.
- **Full** / **Reduced**: Reduced removes shaking, the red flash and sweeping words, and uses far less confetti. Use it if the projector laptop stutters.

Both survive a restart. Thresholds, words and per-effect switches are in `shared/effects.json` (restart the server after editing). What plays, in brief: a points pop and count-up on every live entry, flames on a run of 3, 5 or 7 positive entries, a shake and red flash at −30 or worse, word flashes (FORTISSIMO! at +100, CRESCENDO! on a 3-place climb, ENCORE! at a streak of 5, DA CAPO! when a total climbs from below 0 to above 0), a spotlight on a new leader, an overtake trail, gold confetti at +100, music notes, a grey "off-key" look while a total is below 0, a pulsing timer and metronome in the final minute, curtains on a round change, and the podium.

Effects play only for live entries. A reload or reconnect of the projector shows the current board quietly. Undo moves rows but plays no pop or word.

## Effects preview

Test buttons that play one effect on the projector with the chamber chosen under **Show it on**. Nothing is scored or stored.

Previews play even when effects are off and ignore the per-effect switches in `effects.json`. **Full**/**Reduced** still applies. **Podium reveal** is disabled while scores are hidden, because it shows the real top three. **Curtains** shows the current round name.

## Connected laptops

Lists every open scoreboard screen as **Scorer AB12**, **Admin 9F3K**, **Projector …** or **History …**, with **here since** and the time it connected. The code is the browser's device code and matches the **Device** column in the entry tables.

A laptop with unsent entries shows **· 3 unsent** in red. That laptop is offline or was until a moment ago. If the number does not fall within a minute, go to that laptop (see [Troubleshooting](troubleshooting.md#the-offline-banner-wont-clear)).

A laptop disappears from the list when its tab is closed or its connection drops.

## Reset scores
At the bottom of the admin screen. **Reset all scores…**, type `RESET`, then **Reset all scores**. Every chamber goes back to 0 on every screen, and tie picks and the podium reveal are cleared. Nothing is deleted: each old score gets a void entry, so History still shows it struck through. There is no undo. Scorer laptops that were offline with unsent scores will still send them when they reconnect, so reset only when every laptop shows no unsent entries.

## Chamber names
Type a new name in a chamber's box, then **Save** (or press Enter). The name changes on every screen at once and is saved to `data/chambers.csv`, so it survives a restart. Scores stay with the chamber: they are stored under its id (`c01`–`c15`), which never changes. Names are 1–60 characters, with no double quotes.

## Missing chamber files

Appears only when a chamber has no logo or no song file. Chambers without a logo show a coloured disc with their number. Chambers without a song play nothing. Add the files to `client/assets/chambers/<id>/` and reload the projector; no rebuild or restart is needed.

## History screen

`http://<host-address>:3000/history` is a read-only copy of **All entries**, with the chamber filter, for anyone who wants to check. It has no undo. Undo lives on the admin screen.
