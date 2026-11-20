import { useEffect, useRef, useState } from 'react';
import { createLeaderTracker } from '../../../shared/leader.js';
import { createMusicPlayer } from './musicPlayer.js';

// Plays the song of the chamber in 1st place. Renders only the "Enable sound" button.
// The hold time uses this laptop's own clock: it is only a pause before switching songs, not a game timer.
export default function ProjectorMusic({ chambers, totals, hidden, volume, muted, holdSeconds, fadeSeconds, onUnlock }) {
  const [on, setOn] = useState(false);
  const player = useRef(null);
  const tracker = useRef(null);
  if (!player.current) {
    player.current = createMusicPlayer({ fadeSeconds });
    tracker.current = createLeaderTracker({ holdMs: holdSeconds * 1000 });
  }
  useEffect(() => () => player.current.dispose(), []);

  const songUrlOf = (c) => (c?.songUrl ? (c.songVersion ? `${c.songUrl}?v=${c.songVersion}` : c.songUrl) : null);
  const songOf = (id) => songUrlOf(chambers.find((c) => c.id === id));
  const songKey = chambers.map((c) => songUrlOf(c) ?? '').join('|');
  const ids = chambers.map((c) => c.id);

  useEffect(() => { player.current.preload(chambers.map(songUrlOf).filter(Boolean)); }, [songKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { player.current.configure({ fadeSeconds }); }, [fadeSeconds]);
  useEffect(() => { player.current.setVolume(volume, muted); }, [volume, muted]);

  // While scores are hidden the music stops, or the song would give away the leader.
  // When they are shown again, the current leader starts at once.
  useEffect(() => {
    if (hidden) { tracker.current.reset(); player.current.play(null); return undefined; }
    const check = () => player.current.play(songOf(tracker.current.update(ids, totals, performance.now())));
    check();
    const t = setInterval(check, 500); // the hold time passes with no score change, so keep checking
    return () => clearInterval(t);
  }, [hidden, totals, songKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (on) return null;
  return (
    <button className="enable-sound" onClick={() => { player.current.unlock(); onUnlock?.(); setOn(true); }}>
      Enable sound
    </button>
  );
}
