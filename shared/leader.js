// Decides which chamber's song should play. Pure logic so it can be tested without a browser.
//
// Rules (docs/PLAN.md, "Chamber music"):
//  - The first song starts at once, when one chamber is alone in 1st.
//  - A different leader must stay alone in 1st for holdMs before the song switches.
//    If it loses 1st before then, the wait starts over.
//  - On a tie for 1st, the current song keeps playing, and a silent projector stays silent.
//
// totals: { chamberId: number }. now: ms from any steady clock. Returns the chamber to play, or null.
export function createLeaderTracker({ holdMs = 10000 } = {}) {
  let current = null;
  let candidate = null;
  let since = 0;

  return {
    update(chamberIds, totals, now) {
      if (chamberIds.length === 0) return current;
      const score = (id) => totals[id] ?? 0;
      const top = Math.max(...chamberIds.map(score));
      const leaders = chamberIds.filter((id) => score(id) === top);

      if (leaders.length > 1) { candidate = null; return current; } // tie: change nothing
      const leader = leaders[0];
      if (leader === current) { candidate = null; return current; }
      if (current === null) { current = leader; candidate = null; return current; }

      if (candidate !== leader) { candidate = leader; since = now; }
      if (now - since >= holdMs) { current = leader; candidate = null; }
      return current;
    },
    // Forget the current song, so the next single leader starts at once (used after a pause).
    reset() { current = null; candidate = null; },
    get current() { return current; },
  };
}
