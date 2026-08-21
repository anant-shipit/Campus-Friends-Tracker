import { useEffect, useRef } from 'react';

/**
 * Midnight Campus Starfield — pixel stars that twinkle, warm embers that drift
 * upward, and an occasional slow shooting star. Sits fixed behind all content.
 * Draws hard-edged squares (no blur) to stay on-theme, and honors
 * prefers-reduced-motion by painting a still field.
 */
export default function StarField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let stars = [];
    let motes = [];
    let shooter = null;
    let nextShot = 0;
    let sparks = [];
    let lastSpark = { x: 0, y: 0, t: 0 };
    let raf = 0;

    const rand = (a, b) => a + Math.random() * (b - a);

    function build() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(150, Math.floor((w * h) / 9000));
      stars = Array.from({ length: count }, () => ({
        x: Math.round(rand(0, w)),
        y: Math.round(rand(0, h)),
        s: Math.random() < 0.78 ? 1 : 2,        // mostly 1px, some 2px
        base: rand(0.12, 0.34),
        amp: rand(0.06, 0.16),
        spd: rand(0.6, 1.8),
        ph: rand(0, Math.PI * 2),
      }));

      motes = Array.from({ length: Math.round((w * h) / 90000) + 8 }, () => ({
        x: rand(0, w),
        y: rand(0, h),
        vy: rand(4, 11),                          // px/sec, upward
        drift: rand(-3, 3),
        a: rand(0.1, 0.28),
        s: Math.random() < 0.5 ? 1 : 2,
      }));
    }

    function draw(now) {
      ctx.clearRect(0, 0, w, h);
      const t = now / 1000;

      // Twinkling pixel stars (cream)
      for (const st of stars) {
        const o = reduced
          ? st.base
          : st.base + st.amp * Math.sin(t * st.spd + st.ph);
        ctx.fillStyle = `rgba(255, 248, 224, ${Math.max(0.05, o).toFixed(3)})`;
        ctx.fillRect(st.x, st.y, st.s, st.s);
      }

      // Warm ember motes drifting up
      for (const m of motes) {
        if (!reduced) {
          m.y -= m.vy / 60;
          m.x += m.drift / 60;
          if (m.y < -4) {
            m.y = h + 4;
            m.x = rand(0, w);
          }
        }
        ctx.fillStyle = `rgba(255, 195, 0, ${m.a.toFixed(3)})`;
        ctx.fillRect(Math.round(m.x), Math.round(m.y), m.s, m.s);
      }

      // Occasional shooting star — a short diagonal streak up top
      if (!reduced) {
        if (!shooter && now > nextShot) {
          shooter = {
            x: rand(-40, w * 0.4),
            y: rand(70, Math.max(80, h * 0.28)),
            len: 0,
            dur: 1300,
            start: now,
          };
        }
        if (shooter) {
          const p = (now - shooter.start) / shooter.dur;
          if (p >= 1) {
            shooter = null;
            nextShot = now + rand(30000, 40000);
          } else {
            const speed = w * 0.7;
            const hx = shooter.x + speed * p;
            const hy = shooter.y + speed * 0.5 * p;
            const fade = Math.sin(p * Math.PI); // ease in/out opacity
            for (let i = 0; i < 4; i++) {
              const o = fade * (0.5 - i * 0.11);
              if (o <= 0) continue;
              ctx.fillStyle = `rgba(255, 248, 224, ${o.toFixed(3)})`;
              ctx.fillRect(Math.round(hx - i * 3), Math.round(hy - i * 1.5), 2, 2);
            }
          }
        }
      }

      // Cursor pixel trail — sparks fall a little and evaporate (~400ms)
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        const age = now - sp.born;
        if (age >= sp.life) {
          sparks.splice(i, 1);
          continue;
        }
        sp.vy += 620 / 60;          // gravity px/s per frame
        sp.x += sp.vx / 60;
        sp.y += sp.vy / 60;
        const o = (1 - age / sp.life) * 0.9;
        ctx.fillStyle = sp.warm
          ? `rgba(255, 195, 0, ${o.toFixed(3)})`
          : `rgba(255, 248, 224, ${o.toFixed(3)})`;
        ctx.fillRect(Math.round(sp.x), Math.round(sp.y), sp.s, sp.s);
      }

      raf = requestAnimationFrame(draw);
    }

    // Spawn a few sparks when the mouse actually moves (throttled, mouse only)
    function onPointerMove(e) {
      if (reduced || e.pointerType === 'touch') return;
      const now = performance.now();
      const dx = e.clientX - lastSpark.x;
      const dy = e.clientY - lastSpark.y;
      if (dx * dx + dy * dy < 36 || now - lastSpark.t < 18) return;
      lastSpark = { x: e.clientX, y: e.clientY, t: now };
      if (sparks.length > 140) sparks.splice(0, sparks.length - 140);
      const n = 2 + (Math.random() < 0.5 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        sparks.push({
          x: e.clientX + rand(-2, 2),
          y: e.clientY + rand(-2, 2),
          vx: rand(-28, 28),
          vy: rand(-14, 16),
          born: now,
          life: rand(280, 400),
          s: Math.random() < 0.6 ? 2 : 1,
          warm: Math.random() < 0.45,
        });
      }
    }

    build();
    nextShot = performance.now() + rand(4000, 9000);
    raf = requestAnimationFrame(draw);

    let resizeTimer;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 150);
    };
    window.addEventListener('resize', onResize);
    if (!reduced) window.addEventListener('pointermove', onPointerMove);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      clearTimeout(resizeTimer);
    };
  }, []);

  return <canvas ref={canvasRef} className="starfield" aria-hidden="true" />;
}
