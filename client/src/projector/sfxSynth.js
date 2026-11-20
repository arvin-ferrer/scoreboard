// Zero-dependency Web Audio synthesizer used as fallback when no custom SFX file is uploaded.

function tone(ctx, { freq, to = freq, start = 0, dur = 0.14, type = 'triangle', gain = 0.25 }) {
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.linearRampToValueAtTime(gain, t0 + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const RECIPES = {
  scoreUp: (ctx, v) => {
    tone(ctx, { freq: 523.25, dur: 0.1, gain: 0.22 * v });
    tone(ctx, { freq: 659.25, start: 0.07, dur: 0.16, gain: 0.24 * v });
  },
  scoreDown: (ctx, v) => {
    tone(ctx, { freq: 220, to: 145, dur: 0.2, type: 'sawtooth', gain: 0.18 * v });
  },
  overtake: (ctx, v) => {
    [440, 554.37, 659.25].forEach((f, i) => tone(ctx, { freq: f, start: i * 0.05, dur: 0.14, gain: 0.2 * v }));
  },
  newLeader: (ctx, v) => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ctx, { freq: f, start: i * 0.06, dur: 0.26, gain: 0.22 * v }));
  },
  wordFlash: (ctx, v) => {
    [587.33, 739.99, 880].forEach((f, i) => tone(ctx, { freq: f, start: i * 0.04, dur: 0.3, gain: 0.22 * v }));
  },
  curtains: (ctx, v) => {
    [392, 493.88, 587.33].forEach((f, i) => tone(ctx, { freq: f, start: i * 0.09, dur: 0.35, type: 'sine', gain: 0.2 * v }));
  },
  podium: (ctx, v) => {
    [440, 554.37, 659.25, 880].forEach((f, i) => tone(ctx, { freq: f, start: i * 0.07, dur: 0.32, gain: 0.22 * v }));
  },
  podiumFirst: (ctx, v) => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f) => tone(ctx, { freq: f, start: 0.02, dur: 0.55, gain: 0.18 * v }));
    tone(ctx, { freq: 1046.5, start: 0.18, dur: 0.5, gain: 0.22 * v });
  },
  timerTick: (ctx, v) => {
    tone(ctx, { freq: 880, dur: 0.05, type: 'sine', gain: 0.16 * v });
  },
  timerDone: (ctx, v) => {
    tone(ctx, { freq: 659.25, dur: 0.45, type: 'sine', gain: 0.28 * v });
    tone(ctx, { freq: 440, start: 0.18, dur: 0.55, type: 'sine', gain: 0.25 * v });
  },
};

/** Play a synthesized SFX cue using the given Web Audio `AudioContext`. */
export function playSynthCue(ctx, cue, volume) {
  if (!ctx || volume <= 0) return false;
  const fn = RECIPES[cue];
  if (!fn) return false;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  fn(ctx, volume);
  return true;
}
