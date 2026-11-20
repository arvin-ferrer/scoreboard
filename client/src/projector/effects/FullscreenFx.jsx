import { useEffect, useId, useMemo } from 'react';
import velvet from '../../../assets/ui/registration/curtain-velvet.webp';

// Whichever full-screen effect the queue is playing now: a word, the curtains, or the spotlight.
// The queue guarantees only one at a time.
export default function FullscreenFx({ item, config, roundName, onCurtainsClosed }) {
  if (!item) return null;
  if (item.type === 'word') {
    return (
      <div key={item.seq} className="fx-layer fx-word-layer" style={{ '--ms': `${item.ms}ms`, '--n': Math.max(4, item.text.length) }}>
        <div className="fx-word-band" />
        <div className={`fx-word fx-word-${item.id}`}>{item.text}</div>
      </div>
    );
  }
  if (item.type === 'spot') return <Spotlight key={item.seq} item={item} />;
  return <Curtains key={item.seq} item={item} config={config.effects.curtains} name={roundName(item.round)} onClosed={onCurtainsClosed} />;
}

function Spotlight({ item }) {
  const box = useMemo(() => {
    const r = document.querySelector(`[data-chamber="${item.chamber}"]`)?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height } : { x: window.innerWidth / 2, y: window.innerHeight / 2, w: 800, h: 100 };
  }, [item.chamber]);
  return (
    <div className="fx-layer fx-spot" style={{ '--ms': `${item.ms}ms`, '--x': `${box.x}px`, '--y': `${box.y}px`, '--rw': `${box.w * 0.62}px`, '--rh': `${box.h * 1.7}px`, '--beam-w': `${box.w}px` }}>
      <div className="fx-spot-shade" />
      <div className="fx-spot-beam" />
    </div>
  );
}

// Two curtains close, the new round name shows, then they open.
// Copied from the registration site's curtain call (YSES-Online-V2 Get14LoadingScreen): velvet panels whose
// inner 12% billows through an animated SVG clip, a skew sway, a light sheen and the swag valance.
const EDGE = 0.12;
const CLOTH = [
  'M0 0H1C1 .12 1 .22 1 .34C1 .46 1 .56 1 .68C1 .8 1 .9 1 1H0Z',
  'M0 0H1C.985 .12 .93 .22 .97 .34C1 .46 .96 .56 .98 .68C.95 .8 .985 .9 1 1H0Z',
  'M0 0H1C1 .12 .98 .22 .99 .34C.94 .46 .91 .56 .96 .68C1 .8 .96 .9 1 1H0Z',
  'M0 0H1C.97 .12 1 .22 .98 .34C.96 .46 .99 .56 .97 .68C.94 .8 .99 .9 1 1H0Z',
  'M0 0H1C1 .12 1 .22 1 .34C1 .46 1 .56 1 .68C1 .8 1 .9 1 1H0Z',
];
// Map the full-panel curves into the edge strip (x only; every cubic has three x/y pairs).
const EDGE_SHAPES = CLOTH.map((shape) => shape.replace(/C([^CHZ]+)/g, (_, xy) =>
  `C${xy.trim().split(/\s+/).map(Number).map((v, i) => (i % 2 === 0 ? Number((1 - (1 - v) / EDGE).toFixed(4)) : v)).join(' ')}`));
const SWAG = 'M0 0H300V18C228 113 72 113 0 18Z';
const FOLDS = [24, 36, 49, 63, 78, 94, 109];
const SPLINES = '0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1';

function Panel({ side, clip }) {
  return (
    <div className={`fx-curtain ${side}`}>
      <div className="fx-cloth">
        <div className="fx-cloth-body"><div className="fx-cloth-tex" /></div>
        <div className="fx-cloth-edge" style={{ clipPath: `url(#${clip})` }}><div className="fx-cloth-tex" /></div>
      </div>
    </div>
  );
}

function Curtains({ item, config, name, onClosed }) {
  const id = useId().replace(/:/g, '');
  const openAt = config.closeMs + config.holdMs;
  useEffect(() => {
    if (item.preview) return undefined;
    const t = setTimeout(onClosed, config.closeMs); // the screen can now switch to the new round, unseen
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const billow = (begin, dur) => (
    <animate attributeName="d" values={EDGE_SHAPES.join(';')} keyTimes="0;0.24;0.5;0.76;1" calcMode="spline" keySplines={SPLINES} begin={`${begin}ms`} dur={`${dur}ms`} fill="freeze" />
  );
  return (
    <div className="fx-layer fx-curtains" style={{ '--close': `${config.closeMs}ms`, '--hold': `${config.holdMs}ms`, '--open': `${config.openMs}ms`, '--open-at': `${openAt}ms`, '--velvet': `url(${velvet})` }}>
      <svg className="fx-clip-defs" aria-hidden="true">
        <defs>
          <clipPath id={`${id}-edge`} clipPathUnits="objectBoundingBox">
            <path d={EDGE_SHAPES[0]}>{billow(0, config.closeMs)}{billow(openAt, config.openMs)}</path>
          </clipPath>
        </defs>
      </svg>
      <Panel side="left" clip={`${id}-edge`} />
      <Panel side="right" clip={`${id}-edge`} />
      <div className="fx-valance" aria-hidden="true">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`${id}-base`} x2="0" y2="1"><stop stopColor="#1b3263" /><stop offset="1" stopColor="#070f2c" /></linearGradient>
            <linearGradient id={`${id}-fold`}>
              <stop stopColor="#112346" /><stop offset="0.25" stopColor="#304f7d" /><stop offset="0.5" stopColor="#2d4b78" /><stop offset="0.75" stopColor="#304f7d" /><stop offset="1" stopColor="#112346" />
            </linearGradient>
            <pattern id={`${id}-velvet`} width="300" height="120" patternUnits="userSpaceOnUse">
              <image href={velvet} width="120" height="300" preserveAspectRatio="none" transform="translate(300 0) rotate(90)" />
            </pattern>
            <filter id={`${id}-soft`} x="-5%" y="-10%" width="110%" height="120%"><feGaussianBlur stdDeviation="0.65" /></filter>
            <clipPath id={`${id}-swag`}><path d={SWAG} /></clipPath>
          </defs>
          {[0, 300, 600, 900].map((x) => (
            <g key={x} transform={`translate(${x} 0)`}>
              <g clipPath={`url(#${id}-swag)`}>
                <path d={SWAG} fill={`url(#${id}-base)`} />
                <path d={SWAG} fill={`url(#${id}-velvet)`} opacity="0.5" />
                {FOLDS.map((depth) => {
                  const fold = `M0 12C74 ${depth} 226 ${depth} 300 12`;
                  return (
                    <g key={depth} fill="none" filter={`url(#${id}-soft)`}>
                      <path d={fold} stroke="#02071d" strokeWidth="9" opacity="0.8" />
                      <path d={fold} transform="translate(0 -1.5)" stroke={`url(#${id}-fold)`} strokeWidth="4" />
                      <path d={fold} transform="translate(0 -3)" stroke="#56749e" strokeWidth="1" opacity="0.25" />
                    </g>
                  );
                })}
              </g>
            </g>
          ))}
        </svg>
      </div>
      <div className="fx-curtain-title" style={{ '--n': Math.max(4, String(name).length) }}>{name}</div>
    </div>
  );
}
