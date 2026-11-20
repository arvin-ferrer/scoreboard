// Shared SFX cue catalog and audio upload constraints used by both server and client.

export const AUDIO_EXTS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.webm'];
export const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

export const SFX_CUES = [
  { id: 'scoreUp', label: 'Score up', hint: 'Any positive point entry' },
  { id: 'scoreDown', label: 'Score down', hint: 'Any negative point entry or shake' },
  { id: 'overtake', label: 'Overtake', hint: 'A chamber passes another' },
  { id: 'newLeader', label: 'New leader', hint: 'A new chamber takes 1st place' },
  { id: 'wordFlash', label: 'Word flash', hint: 'Fortissimo, Crescendo, Encore, Da Capo' },
  { id: 'curtains', label: 'Round change', hint: 'Curtain transition between rounds' },
  { id: 'podium', label: 'Podium 3rd / 2nd', hint: 'Revealing 3rd or 2nd place' },
  { id: 'podiumFirst', label: 'Podium 1st', hint: 'Revealing 1st place' },
  { id: 'timerTick', label: 'Final 10s tick', hint: 'Each second under 10 s' },
  { id: 'timerDone', label: 'Timer done', hint: 'Countdown reaches 00:00' },
];

export const SFX_CUE_IDS = SFX_CUES.map((c) => c.id);

/** Return the lowercased audio extension if supported, otherwise null. */
export function audioExt(filename) {
  if (typeof filename !== 'string') return null;
  const dot = filename.lastIndexOf('.');
  if (dot < 0) return null;
  const ext = filename.slice(dot).toLowerCase();
  return AUDIO_EXTS.includes(ext) ? ext : null;
}

/** Pick at most one SFX cue for a live entry's visual effects list. */
export function pickEntrySfx(fxList) {
  if (!Array.isArray(fxList) || fxList.length === 0) return null;
  const types = new Set(fxList.map((f) => f?.type));
  if (types.has('newLeader')) return 'newLeader';
  if (types.has('word')) return 'wordFlash';
  if (types.has('overtake')) return 'overtake';
  const pop = fxList.find((f) => f?.type === 'pop');
  if (pop) return pop.points < 0 ? 'scoreDown' : 'scoreUp';
  if (types.has('shake')) return 'scoreDown';
  return null;
}
