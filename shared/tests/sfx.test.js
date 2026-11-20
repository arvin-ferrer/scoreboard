import { describe, it, expect } from 'vitest';
import { SFX_CUES, SFX_CUE_IDS, audioExt, pickEntrySfx } from '../sfx.js';

describe('sfx helpers', () => {
  it('validates supported audio extensions case-insensitively', () => {
    expect(audioExt('anthem.MP3')).toBe('.mp3');
    expect(audioExt('fanfare.wav')).toBe('.wav');
    expect(audioExt('clip.ogg')).toBe('.ogg');
    expect(audioExt('notes.txt')).toBe(null);
    expect(audioExt('noext')).toBe(null);
    expect(audioExt(null)).toBe(null);
  });

  it('picks at most one prioritized SFX cue per entry effects list', () => {
    expect(pickEntrySfx([])).toBe(null);
    expect(pickEntrySfx([{ type: 'pop', points: 20 }])).toBe('scoreUp');
    expect(pickEntrySfx([{ type: 'pop', points: -10 }])).toBe('scoreDown');
    expect(pickEntrySfx([{ type: 'shake' }])).toBe('scoreDown');
    expect(pickEntrySfx([{ type: 'pop', points: 20 }, { type: 'overtake' }])).toBe('overtake');
    expect(pickEntrySfx([{ type: 'pop', points: 100 }, { type: 'word', id: 'fortissimo' }, { type: 'overtake' }])).toBe('wordFlash');
    expect(pickEntrySfx([{ type: 'word' }, { type: 'newLeader' }])).toBe('newLeader');
  });

  it('exposes matching cue metadata and IDs', () => {
    expect(SFX_CUE_IDS).toHaveLength(SFX_CUES.length);
    expect(new Set(SFX_CUE_IDS).size).toBe(SFX_CUE_IDS.length);
  });
});
