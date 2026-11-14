// Projector effects, kept free of React so it can be tested.
// Effects are display only: they never decide anything about the game.
import { rank } from './ranking.js';

// Fills any missing key in `override` from `defaults` (plain objects only; arrays are replaced whole).
export function mergeEffects(defaults, override) {
  if (!override || typeof override !== 'object' || Array.isArray(override)) return defaults;
  const out = { ...defaults };
  for (const [k, v] of Object.entries(override)) {
    const d = defaults?.[k];
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && d && typeof d === 'object' && !Array.isArray(d) ? mergeEffects(d, v) : v;
  }
  return out;
}

// Buttons in the admin preview panel. The server accepts only these ids.
export const PREVIEW_EFFECTS = [
  { id: 'streak3', label: 'Streak fire (3)' },
  { id: 'streak5', label: 'Streak fire (5)' },
  { id: 'streak7', label: 'Streak fire (7)' },
  { id: 'shake', label: 'Shake' },
  { id: 'fortissimo', label: 'Word: Fortissimo' },
  { id: 'crescendo', label: 'Word: Crescendo' },
  { id: 'encore', label: 'Word: Encore' },
  { id: 'daCapo', label: 'Word: Da Capo' },
  { id: 'newLeader', label: 'New leader' },
  { id: 'popUp', label: 'Score pop +20' },
  { id: 'popDown', label: 'Score pop −30' },
  { id: 'overtake', label: 'Overtake' },
  { id: 'goldBurst', label: 'Gold burst' },
  { id: 'noteRain', label: 'Note rain' },
  { id: 'offKey', label: 'Off-key' },
  { id: 'finalMinute', label: 'Final minute' },
  { id: 'finalTen', label: 'Final 10 seconds' },
  { id: 'curtains', label: 'Curtains' },
  { id: 'podium', label: 'Podium reveal', showsRanks: true },
];
export const PREVIEW_IDS = PREVIEW_EFFECTS.map((p) => p.id);

export const streakTier = (n, tiers) => tiers.filter((t) => n >= t).length;

const on = (cfg) => cfg && cfg.enabled !== false;

// Watches the score log and says which effects a new entry sets off.
//  reset(entries): quietly learn the log (start, reconnect). Fires nothing.
//  apply(entry):   a live entry. Returns the effects to play.
// A "streak" is a chamber's run of positive entries with no negative entry and no void of one of them.
export function createEffectsEngine({ chamberIds, config }) {
  const cfg = () => config.effects ?? {};
  let byId, voided, totals, streaks;

  const fresh = () => {
    byId = new Map();
    voided = new Set();
    totals = Object.fromEntries(chamberIds.map((id) => [id, 0]));
    streaks = Object.fromEntries(chamberIds.map((id) => [id, []]));
  };
  fresh();

  // Applies one entry to the running picture. Returns what it did, for apply() to turn into effects.
  function step(e) {
    if (byId.has(e.id)) return null;
    byId.set(e.id, e);
    if (e.voids) {
      const t = byId.get(e.voids);
      if (!t || t.voids || voided.has(t.id) || !(t.chamber in totals)) return null;
      voided.add(t.id);
      totals[t.chamber] -= t.points;
      const ended = streaks[t.chamber].includes(t.id);
      if (ended) streaks[t.chamber] = [];
      return { kind: 'void', chamber: t.chamber, streakEnded: ended };
    }
    if (!(e.chamber in totals)) return null;
    totals[e.chamber] += e.points;
    const had = streaks[e.chamber].length;
    if (e.points > 0) streaks[e.chamber].push(e.id);
    else streaks[e.chamber] = [];
    return { kind: 'add', chamber: e.chamber, points: e.points, streakEnded: e.points <= 0 && had > 0 };
  }

  return {
    reset(entries) {
      fresh();
      for (const e of entries) step(e);
    },
    streaks: () => Object.fromEntries(chamberIds.map((id) => [id, streaks[id].length])),
    apply(entry, tieOrder = []) {
      const c = cfg();
      const beforeTotals = { ...totals };
      const before = rank(chamberIds, beforeTotals, tieOrder).order;
      const did = step(entry);
      if (!did) return [];
      const out = [];
      if (did.streakEnded) out.push({ type: 'streakEnd', chamber: did.chamber });
      if (did.kind === 'void') {
        // An undo only shows rows moving. No pops, words or spotlights for a take-back.
        return out;
      }

      const id = did.chamber;
      const pts = did.points;
      const after = rank(chamberIds, totals, tieOrder).order;

      if (on(c.scorePop)) out.push({ type: 'pop', chamber: id, points: pts });
      if (pts <= (c.shake?.atOrBelow ?? -30) && on(c.shake)) out.push({ type: 'shake', chamber: id });
      if (pts >= (c.goldBurst?.atOrAbove ?? 100) && on(c.goldBurst)) out.push({ type: 'burst', chamber: id });
      if (pts >= (c.noteRain?.atOrAbove ?? 10) && on(c.noteRain)) {
        out.push({ type: 'notes', chamber: id, count: Math.min(c.noteRain.maxNotes ?? 12, Math.max(1, Math.round(pts / (c.noteRain.pointsPerNote || 10)))) });
      }
      if (pts >= (c.fortissimo?.atOrAbove ?? 100) && on(c.fortissimo)) out.push({ type: 'word', id: 'fortissimo', text: c.fortissimo.word });

      const n = streaks[id].length;
      if (on(c.streakFire) && n >= (c.streakFire.tiers?.[0] ?? 3)) out.push({ type: 'streak', chamber: id, n, tier: streakTier(n, c.streakFire.tiers) });
      if (n === (c.encore?.streak ?? 5) && on(c.encore) && pts > 0) out.push({ type: 'word', id: 'encore', text: c.encore.word });

      // Rank effects. A chamber only "passes" another if it is strictly ahead on points.
      const climbed = before.indexOf(id) - after.indexOf(id);
      if (climbed > 0) {
        const passed = before.filter((o) => o !== id && before.indexOf(o) < before.indexOf(id) && after.indexOf(o) > after.indexOf(id) && totals[o] < totals[id]);
        if (passed.length && on(c.overtake)) out.push({ type: 'overtake', chamber: id, passed });
        if (climbed >= (c.crescendo?.ranksClimbed ?? 3) && on(c.crescendo)) out.push({ type: 'word', id: 'crescendo', text: c.crescendo.word });
      }
      const leaderBefore = before[0];
      if (after[0] === id && leaderBefore !== id && totals[id] > beforeTotals[leaderBefore] && on(c.newLeader)) out.push({ type: 'newLeader', chamber: id });
      if (beforeTotals[id] < 0 && totals[id] > 0 && on(c.daCapo)) out.push({ type: 'word', id: 'daCapo', text: c.daCapo.word });
      return out;
    },
  };
}
