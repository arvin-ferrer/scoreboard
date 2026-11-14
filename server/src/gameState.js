// Shared state: current round, timer, tie-break picks. Persisted so a restart keeps it.
// All times are host time (ms since epoch).
export function createGameState(log, roundIds, clock = Date.now) {
  const saved = log.getState('game');
  const state = {
    round: roundIds.includes(saved?.round) ? saved.round : roundIds[0],
    timer: saved?.timer ?? { duration: 0, startedAt: null, pausedAt: null },
    tieOrder: Array.isArray(saved?.tieOrder) ? saved.tieOrder : [],
  };
  const save = () => log.setState('game', state);

  return {
    get: () => ({ ...state, hostNow: clock() }),
    setRound(round) {
      if (!roundIds.includes(round)) return false;
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
    clearTieOrder() {
      state.tieOrder = [];
      save();
    },
  };
}
