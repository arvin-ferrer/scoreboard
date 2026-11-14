import { useEffect, useMemo } from 'react';

// Whichever full-screen effect the queue is playing now: a word, the curtains, or the spotlight.
// The queue guarantees only one at a time.
export default function FullscreenFx({ item, config, roundName, onCurtainsClosed }) {
  if (!item) return null;
  if (item.type === 'word') {
    return (
      <div key={item.seq} className="fx-layer fx-word-layer" style={{ '--ms': `${item.ms}ms` }}>
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
function Curtains({ item, config, name, onClosed }) {
  useEffect(() => {
    if (item.preview) return undefined;
    const t = setTimeout(onClosed, config.closeMs); // the screen can now switch to the new round, unseen
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="fx-layer fx-curtains" style={{ '--close': `${config.closeMs}ms`, '--hold': `${config.holdMs}ms`, '--open': `${config.openMs}ms`, '--open-at': `${config.closeMs + config.holdMs}ms` }}>
      <div className="fx-curtain left"><span /></div>
      <div className="fx-curtain right"><span /></div>
      <div className="fx-curtain-title">{name}</div>
    </div>
  );
}
