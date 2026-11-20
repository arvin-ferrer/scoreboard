import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import defaults from '../../../../shared/effects.json';
import { createEffectsEngine, mergeEffects, streakTier } from '../../../../shared/effects.js';
import { createFxQueue } from '../../../../shared/fxQueue.js';
import { pickEntrySfx } from '../../../../shared/sfx.js';

const PRIORITY = { curtains: 3, word: 2, spot: 1 };
const PREVIEW_MS = 6000;

const PREVIEW_SFX = {
  popUp: 'scoreUp', popDown: 'scoreDown', shake: 'scoreDown', overtake: 'overtake',
  newLeader: 'newLeader', fortissimo: 'wordFlash', crescendo: 'wordFlash',
  encore: 'wordFlash', daCapo: 'wordFlash', finalTen: 'timerTick',
};

// The projector's effects controller. It hears live events from useScoreboard, asks the engine what to
// play, runs full-screen effects one at a time through a queue, and hands the screen what to draw.
//   - Only live events play. A snapshot (start, reconnect) only teaches the engine the log, quietly.
//   - While scores are hidden nothing that shows scores or ranks plays.
//   - The admin's master switch and Full/Reduced come from the shared game state.
export function useFx(data, particlesRef, playSfx = null) {
  const config = useMemo(() => mergeEffects(defaults, data?.effects), [data?.effects]);
  const state = data?.state;
  const on = state?.effectsOn !== false;
  const reduced = state?.effectsIntensity === 'reduced';
  const hidden = state?.scoresHidden === true;
  const latest = useRef({});
  latest.current = { config, data, on, reduced, hidden, playSfx };

  const engine = useRef(null);
  const queue = useRef(createFxQueue(config.queue));
  const clock = useRef(0);
  const popSeq = useRef(0);
  const timers = useRef(new Set());
  const [streaks, setStreaks] = useState({});
  const [pops, setPops] = useState([]);
  const [shakes, setShakes] = useState({});
  const [passers, setPassers] = useState({});
  const [animateTotals, setAnimateTotals] = useState(false);
  const [current, setCurrent] = useState(null);
  const [roundHold, setRoundHold] = useState(null);
  const [fresh, setFresh] = useState([]);
  const [preview, setPreview] = useState({ streak: {}, offKey: {}, timer: null, podium: null });

  const later = useCallback((fn, ms) => {
    const t = setTimeout(() => { timers.current.delete(t); fn(); }, ms);
    timers.current.add(t);
  }, []);
  useEffect(() => () => { timers.current.forEach(clearTimeout); clearTimeout(clock.current); }, []);

  const pulse = useCallback((setter, id, ms) => {
    setter((m) => ({ ...m, [id]: true }));
    later(() => setter((m) => { const n = { ...m }; delete n[id]; return n; }), ms);
  }, [later]);

  // Full-screen queue: one at a time.
  const sync = useCallback(() => {
    clearTimeout(clock.current);
    const now = performance.now();
    const cur = queue.current.advance(now);
    setCurrent((prev) => (prev?.seq === cur?.seq ? prev : cur));
    if (cur) clock.current = setTimeout(sync, Math.max(10, cur.startedAt + cur.ms - now + 20));
  }, []);
  const enqueue = useCallback((item) => {
    queue.current.push({ priority: PRIORITY[item.type] ?? 1, ...item }, performance.now());
    sync();
  }, [sync]);

  // Turning effects off clears anything waiting.
  useEffect(() => {
    if (on) return;
    queue.current.clear();
    clearTimeout(clock.current);
    setCurrent(null);
    setRoundHold(null);
  }, [on]);

  const rowPoint = (id) => {
    const el = document.querySelector(`[data-chamber="${id}"]`);
    const r = el?.getBoundingClientRect();
    return r ? { x: r.left + r.width * 0.86, y: r.top + r.height / 2 } : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  };

  const podiumStep = useCallback((step) => {
    const { config: cfg, reduced: red, playSfx: sfx } = latest.current;
    const place = 4 - step; // step 1 = 3rd, 2 = 2nd, 3 = 1st
    setFresh((f) => [...f, place]);
    later(() => setFresh((f) => f.filter((p) => p !== place)), 2600);
    sfx?.(step === 3 ? 'podiumFirst' : 'podium');
    if (step === 3) {
      const n = Math.round(cfg.effects.podium.confettiParticles * (red ? cfg.reduced.particleScale : 1));
      particlesRef.current?.rain({ count: n });
      particlesRef.current?.burst({ x: window.innerWidth / 2, y: window.innerHeight * 0.6, count: Math.round(n / 2), power: 1.3 });
    }
  }, [later, particlesRef]);

  // Plays one effect. `forced` is the admin's preview: it ignores the master switch and hidden scores.
  const play = useCallback((fx, forced = false) => {
    const { config: cfg, on: isOn, reduced: red, hidden: isHidden } = latest.current;
    if (!forced && (!isOn || isHidden)) return;
    const c = cfg.effects;
    const scale = red ? cfg.reduced.particleScale : 1;
    switch (fx.type) {
      case 'pop': {
        const key = ++popSeq.current;
        setPops((p) => [...p.slice(-12), { key, chamber: fx.chamber, points: fx.points }]);
        later(() => setPops((p) => p.filter((x) => x.key !== key)), c.scorePop.ms);
        break;
      }
      case 'shake': if (!red) pulse(setShakes, fx.chamber, c.shake.ms); break; // Reduced: no shaking or red flash
      case 'burst': particlesRef.current?.burst({ ...rowPoint(fx.chamber), count: Math.round(c.goldBurst.particles * scale) }); break;
      case 'notes': particlesRef.current?.notes({ ...rowPoint(fx.chamber), count: Math.max(1, Math.round(fx.count * (red ? 0.5 : 1))) }); break;
      case 'overtake': pulse(setPassers, fx.chamber, c.overtake.ms); break;
      case 'word': enqueue({ type: 'word', id: fx.id, text: fx.text, ms: cfg.word.ms }); break;
      case 'newLeader': enqueue({ type: 'spot', chamber: fx.chamber, ms: c.newLeader.ms }); break;
      default: break; // streak and streakEnd are drawn from the engine's streak counts
    }
  }, [enqueue, later, pulse, particlesRef]);

  const runPreview = useCallback((name, chamber) => {
    const { config: cfg, data: d, playSfx: sfx } = latest.current;
    const c = cfg.effects;
    if (PREVIEW_SFX[name]) sfx?.(PREVIEW_SFX[name]);
    const hold = (key, value) => {
      setPreview((p) => ({ ...p, [key]: typeof value === 'object' && value !== null ? { ...p[key], ...value } : value }));
      later(() => setPreview((p) => ({ ...p, [key]: key === 'timer' || key === 'podium' ? null : {} })), PREVIEW_MS);
    };
    const streakN = { streak3: 3, streak5: 5, streak7: 7 }[name];
    if (streakN) return hold('streak', { [chamber]: streakN });
    switch (name) {
      case 'shake': return play({ type: 'shake', chamber }, true);
      case 'fortissimo': case 'crescendo': case 'encore': case 'daCapo': return play({ type: 'word', id: name, text: c[name].word }, true);
      case 'newLeader': return play({ type: 'newLeader', chamber }, true);
      case 'popUp': return play({ type: 'pop', chamber, points: 20 }, true);
      case 'popDown': return play({ type: 'pop', chamber, points: -30 }, true);
      case 'overtake': return play({ type: 'overtake', chamber }, true);
      case 'goldBurst': return play({ type: 'burst', chamber }, true);
      case 'noteRain': return play({ type: 'notes', chamber, count: 8 }, true);
      case 'offKey': return hold('offKey', { [chamber]: true });
      case 'finalMinute': return hold('timer', 'mid');
      case 'finalTen': return hold('timer', 'fast');
      case 'curtains': {
        sfx?.('curtains');
        const total = c.curtains.closeMs + c.curtains.holdMs + c.curtains.openMs;
        return enqueue({ type: 'curtains', ms: total, keep: true, round: d?.state.round, preview: true });
      }
      case 'podium': {
        const step = c.podium.stepMs;
        [1, 2, 3].forEach((s, i) => later(() => { setPreview((p) => ({ ...p, podium: s })); podiumStep(s); }, i * step));
        later(() => setPreview((p) => ({ ...p, podium: null })), 2 * step + 6000);
        return undefined;
      }
      default: return undefined;
    }
  }, [enqueue, later, play, podiumStep]);

  const onLive = useCallback((kind, a, b) => {
    const L = latest.current;
    if (kind === 'snapshot') {
      const cfg = mergeEffects(defaults, a.effects);
      engine.current = createEffectsEngine({ chamberIds: a.chambers.map((c) => c.id), config: cfg });
      engine.current.reset(a.entries); // quiet: nothing plays for the old log
      queue.current = createFxQueue(cfg.queue);
      clearTimeout(clock.current);
      setCurrent(null);
      setRoundHold(null);
      setStreaks(engine.current.streaks());
    } else if (kind === 'entry') {
      if (!engine.current) return;
      const fxList = engine.current.apply(a, L.data?.state.tieOrder ?? []);
      setStreaks(engine.current.streaks());
      if (!L.on || L.hidden) return;
      setAnimateTotals(true);
      later(() => setAnimateTotals(false), 1200);
      fxList.forEach((f) => play(f));
      const cue = pickEntrySfx(fxList);
      if (cue) L.playSfx?.(cue);
    } else if (kind === 'state') {
      if (!L.on) return;
      const c = L.config.effects;
      if (a.round !== b.round && c.curtains.enabled) {
        L.playSfx?.('curtains');
        setRoundHold((h) => h ?? b.round); // keep showing the old round until the curtains close
        enqueue({ type: 'curtains', ms: c.curtains.closeMs + c.curtains.holdMs + c.curtains.openMs, keep: true, round: a.round });
        later(() => setRoundHold(null), 30_000); // safety: never stuck on the old round
      }
      if (a.podiumRevealed > b.podiumRevealed && !a.scoresHidden && c.podium.enabled) podiumStep(a.podiumRevealed);
    } else if (kind === 'preview') {
      runPreview(a.name, a.chamber);
    } else if (kind === 'sfxPreview') {
      L.playSfx?.(a.cue);
    }
  }, [enqueue, later, play, podiumStep, runPreview]);

  const active = on && !hidden;
  const c = config.effects;
  const tiers = c.streakFire.tiers;
  return {
    onLive, on, reduced, config, current,
    animateTotals: on && c.scorePop.enabled && animateTotals,
    displayRound: roundHold ?? state?.round,
    closeCurtains: () => setRoundHold(null),
    fresh: on ? fresh : [],
    podiumDemo: preview.podium,
    pops,
    // Row helpers: what a chamber's row should show right now.
    tier: (id) => {
      const n = preview.streak[id] ?? (active && c.streakFire.enabled ? streaks[id] ?? 0 : 0);
      return streakTier(n, tiers);
    },
    offKey: (id, total) => preview.offKey[id] === true || (active && c.offKey.enabled && total < c.offKey.below),
    shaking: (id) => shakes[id] === true,
    passing: (id) => passers[id] === true,
    spotlit: (id) => current?.type === 'spot' && current.chamber === id,
    // Timer: zone 0 none, 1 under a minute, 2 final seconds.
    timer: (leftMs, status) => {
      const t = c.finalMinute;
      const running = status === 'running' && leftMs > 0;
      let zone = 0;
      if (preview.timer) zone = preview.timer === 'fast' ? 2 : 1;
      else if (on && running) zone = leftMs / 1000 <= t.fastUnderSeconds ? 2 : leftMs / 1000 <= t.underSeconds ? 1 : 0;
      const forced = Boolean(preview.timer);
      return {
        pulse: forced || t.enabled ? zone : 0,
        metro: forced || (on && c.metronome.enabled && running),
        speed: zone === 2 ? 'fast' : zone === 1 ? 'mid' : 'slow',
      };
    },
  };
}
