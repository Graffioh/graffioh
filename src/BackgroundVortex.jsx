// src/BackgroundVortex.jsx
import React, { useEffect, useRef } from "react";

export default function BackgroundVortex() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: true });

    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let vw = 0;
    let vh = 0;

    const size = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      vw = w;
      vh = h;
    };

    size();
    window.addEventListener("resize", size);

    // Raw pointer and smoothed display cursor
    const raw = { x: vw / 2, y: vh / 2 };
    const cur = { x: raw.x, y: raw.y };
    const prev = { x: cur.x, y: cur.y };
    let stillTimer = 0;

    const onMove = (e) => {
      raw.x = e.clientX;
      raw.y = e.clientY;
    };
    window.addEventListener("pointermove", onMove);

    // Color from body.dark
    const getColor = () =>
      document.body.classList.contains("dark")
        ? "rgba(255,255,255,0.9)"
        : "rgba(0,0,0,0.8)";
    let strokeColor = getColor();

    const observer = new MutationObserver(() => {
      strokeColor = getColor();
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Tunables (tighter, faster, denser)
    const COUNT = 10;
    const TARGET_R = 12;
    const SIGMA = 35;
    const SPIN = 20;
    const SPRING = 1.8;
    const RADIAL_GAIN = 260;
    const DAMP = 0.92;
    const SPEED_SCALE = 110;
    const FOLLOW = 0.4; // 0..1 smoothing toward raw pointer (higher = faster)
    const STILL_SPEED = 5; // px/s threshold to consider "still"
    const FADE = 1.0; // no tint buildup
    const LINE_W = 1.2;
    const WARP_BACK = 60;

    // Particles
    const particles = [];
    const spawnNear = (cx, cy) => {
      const a = Math.random() * Math.PI * 2;
      const r = TARGET_R + (Math.random() - 0.5) * 6;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      return { x, y, px: x, py: y, vx: 0, vy: 0 };
    };
    for (let i = 0; i < COUNT; i++) {
      particles.push(spawnNear(vw * Math.random(), vh * Math.random()));
    }

    let last = performance.now();

    const loop = (t) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((t - last) / 1000, 0.033);
      last = t;

      // Smooth cursor toward the raw pointer (fast but filters jitter)
      cur.x += (raw.x - cur.x) * FOLLOW;
      cur.y += (raw.y - cur.y) * FOLLOW;

      // Velocity-based stillness detection (robust to micro-jitter)
      const speed = Math.hypot(cur.x - prev.x, cur.y - prev.y) / (dt || 1);
      if (speed < STILL_SPEED) stillTimer += dt;
      else stillTimer = 0;
      prev.x = cur.x;
      prev.y = cur.y;

      // Clear previous strokes (transparent)
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = `rgba(0,0,0,${FADE})`;
      ctx.fillRect(0, 0, vw, vh);

      // Draw particle trails
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = LINE_W;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.px = p.x;
        p.py = p.y;

        const dx = p.x - cur.x;
        const dy = p.y - cur.y;
        const r2 = dx * dx + dy * dy + 1e-4;
        const r = Math.sqrt(r2);

        const tx = -dy / r;
        const ty = dx / r;

        const falloff = Math.exp(-(r2 / (2 * SIGMA * SIGMA)));
        const spin = SPIN * falloff;
        const radial = ((r - TARGET_R) / TARGET_R) * SPRING;

        const ax = tx * spin - (dx / r) * radial * RADIAL_GAIN;
        const ay = ty * spin - (dy / r) * radial * RADIAL_GAIN;

        p.vx = (p.vx + ax * dt) * DAMP;
        p.vy = (p.vy + ay * dt) * DAMP;

        p.x += p.vx * dt * SPEED_SCALE;
        p.y += p.vy * dt * SPEED_SCALE;

        if (
          p.x < -WARP_BACK ||
          p.x > vw + WARP_BACK ||
          p.y < -WARP_BACK ||
          p.y > vh + WARP_BACK
        ) {
          const np = spawnNear(cur.x, cur.y);
          p.x = np.x;
          p.y = np.y;
          p.px = p.x;
          p.py = p.y;
          p.vx = 0;
          p.vy = 0;
        }

        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }

      // Draw a crisp ring when effectively still
      if (stillTimer > 0.12) {
        const alpha = Math.min(0.95, (stillTimer - 0.12) / 0.35);
        const ringColor = strokeColor.replace(
          /rgba?\(([^)]+)\)/,
          (_, inner) => {
            const parts = inner.split(",").map((s) => s.trim());
            if (parts.length === 3) return `rgba(${parts.join(",")},${alpha})`;
            parts[3] = String(alpha);
            return `rgba(${parts.join(",")})`;
          }
        );
        ctx.beginPath();
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 1.3;
        ctx.arc(cur.x, cur.y, TARGET_R, 0, Math.PI * 2);
        ctx.stroke();
      }
    };

    loop(last);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
      window.removeEventListener("pointermove", onMove);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="background-vortex fixed inset-0 -z-10 pointer-events-none"
    />
  );
}