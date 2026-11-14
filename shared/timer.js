// Timer maths shared by every screen. `now` must be host time (see useScoreboard's hostNow).
// timer: { duration (seconds), startedAt, pausedAt } as stored by the host.
export function timerLeftMs(timer, now) {
  const total = (timer.duration ?? 0) * 1000;
  if (timer.startedAt === null || timer.startedAt === undefined) return total;
  return Math.max(0, total - ((timer.pausedAt ?? now) - timer.startedAt));
}

export function timerStatus(timer) {
  if (timer.startedAt === null || timer.startedAt === undefined) return 'stopped';
  return timer.pausedAt === null || timer.pausedAt === undefined ? 'running' : 'paused';
}

export function formatClock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
