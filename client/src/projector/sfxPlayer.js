import { playSynthCue } from './sfxSynth.js';

/** Manages projector SFX playback: custom uploaded audio files with Web Audio synth fallback. */
export function createSfxPlayer({ createContext, createAudio, synth = playSynthCue } = {}) {
  const custom = new Map(); // cue -> { key, audio }
  let ctx = null;
  let unlocked = false;
  let master = 0.8;
  let muted = false;

  const clamp = (v) => Math.min(1, Math.max(0, v));
  const effectiveVolume = () => (muted ? 0 : clamp(master));
  const ensureCtx = () => {
    if (ctx) return ctx;
    if (createContext) { ctx = createContext(); return ctx; }
    const AudioCtx = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
    if (AudioCtx) ctx = new AudioCtx();
    return ctx;
  };
  const makeAudio = (src) => {
    const audio = createAudio ? createAudio(src) : new Audio(src);
    audio.preload = 'auto';
    audio.src = src;
    return audio;
  };

  return {
    /** Sync custom SFX URLs (`{ [cue]: { url, version } | null }`) and preload changed files. */
    updateList(sfxMap) {
      const entries = sfxMap && typeof sfxMap === 'object' ? Object.entries(sfxMap) : [];
      const active = new Set();
      for (const [cue, info] of entries) {
        if (!info?.url) continue;
        active.add(cue);
        const key = `${info.url}?v=${info.version ?? 0}`;
        if (custom.get(cue)?.key === key) continue;
        custom.set(cue, { key, audio: makeAudio(key) });
      }
      for (const cue of custom.keys()) {
        if (!active.has(cue)) custom.delete(cue);
      }
    },
    setVolume(volume, isMuted) {
      if (typeof volume === 'number' && Number.isFinite(volume)) master = clamp(volume);
      if (typeof isMuted === 'boolean') muted = isMuted;
    },
    unlock() {
      unlocked = true;
      const c = ensureCtx();
      if (c?.state === 'suspended') c.resume().catch(() => {});
    },
    get unlocked() { return unlocked; },
    /** Play a cue using its custom audio file if present, otherwise synthesize it. */
    play(cue) {
      const vol = effectiveVolume();
      if (!unlocked || vol <= 0) return false;
      const entry = custom.get(cue);
      if (entry) {
        try {
          entry.audio.volume = vol;
          entry.audio.currentTime = 0;
          const p = entry.audio.play?.();
          if (p && typeof p.catch === 'function') p.catch(() => synth(ensureCtx(), cue, vol));
          return true;
        } catch {
          return synth(ensureCtx(), cue, vol);
        }
      }
      return synth(ensureCtx(), cue, vol);
    },
    dispose() {
      for (const { audio } of custom.values()) {
        audio.pause?.();
        audio.removeAttribute?.('src');
        audio.load?.();
      }
      custom.clear();
      if (ctx?.close) ctx.close().catch(() => {});
      ctx = null;
    },
  };
}
