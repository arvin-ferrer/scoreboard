# Event-day runbook

A checklist in time order for the admin / tech lead. Tick each line. Button names are exactly as shown on screen. Commands are for the Windows host laptop unless marked.

Laptops named here:

- **Host**: runs the scoreboard server. Everyone's browser talks to it.
- **Standby**: an identical copy of the scoreboard folder, Node installed, ready to take over. Per the plan it also runs the Wi-Fi hotspot.
- **Projector laptop**: on HDMI, with speakers, shows `/projector`.
- **Scorer laptops**: one per proctor station, show `/`.
- **Admin laptop**: shows `/admin`. Can be the host itself.

Port is **3000** on the host (change with the `PORT` environment variable only if you must; the firewall script and this runbook assume 3000).

---

## The day before

### Software on the host and the standby

- [ ] Node.js is installed. In a Command Prompt, `node --version` prints `v22` or `v24`. (Tested with v22.23.1 on Windows and v24.17.0 in WSL.)
- [ ] The whole scoreboard folder is on both laptops, **including** `node_modules` and `client/dist`. If either is missing, run these once, on the internet:

  ```bat
  npm install
  npm run build
  ```

  Expected: `npm run build` ends with `✓ built in` and `client\dist\index.html` exists. The start script refuses to run without them and prints which one is missing.
- [ ] `npm test` passes: `Test Files 14 passed`, `Tests 95 passed`.
- [ ] `shared/settings.json`: change `adminPin` from the committed default to a PIN only the admins know. Set `backupDir` to a folder on the USB drive, e.g. `E:\\scoreboard-backup` (two backslashes inside JSON). Copy the same file to the standby.
- [ ] `data/chambers.csv` has the final chamber names and colours. Logos (and songs, if any) are in `client/assets/chambers/<id>/`. See [Configuration](configuration.md#chamberscsv).
- [ ] `shared/scoring.json` button values match the final mechanics. Restart the server after any edit.
- [ ] **Clear the test scores.** The score log cannot be edited, so start the event with a fresh file. With the server stopped, rename `data\scores.sqlite` on **both** laptops:

  ```bat
  ren data\scores.sqlite scores.before-event.sqlite
  ```

  The server creates a new empty log on the next start. **Warning:** as of this writing `data/scores.sqlite` in this folder holds 11 test entries and 3 tie picks. If you skip this step, the event starts with those scores on the board.
- [ ] Use a **fresh, empty backup folder** on the USB drive, so a restore can never pick up a backup from testing.
- [ ] Firewall, once per laptop that might be the host (host and standby): double-click `allow-firewall.bat`, accept the administrator prompt. Expected: `Done. Other laptops on the hotspot can now open the scoreboard on this laptop.` It opens TCP port 3000 for all network profiles.
- [ ] Commit the working tree (developer). See [Analysis](ANALYSIS.md): the last steps of the build exist only as uncommitted files.

### Hotspot and addresses

- [ ] On the hotspot laptop (standby), turn on Windows **Mobile hotspot** with a network name and password. Write both on the admin's card. Windows allows 8 connected devices. Turn off the hotspot's power-saving option that switches it off when no device is connected. *TODO: verify the exact toggle name on the actual laptop's Windows version.*
- [ ] The hotspot laptop and the host stay plugged in. Turn off sleep, screen lock, automatic updates and VPNs on every laptop.
- [ ] Give the host a fixed address on the hotspot network, e.g. `192.168.137.10`, so bookmarks keep working after a restart. Windows Mobile hotspot uses the `192.168.137.x` range and the hotspot laptop is `192.168.137.1`. *TODO: verify the static-IP steps on the real host (Wi-Fi network properties, IP assignment: Manual).* If you skip this, the start script still prints the host's current address every time; you would re-share it after any reconnect.
- [ ] Start the scoreboard on the host (next section), then from a **second** laptop on the hotspot only, with no other network, open the URL the start window shows. The scorer screen must appear. If not, see [Troubleshooting](troubleshooting.md#a-laptop-cant-reach-the-host).
- [ ] Bookmark on every laptop: scorers `http://192.168.137.10:3000/`, projector `http://192.168.137.10:3000/projector`, admin `http://192.168.137.10:3000/admin`, history `http://192.168.137.10:3000/history` (replace the address with the host's real one).
- [ ] Prepare the fallback network: a phone hotspot with the **same** name and password. Remember the host's address will differ on it.
- [ ] Print the [Scorer guide](scorer-guide.md) for each station.

---

## One hour before

### Start the host

- [ ] Plug in the USB backup drive. Check its letter matches `backupDir` in `shared/settings.json`.
- [ ] Hotspot on. Host connected to it.
- [ ] Double-click `start-scoreboard.bat` on the host (from Windows Explorer, not from WSL). Expected in the window:

  ```text
  Starting the scoreboard. Close this window to stop it.
  Scoreboard server on port 3000. 0 entries replayed from C:\...\data\scores.sqlite
  Backing up every minute to E:\scoreboard-backup
  ================================================================
    Scoreboard is running.
     SCORERS OPEN:  http://192.168.137.10:3000
  ================================================================
  ```

  The hotspot address (`192.168.137.x`) is listed first when there is more than one. `0 entries replayed` confirms the log is fresh. If you see `WARNING: no backup folder set`, stop (close the window), fix `backupDir`, start again.
- [ ] Leave this window open all day. Closing it stops the scoreboard. If the server crashes, the window prints `Server stopped (exit code …). Restarting in 2 s` and restarts by itself. Scores are kept.
- [ ] Check the USB drive: `scores-latest.sqlite` and `standings-latest.csv` appeared within a minute, plus a `backup-<date>-<time>` pair.

### Admin

- [ ] Open `/admin` on the admin laptop, enter the PIN, **Unlock**.
- [ ] **Round**: tap **Adagio**.
- [ ] **Timer**: tap the round's length (e.g. **15 min**). Do not start yet.
- [ ] **Scores on the projector**: decide. **Hide scores** if the leaderboard should stay secret until a reveal; otherwise leave **Showing**.
- [ ] **Effects on the projector**: **Full** unless the projector laptop is weak, then **Reduced**.
- [ ] **Missing chamber files** box: if it lists chambers, those have a number disc instead of a logo and/or no music. Accept or add the files now (reload the projector afterwards, no restart needed).

### Projector

- [ ] Open `/projector` on the projector laptop. Press F11 for full screen. Move the mouse out of the way.
- [ ] Tap **Enable sound** in the bottom-right corner. The button disappears. Without this, there is no music all day.
- [ ] On the admin screen, set **Volume** and check **Mute** is off. From the **Effects preview** box, tap **Curtains** and **Gold burst** and confirm they play on the projector.
- [ ] Read the board from the back of the room.

### Scorers

- [ ] Each scorer laptop opens `/` from the bookmark. The round name **Adagio** shows at the top. There is no red bar.
- [ ] Admin: **Connected laptops** lists every scorer (e.g. **Scorer AB12**), the projector and the admin. Count matches.
- [ ] **Test entry and undo**, from one scorer laptop: tap **Chamber 1**, tap **+10**. The total shows 10 on the scorer, admin and projector screens. Tap **Undo** on the message. Total returns to 0. The admin's **All entries** shows the row crossed out with **— voided**. This leaves two harmless rows in the log; do not try to remove them.
- [ ] **Offline test**, one laptop: turn its Wi-Fi off, tap **+20** on a chamber. The red bar appears with **(1 waiting)**. Turn Wi-Fi on. The bar turns yellow **Sending… 1** and disappears, and the entry shows on the projector exactly once. Undo it.
- [ ] Hand each scorer the printed guide.

---

## During each round

### Any round

- [ ] Admin: tap the round in **Round**. Scorer screens switch at once. The projector plays the curtains.
- [ ] Set the length and tap **Start**. **Pause** / **Resume** as the proctors direct. Do not tap a length button while the timer runs: it stops the timer.
- [ ] Glance at **Connected laptops** every few minutes. A red **· N unsent** that does not shrink means a scorer laptop is offline: send someone.
- [ ] Wrong entry reported by a proctor: find it in **All entries** (filter by chamber), tap **Undo**, have the scorer enter the correct points.
- [ ] Never edit files or restart the server mid-round unless it has crashed. If the start window shows it restarting, wait 5 seconds and check a scorer screen: totals return by themselves.

### Adagio, Andante, Allegro

Scorers use the quick buttons; see the [Scorer guide](scorer-guide.md). Anything without a button (Fortissimo wager, Crescendo bonus) goes through the **Custom** pad.

### Vivace (tiebreak)

- [ ] Switch the round to **Vivace**. Scorers see **No scoring this round**.
- [ ] If the **Tied chambers** box lists a tie for place 1, 2 or 3, the proctors run the speed round. Tap the winner of the open place. Repeat until the box says **No tie for a podium place.**
- [ ] If the box already says **No tie for a podium place.**, there is nothing to do.

### Awarding

- [ ] **Reveal scores** if they were hidden.
- [ ] Switch the round to **Awarding**. The projector shows three empty plinths.
- [ ] **Podium reveal**: tap **Reveal 3rd place**, then **Reveal 2nd place**, then **Reveal 1st place**, on the MC's cue. Confetti falls for 1st.

---

## After the event

- [ ] In the start window press Ctrl+C, or close the window. The server writes one last backup before it exits.
- [ ] On the USB drive, copy `standings-latest.csv` (final ranks and totals, opens in Excel) and `scores-latest.sqlite` (the complete log) somewhere safe. Keep the stamped `backup-<date>-<time>` copies too.
- [ ] Keep `data\scores.sqlite` on the host unchanged. It is the original log.
- [ ] Note anything that went wrong in [ANALYSIS.md](ANALYSIS.md) or an issue for next year.

---

## If the host laptop dies

Full steps in [Troubleshooting](troubleshooting.md#the-host-laptop-died-recover-on-the-standby). Short form:

1. Move the USB drive to the standby.
2. Double-click `restore-from-backup.bat`. Type the backup folder (e.g. `E:\scoreboard-backup`), answer `y` to replace scores on this laptop if asked.
3. Read the URL it prints and tell every scorer and the projector to open that address. Re-tap **Enable sound** on the projector. Admin logs in again.
