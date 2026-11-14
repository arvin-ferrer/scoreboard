import { useEffect, useState } from 'react';

// Re-renders about 4 times a second and returns host time, so timers tick smoothly.
export function useNow(hostNow, everyMs = 250) {
  const [now, setNow] = useState(() => hostNow());
  useEffect(() => {
    const t = setInterval(() => setNow(hostNow()), everyMs);
    return () => clearInterval(t);
  }, [hostNow, everyMs]);
  return now;
}
