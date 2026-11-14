import { useEffect, useRef, useState } from 'react';

// A number that counts to its new value when `animate` is on at the moment it changes.
// Otherwise (first paint, reconnect, effects off) it jumps straight there.
export default function CountUp({ value, animate, ms }) {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);
  useEffect(() => {
    const start = shownRef.current;
    if (start === value) return undefined;
    if (!animate || !ms) { shownRef.current = value; setShown(value); return undefined; }
    const t0 = performance.now();
    let raf = 0;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      const v = Math.round(start + (value - start) * (1 - (1 - k) ** 3));
      shownRef.current = v;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return shown;
}
