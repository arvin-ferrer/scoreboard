// Shared state: current round, timer, tie-break picks. Persisted so a restart keeps it.
// All times are host time (ms since epoch).
export function createGameState(log, roundIds, clock = Date.now, chamberIds = []) {
  const saved = log.getState('game');
  const state = {
    round: roundIds.includes(saved?.round) ? saved.round : roundIds[0],
    timer: saved?.timer ?? { duration: 0, startedAt: null, pausedAt: null },
    tieOrder: Array.isArray(saved?.tieOrder) ? saved.tieOrder : [],
    scoresHidden: saved?.scoresHidden === true,
    musicVolume: Number.isFinite(saved?.musicVolume) ? Math.min(1, Math.max(0, saved.musicVolume)) : 0.7,
    musicMuted: saved?.musicMuted === true,
    effectsOn: saved?.effectsOn !== false,
    effectsIntensity: saved?.effectsIntensity === 'reduced' ? 'reduced' : 'full',
    podiumRevealed: Number.isInteger(saved?.podiumRevealed) ? Math.min(3, Math.max(0, saved.podiumRevealed)) : 0,
    defense: saved?.defense && typeof saved.defense === 'object' ? saved.defense : {}, // defender id -> attacker ids (Andante)
  };
  const save = () => log.setState('game', state);

  return {
    get: () => ({ ...state, hostNow: clock() }),
    setRound(round) {
      if (!roundIds.includes(round)) return false;
      if (round !== state.round) state.defense = {}; // attacks only last within a round
      state.round = round;
      save();
      return true;
    },
    // Starts, or resumes if paused. `durationSec` is only used on a fresh start.
    startTimer(durationSec) {
      const t = state.timer;
      const now = clock();
      if (t.startedAt !== null && t.pausedAt !== null) {
        t.startedAt += now - t.pausedAt;
        t.pausedAt = null;
      } else if (t.startedAt === null) {
        if (Number.isFinite(durationSec) && durationSec > 0) t.duration = durationSec;
        t.startedAt = now;
      }
      save();
    },
    pauseTimer() {
      const t = state.timer;
      if (t.startedAt !== null && t.pausedAt === null) t.pausedAt = clock();
      save();
    },
    resetTimer(durationSec) {
      state.timer = {
        duration: Number.isFinite(durationSec) && durationSec >= 0 ? durationSec : state.timer.duration,
        startedAt: null,
        pausedAt: null,
      };
      save();
    },
    // A proctor picked the winner of the next open place in a tie.
    pickTieWinner(chamberId) {
      if (!state.tieOrder.includes(chamberId)) state.tieOrder.push(chamberId);
      save();
    },
    // Takes back the most recent tie pick (a mis-tap).
    undoTiePick() {
      state.tieOrder.pop();
      save();
    },
    setHidden(hidden) {
      state.scoresHidden = hidden === true;
      save();
    },
    // Only the fields given are changed. Volume is kept between 0 and 1.
    setMusic(msg) {
      const { volume, muted } = msg && typeof msg === 'object' ? msg : {};
      if (typeof volume === 'number' && Number.isFinite(volume)) state.musicVolume = Math.min(1, Math.max(0, volume));
      if (typeof muted === 'boolean') state.musicMuted = muted;
      save();
    },
    // Projector effects: master switch and Full/Reduced. Only the fields given are changed.
    setEffects(msg) {
      const { on, intensity } = msg && typeof msg === 'object' ? msg : {};
      if (typeof on === 'boolean') state.effectsOn = on;
      if (intensity === 'full' || intensity === 'reduced') state.effectsIntensity = intensity;
      save();
    },
    // How many podium places the projector has revealed (0 to 3: 3rd, then 2nd, then 1st).
    setPodium(n) {
      if (!Number.isInteger(n) || n < 0 || n > 3) return false;
      state.podiumRevealed = n;
      save();
      return true;
    },
    // Andante: who is attacking a chamber, at most 2 at a time. An empty list clears that chamber.
    setDefense(defender, attackers) {
      const ok = chamberIds.includes(defender) && Array.isArray(attackers) && attackers.length <= 2
        && new Set(attackers).size === attackers.length && attackers.every((a) => a !== defender && chamberIds.includes(a));
      if (!ok) return false;
      if (attackers.length) state.defense[defender] = attackers; else delete state.defense[defender];
      save();
      return true;
    },
    clearDefense() {
      state.defense = {};
      save();
    },
    clearTieOrder() {
      state.tieOrder = [];
      save();
    },
  };
}
