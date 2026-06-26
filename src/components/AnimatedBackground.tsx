import { useEffect, useRef } from 'react';

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = window.innerWidth;
    let H = window.innerHeight;
    let animId: number;
    let t = 0;

    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Particles
    const N = 80;
    const particles = Array.from({ length: N }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      alpha: Math.random() * 0.5 + 0.15,
      hue: Math.random() * 60 + 170, // teal-blue-cyan range
    }));

    // Aurora orbs
    const orbs = [
      { x: 0.15, y: 0.2, r: 0.45, hue: 185, speed: 0.0004 },
      { x: 0.75, y: 0.65, r: 0.4,  hue: 210, speed: 0.0003 },
      { x: 0.5,  y: 0.05, r: 0.3,  hue: 165, speed: 0.0005 },
      { x: 0.85, y: 0.1,  r: 0.25, hue: 225, speed: 0.0006 },
    ];

    const draw = () => {
      t += 0.4;
      ctx.clearRect(0, 0, W, H);

      // Deep background
      ctx.fillStyle = '#05070b';
      ctx.fillRect(0, 0, W, H);

      // Aurora blobs
      orbs.forEach((orb, i) => {
        const ox = orb.x * W + Math.sin(t * orb.speed * 1000 + i) * W * 0.07;
        const oy = orb.y * H + Math.cos(t * orb.speed * 800 + i * 1.3) * H * 0.05;
        const gr = ctx.createRadialGradient(ox, oy, 0, ox, oy, orb.r * Math.min(W, H));
        const pulse = 0.06 + 0.02 * Math.sin(t * orb.speed * 1200 + i);
        gr.addColorStop(0, `hsla(${orb.hue}, 80%, 55%, ${pulse})`);
        gr.addColorStop(0.5, `hsla(${orb.hue + 20}, 70%, 45%, ${pulse * 0.4})`);
        gr.addColorStop(1, 'transparent');
        ctx.fillStyle = gr;
        ctx.fillRect(0, 0, W, H);
      });

      // Faint grid
      ctx.strokeStyle = 'rgba(26,37,53,0.35)';
      ctx.lineWidth = 0.5;
      const gs = 52;
      for (let x = 0; x < W; x += gs) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += gs) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // Diagonal scan line
      const scanX = (t * 1.1) % (W + 200) - 100;
      const scanGr = ctx.createLinearGradient(scanX - 80, 0, scanX + 80, 0);
      scanGr.addColorStop(0, 'transparent');
      scanGr.addColorStop(0.5, 'rgba(0,194,168,0.04)');
      scanGr.addColorStop(1, 'transparent');
      ctx.fillStyle = scanGr;
      ctx.fillRect(scanX - 80, 0, 160, H);

      // Particles + connections
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},70%,65%,${p.alpha})`;
        ctx.fill();
      });

      // Draw connections between nearby particles
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0,194,168,${0.06 * (1 - dist / 110)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      // Glowing corner accent
      const cornerGr = ctx.createRadialGradient(0, 0, 0, 0, 0, 350);
      cornerGr.addColorStop(0, 'rgba(0,194,168,0.07)');
      cornerGr.addColorStop(1, 'transparent');
      ctx.fillStyle = cornerGr;
      ctx.fillRect(0, 0, 350, 350);

      const cornerGr2 = ctx.createRadialGradient(W, H, 0, W, H, 300);
      cornerGr2.addColorStop(0, 'rgba(59,130,246,0.05)');
      cornerGr2.addColorStop(1, 'transparent');
      ctx.fillStyle = cornerGr2;
      ctx.fillRect(W - 300, H - 300, 300, 300);

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}
    />
  );
}
