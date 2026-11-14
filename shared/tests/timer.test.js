import { describe, it, expect } from 'vitest';
import { timerLeftMs, timerStatus, formatClock } from '../timer.js';

describe('timer', () => {
  it('stopped timer shows the full duration', () => {
    const t = { duration: 90, startedAt: null, pausedAt: null };
    expect(timerLeftMs(t, 5000)).toBe(90000);
    expect(timerStatus(t)).toBe('stopped');
  });
  it('running timer counts down on host time and stops at 0', () => {
    const t = { duration: 60, startedAt: 1000, pausedAt: null };
    expect(timerLeftMs(t, 11000)).toBe(50000);
    expect(timerStatus(t)).toBe('running');
    expect(timerLeftMs(t, 999999)).toBe(0);
  });
  it('paused timer holds its value', () => {
    const t = { duration: 60, startedAt: 1000, pausedAt: 21000 };
    expect(timerLeftMs(t, 99999)).toBe(40000);
    expect(timerStatus(t)).toBe('paused');
  });
  it('formats m:ss, rounding partial seconds up', () => {
    expect(formatClock(90000)).toBe('1:30');
    expect(formatClock(59001)).toBe('1:00');
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(-5)).toBe('0:00');
  });
});
