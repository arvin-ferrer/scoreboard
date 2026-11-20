import { describe, it, expect, vi } from 'vitest';
import { createSfxPlayer } from './sfxPlayer.js';

describe('sfxPlayer', () => {
  it('requires unlock and non-zero unmuted volume, falling back to synth when no custom file exists', () => {
    const synth = vi.fn(() => true);
    const ctx = { state: 'suspended', resume: vi.fn(async () => {}), close: vi.fn(async () => {}) };
    const p = createSfxPlayer({ createContext: () => ctx, synth });

    expect(p.play('scoreUp')).toBe(false); // locked
    p.unlock();
    expect(ctx.resume).toHaveBeenCalledTimes(1);

    p.setVolume(0.5, false);
    expect(p.play('scoreUp')).toBe(true);
    expect(synth).toHaveBeenCalledWith(ctx, 'scoreUp', 0.5);

    p.setVolume(0.5, true); // muted
    expect(p.play('scoreUp')).toBe(false);
    p.dispose();
  });

  it('plays custom uploaded audio when present and clears it when removed', () => {
    const synth = vi.fn(() => true);
    const played = [];
    const created = [];
    const createAudio = (src) => {
      const a = { src, preload: '', volume: 1, currentTime: 5, play: vi.fn(() => { played.push(a.src); return Promise.resolve(); }), pause: vi.fn() };
      created.push(a);
      return a;
    };
    const p = createSfxPlayer({ createContext: () => ({ state: 'running' }), createAudio, synth });
    p.unlock();
    p.setVolume(0.6, false);

    p.updateList({ scoreUp: { url: '/sfx-assets/scoreUp.mp3', version: 100 } });
    expect(created).toHaveLength(1);
    expect(p.play('scoreUp')).toBe(true);
    expect(played).toEqual(['/sfx-assets/scoreUp.mp3?v=100']);
    expect(created[0].currentTime).toBe(0);
    expect(created[0].volume).toBe(0.6);
    expect(synth).not.toHaveBeenCalled();

    // Updating version reloads with new cache-busted src; clearing falls back to synth.
    p.updateList({ scoreUp: { url: '/sfx-assets/scoreUp.mp3', version: 200 } });
    expect(created).toHaveLength(2);
    p.updateList({ scoreUp: null });
    p.play('scoreUp');
    expect(synth).toHaveBeenCalledTimes(1);
  });
});
