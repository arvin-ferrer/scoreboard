import noteUrl from '../../../assets/ui/structure/note.svg';

const GOLD = ['#e0bb62', '#ffd86b', '#f6edda', '#c99a2e', '#fff3c4'];
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// One canvas for all confetti and floating notes. The animation loop runs only while particles exist,
// and the particle count is capped, so it stays light on an ordinary laptop.
export function createParticles(canvas, { max = 360 } = {}) {
  const ctx = canvas.getContext('2d');
  let list = [];
  let raf = 0;
  let last = 0;
  let w = 0, h = 0;
  const note = new Image();
  note.src = noteUrl; // bundled file, no network

  function resize() {
    w = canvas.width = window.innerWidth; // 1x on purpose: sharp enough for confetti, cheaper to draw
    h = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function frame(t) {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    ctx.clearRect(0, 0, w, h);
    for (const p of list) {
      p.life -= dt;
      p.vy += p.g * dt;
      p.vx *= 1 - p.drag * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      p.flip += p.flipSpeed * dt;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.fade));
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.kind === 'note') {
        if (note.complete && note.naturalWidth) ctx.drawImage(note, -p.size * 0.29, -p.size / 2, p.size * 0.58, p.size);
      } else {
        ctx.scale(1, Math.cos(p.flip));
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }
      ctx.restore();
    }
    list = list.filter((p) => p.life > 0 && p.y < h + 60);
    if (list.length) raf = requestAnimationFrame(frame);
    else { raf = 0; ctx.clearRect(0, 0, w, h); }
  }
  function add(more) {
    list.push(...more);
    if (list.length > max) list.splice(0, list.length - max);
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }
  const unit = () => h / 100; // 1 "vh" in pixels

  return {
    // Confetti shooting up and out from a point (a row, or the podium).
    burst({ x, y, count = 100, colors = GOLD, power = 1 }) {
      add(Array.from({ length: count }, () => {
        const a = rand(-Math.PI * 0.95, -Math.PI * 0.05);
        const v = rand(30, 85) * unit() * power;
        return { kind: 'confetti', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 90 * unit(), drag: 0.9, rot: rand(0, 6), spin: rand(-8, 8),
          flip: rand(0, 6), flipSpeed: rand(6, 14), size: rand(1.2, 2.2) * unit(), color: pick(colors), life: rand(1.6, 2.6), fade: 0.5 };
      }));
    },
    // Confetti falling across the whole screen (podium winner).
    rain({ count = 200, colors = GOLD }) {
      add(Array.from({ length: count }, () => ({
        kind: 'confetti', x: rand(0, w), y: rand(-20 * unit(), 0), vx: rand(-6, 6) * unit(), vy: rand(5, 25) * unit(), g: 25 * unit(), drag: 0.3,
        rot: rand(0, 6), spin: rand(-5, 5), flip: rand(0, 6), flipSpeed: rand(5, 12), size: rand(1.2, 2.2) * unit(), color: pick(colors), life: rand(2.5, 4.5), fade: 0.8,
      })));
    },
    // Music notes drifting up from a row.
    notes({ x, y, count = 4 }) {
      add(Array.from({ length: count }, (_, i) => ({
        kind: 'note', x: x + rand(-4, 4) * unit(), y: y + rand(-1, 1) * unit(), vx: rand(-6, 6) * unit(), vy: -rand(14, 28) * unit(), g: -2 * unit(), drag: 0.2,
        rot: rand(-0.5, 0.5), spin: rand(-1, 1), flip: 0, flipSpeed: 0, size: rand(3.2, 5) * unit(), color: '', life: rand(1.6, 2.4) + i * 0.05, fade: 0.8,
      })));
    },
    clear() { list = []; },
    dispose() { cancelAnimationFrame(raf); raf = 0; list = []; window.removeEventListener('resize', resize); },
  };
}
