# Troubleshooting

Symptom, likely cause, fix. Quick checks first.

**Thirty-second health check**

1. On the host, the `start-scoreboard.bat` window is open and its last block says `Scoreboard is running.`
2. On the host, open `http://localhost:3000/api/health`. Expected: `{"ok":true}`.
3. On the admin screen, the top bar says **Connected** and **Connected laptops** lists everyone.

---

## A laptop can't reach the host

**Symptom:** the browser shows "This site can't be reached", or the scoreboard says **Connecting…** forever.

| Cause | Check | Fix |
| --- | --- | --- |
| Not on the hotspot | Wi-Fi icon on the laptop | Connect to the event hotspot. Some laptops jump to a remembered network. |
| Wrong address | Compare with the start window's `SCORERS OPEN:` line | Type the address exactly, including `:3000`. The host's address can change if it reconnected and has no fixed IP; re-read it from the start window. |
| Windows firewall on the host | Does `http://localhost:3000` work **on the host** but not from another laptop? | Double-click `allow-firewall.bat` on the host, accept the admin prompt, reload. It opens TCP 3000 for every network profile. |
| Server not running | The start window is closed or shows an error | Double-click `start-scoreboard.bat`. Scores are on disk; nothing is lost. |
| Server started inside WSL | The start window is a Linux shell | Close it. Start from Windows (double-click the `.bat`). A server inside WSL is not reachable from hotspot devices. |
| Hotspot laptop asleep or hotspot off | Other laptops also lost Wi-Fi | See [The hotspot dropped](#the-hotspot-dropped). |
| Hotspot full | 9th device cannot join | Windows Mobile hotspot allows 8 devices. Drop a non-essential one (e.g. the history screen). |

The host's own address is printed by the start script. To find it by hand on Windows: `ipconfig` and look for the Wi-Fi adapter's IPv4 address, usually `192.168.137.x` on a Windows hotspot.

## The offline banner won't clear

**Symptom:** a scorer screen keeps the red bar **Offline. Your entries are saved …** or the yellow **Sending… N** does not count down.

Unsent entries are stored in that browser and are safe as long as the tab is not cleared. Do not re-enter them.

1. Check the laptop is on the hotspot (above). The bar clears within a few seconds of reconnecting.
2. If the yellow **Sending…** bar is stuck: the host is reachable but is not answering. Check the host's start window for a crash loop (`Restarting in …`). Wait for `Scoreboard is running.`
3. Reload the page (F5). The unsent entries survive a reload and are sent again. Nothing is counted twice: the host ignores an entry id it has already stored.
4. If the laptop must be replaced, keep the old one open until its bar is gone. Closing the tab keeps the queue; clearing browser data loses it.

On the admin screen, **Connected laptops** shows **· N unsent** next to the laptop, so you can watch it drain.

## Scores look wrong or doubled

**Symptom:** a chamber's total is not what the proctor's paper says.

- **Two scorers entered the same answer.** Both rows show under the card and in **All entries** with different **Device** codes. Admin: tap **Undo** on one. (Scorers can also undo from the card.)
- **A tap on the wrong chamber.** Undo it, enter it on the right chamber.
- **Undo did not "work".** Undo adds a cancelling row; the original stays visible, crossed out, and the total drops. The **Undo** button on a voided row is disabled. If it looks un-undone, the scorer may have tapped the points again after undoing.
- **Different totals on two screens.** Reload the screen that looks wrong. Every screen rebuilds its totals from the host's log on connect. Scorer screens also count their own unsent entries, so an offline scorer sees a total the projector does not have yet.
- **An entry from an earlier round shows the wrong round.** Entries carry the round that was current when tapped. Offline laptops keep the round they last saw. This affects only the label, not the total.

The log is append-only; a double entry can never be silently removed, only cancelled. That is intended.

## The host crashed

**Symptom:** the start window prints `Server stopped (exit code 1). Restarting in 2 s (restart #1). Scores are kept.`

- One restart: nothing to do. Totals return from the log in a few seconds; every screen reconnects on its own and shows the board again. Scorer entries made during the gap are queued and sent.
- Keeps restarting: after 5 stops in 30 seconds it waits 10 seconds between tries and prints `It keeps stopping. If another scoreboard window is already open on this laptop, close it.` The usual cause is a second server already using port 3000 (a second start window, or an `npm start` in a terminal). Close the extra one. Another cause: a damaged `shared/*.json` after an edit. Read the error above the restart line; fix the file; the next restart picks it up.
- `The server could not start because of a setup problem … Not restarting.`: a bad command-line option or a failed restore. Read the message, fix, start again.
- The window itself closed: double-click `start-scoreboard.bat` again.

The log is written to disk on every entry, so a crash loses nothing that was acknowledged. A scorer whose entry was in flight sees it stay in the yellow **Sending…** bar until the host is back, then it is sent.

## The host laptop died (recover on the standby)

**Symptom:** the host is off and will not come back soon.

You need: the standby with the scoreboard folder (`node_modules` and `client/dist` included) and Node installed, plus the USB backup drive. The backup is at most one minute old.

1. Plug the USB drive into the standby.
2. Double-click `restore-from-backup.bat`.
3. At `Backup folder, e.g. E:\scoreboard-backup :` type the folder (or a specific `backup-<date>-<time>.sqlite` file inside it). Press Enter.
4. At `Replace scores already on THIS laptop? (y/N)`: answer `y` if the standby already has a `data\scores.sqlite` with entries (old test scores). Its old file is kept as `data\scores.before-restore-<time>.sqlite`. Answer `N` only if you are not sure what is on it and want to stop and look.
5. Expected:

   ```text
   Restored 312 entries from E:\scoreboard-backup\scores-latest.sqlite (last entry: 11/21/2026, 2:14:05 PM).
   Scoreboard server on port 3000. 312 entries replayed from C:\...\data\scores.sqlite
   Backing up every minute to E:\scoreboard-backup
   ...
     Scoreboard is running.
      SCORERS OPEN:  http://192.168.137.23:3000
   ```

   If instead you see `RESTORE FAILED: This laptop already has scores (…)`, run it again and answer `y`. If you see `RESTORE FAILED: Backup not found`, check the drive letter.
6. Make sure `allow-firewall.bat` was run on the standby at some point (do it now if not).
7. Tell every scorer and the projector the **new** address. They open it; scorers' unsent entries from the last minute re-send automatically, and the host ignores anything it already has. Entries acknowledged in the last minute before the crash but after the last backup are **lost** and must be re-entered from the proctors' paper: compare the admin's **All entries** with the paper for that minute.
8. Admin logs in again at the new address. Projector: F11, **Enable sound**.

If the standby is also the hotspot laptop, nothing changes for the network. If the dead host was the hotspot, start the fallback hotspot first.

The old host's `data\scores.sqlite` is still the fullest log. If the laptop comes back later, keep that file; do not start the server on it again during the event, or you will have two diverging logs.

## No sound on the projector

Checklist, in order:

1. **Enable sound** was tapped on the projector laptop after the page loaded. It must be tapped again after every reload or reconnect of that page. If the button is not visible, it has already been tapped.
2. The admin's **Music on the projector** is not **Muted. Tap to unmute** and **Volume** is above 0.
3. Scores are **Showing**. Music is silent while scores are hidden.
4. A chamber is alone in 1st place. On a tie for 1st, the song does not switch, and if nothing was playing yet, it stays silent.
5. The leading chamber has a song file. The admin's **Missing chamber files** box lists chambers with no `song.mp3`. **As of this writing, no chamber has a song file, so there is no music at all until files are added** to `client/assets/chambers/<id>/song.mp3`. Reload the projector afterwards.
6. Laptop volume, HDMI audio output and speaker power.
7. A new leader must hold 1st for 10 seconds before the music switches, with a 2-second crossfade. Wait.

## The hotspot dropped

**Symptom:** every laptop shows the red offline bar at once; the projector says **Connecting…**.

1. Scorers keep scoring. Their entries queue on each laptop.
2. On the hotspot laptop: wake it, turn **Mobile hotspot** back on. Windows turns it off when it sleeps or when no device is connected (turn that power-saving option off, see the runbook).
3. If it will not come back, start the fallback hotspot with the **same name and password**. Laptops reconnect on their own. The host gets a new address on the new network unless it has a fixed IP there; read the host's start window (restart it to reprint the URL, or run `ipconfig`) and share the new address.
4. Once laptops reconnect, watch **Connected laptops** until no **unsent** badge remains.

## Other things you may see

| Message or symptom | Meaning | Fix |
| --- | --- | --- |
| `WARNING: no backup folder set.` in the start window | `backupDir` is empty and `--backup-dir` was not given | Stop, set `backupDir` in `shared/settings.json`, start again. Without this, a dead host means lost scores. |
| `BACKUP FAILED (scoring continues): … Is the backup folder available?` | The USB drive is unplugged or full | Plug it in. Backups resume on the next minute (`Backup OK`). Scoring is unaffected. |
| `Missing chamber files (fallbacks will be used): c01 song, …` | Logos or songs absent | Normal if you have no songs. Add files to `client/assets/chambers/<id>/` and reload the projector. |
| `Client not built yet. Run: npm run build` in the browser | `client/dist` is missing | Run `npm run build` once (needs the dev dependencies installed). |
| `Dependencies are missing: run "npm install" once (needs internet) or copy the full folder.` | `node_modules` is missing on this laptop | Copy the full folder from the other laptop, or `npm install` with internet. |
| `Node.js is not installed on this laptop.` | `node` not on PATH | Install Node.js (22 or 24) and open a new window. |
| **Wrong PIN. Try again. (After 5 wrong tries, wait 10 seconds.)** with the right PIN | Someone (anyone) typed 5 wrong PINs; the lock is global | Wait 10 seconds and retry. |
| **Start** on the timer is greyed out | No length chosen | Tap a length (e.g. **15 min**) first. |
| Timer jumped back to full | Someone tapped a length button while it was running | Tap **Start** again. |
| **Reveal 3rd place** is greyed out | Scores hidden, or a podium tie is open | **Reveal scores**; settle the tie in **Tied chambers**. |
| Podium not on the projector | Round is not **Awarding** | Switch the round. |
| Projector rows jump without animation after a reload | Normal: a reconnect shows the board quietly | None. |
| Scorer screen buttons greyed out | No chamber selected, or round is Vivace/Awarding | Tap a card; or wait for the next round. |
| The entry table's **Device** column shows codes like `9WWQ` | The scorer browser's device code | Match it against **Connected laptops**. |
