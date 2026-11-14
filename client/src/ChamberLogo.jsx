import { useState } from 'react';

// The chamber's own logo, or a coloured disc with its number when the logo file is missing.
export default function ChamberLogo({ chamber, className = '' }) {
  const [broken, setBroken] = useState(false);
  if (chamber.logoUrl && !broken) {
    return <img className={`logo ${className}`} src={chamber.logoUrl} alt="" onError={() => setBroken(true)} />;
  }
  const mark = chamber.name.match(/\d+$/)?.[0] ?? chamber.name.trim().charAt(0).toUpperCase();
  return <span className={`logo fallback ${className}`} aria-hidden="true">{mark}</span>;
}
