// Plays one looping song per chamber and crossfades between them.
// Every song has its own <audio> element and a fade level from 0 to 1. Moving the target of one
// song to 1 and the others to 0 is the crossfade. Volume and mute scale all of them.
export function createMusicPlayer({ fadeSeconds = 2 } = {}) {
  const songs = new Map(); // url -> { audio, level, target }
  let fadeMs = fadeSeconds * 1000;
  let master = 0.7;
  let unlocked = false;
  let wanted = null;
  let timer = null;
  let last = 0;

  const song = (url) => {
    if (!songs.has(url)) {
      const audio = new Audio();
      audio.loop = true;
      audio.preload = 'auto';
      audio.src = url;
      audio.volume = 0;
      songs.set(url, { audio, level: 0, target: 0 });
    }
    return songs.get(url);
  };
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const setVolume = (s) => { s.audio.volume = clamp(s.level * master); };

  const tick = () => {
    const now = performance.now();
    const step = fadeMs > 0 ? (now - last) / fadeMs : 1;
    last = now;
    let moving = false;
    for (const s of songs.values()) {
      if (s.level === s.target) continue;
      s.level = s.level < s.target ? Math.min(s.target, s.level + step) : Math.max(s.target, s.level - step);
      setVolume(s);
      if (s.level === 0) s.audio.pause();
      if (s.level !== s.target) moving = true;
    }
    if (!moving) { clearInterval(timer); timer = null; }
  };
  const startFading = () => {
    if (timer) return;
    last = performance.now();
    timer = setInterval(tick, 50);
  };

  const apply = () => {
    for (const [url, s] of songs) {
      const on = unlocked && url === wanted;
      s.target = on ? 1 : 0;
      if (on && s.audio.paused) {
        if (s.level === 0) s.audio.currentTime = 0;
        s.audio.play().catch(() => {}); // blocked until the page has had a click; "Enable sound" fixes that
      }
    }
    startFading();
  };

  return {
    // Start downloading every song now so a lead change never waits on the disk.
    preload(urls) { for (const u of urls) song(u); },
    configure({ fadeSeconds: f }) { if (Number.isFinite(f)) fadeMs = f * 1000; },
    setVolume(volume, muted) {
      master = muted ? 0 : clamp(volume);
      for (const s of songs.values()) setVolume(s);
    },
    // Call from the "Enable sound" click. Browsers only allow sound after a click on the page.
    unlock() { unlocked = true; apply(); },
    get unlocked() { return unlocked; },
    // url: the song to play, or null for silence. Fades over fadeSeconds.
    play(url) {
      wanted = url ?? null;
      if (wanted) song(wanted);
      apply();
    },
    dispose() {
      clearInterval(timer);
      for (const s of songs.values()) { s.audio.pause(); s.audio.removeAttribute('src'); s.audio.load(); }
      songs.clear();
    },
  };
}
