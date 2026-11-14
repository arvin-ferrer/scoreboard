import { useEffect, useRef, useState } from 'react';
import { fmtPoints } from '../settings.js';

export default function NumberPad({ disabled, max, label, onScore }) {
  const [sign, setSign] = useState(1);
  const [digits, setDigits] = useState('');
  const value = Math.min(Number(digits || 0), max) * sign;
  const press = (d) => setDigits((cur) => (Number(cur + d) > max ? cur : String(Number(cur + d))));

  const [tapped, setTapped] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const submit = () => {
    if (value === 0) return;
    onScore(value, label);
    setDigits('');
    setTapped(false);
    clearTimeout(timer.current);
    requestAnimationFrame(() => setTapped(true));
    timer.current = setTimeout(() => setTapped(false), 500);
  };
  return (
    <div className="pad">
      <h3>{label}</h3>
      <div className="pad-display">{digits === '' ? '0' : fmtPoints(value)}</div>
      <div className="pad-grid">
        <button className={`score-btn add${sign > 0 ? ' on' : ''}`} onClick={() => setSign(1)}>+</button>
        <button className={`score-btn sub${sign < 0 ? ' on' : ''}`} onClick={() => setSign(-1)}>{'−'}</button>
        <button className="score-btn key" onClick={() => setDigits((d) => d.slice(0, -1))} aria-label="Delete">⌫</button>
        {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((n) => (
          <button key={n} className="score-btn key" onClick={() => press(n)}>{n}</button>
        ))}
        <button className="score-btn key" onClick={() => press(0)}>0</button>
        <button className={`score-btn go ${sign < 0 ? 'sub' : 'add'}${tapped ? ' tapped' : ''}`} disabled={disabled || value === 0} onClick={submit}>
          Add {value !== 0 ? fmtPoints(value) : ''}
        </button>
      </div>
    </div>
  );
}
