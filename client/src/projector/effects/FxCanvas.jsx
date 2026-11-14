import { useEffect, useRef } from 'react';
import { createParticles } from './particles.js';

// The one canvas for confetti and floating notes. apiRef.current gets burst/rain/notes.
export default function FxCanvas({ apiRef }) {
  const ref = useRef(null);
  useEffect(() => {
    const api = createParticles(ref.current);
    apiRef.current = api;
    return () => { api.dispose(); apiRef.current = null; };
  }, [apiRef]);
  return <canvas ref={ref} className="fx-layer fx-canvas" aria-hidden="true" />;
}
