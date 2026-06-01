import React, { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { topics } from "../dumps";
import { ThemeContext } from "../ThemeContext";

const ORB_SIZE = 34; // px — small
const R = ORB_SIZE / 2;
const SLOW_RADIUS = 160; // px — cursor influence: orbs slow down within this
const MIN_FACTOR = 0.1; // how much speed remains right under the cursor

export default function DumpPage() {
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const boxRef = useRef(null);
  const canvasRef = useRef(null);
  const orbRefs = useRef([]);
  const stateRef = useRef([]); // [{x, y, vx, vy, phase}]
  const partsRef = useRef([]); // collision particles
  const ringsRef = useRef([]); // collision shock rings
  const flashesRef = useRef([]); // collision impact flashes
  const pointerRef = useRef({ x: -9999, y: -9999, inside: false });

  // keep the latest theme reachable from inside the rAF loop
  const themeRef = useRef(theme);
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  // which orb is highlighted from the title list
  const [hoveredId, setHoveredId] = useState(null);
  const hoveredRef = useRef(null);
  const setHover = (id) => {
    hoveredRef.current = id;
    setHoveredId(id);
  };

  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const rect = () => box.getBoundingClientRect();

    const sizeCanvas = () => {
      const { width, height } = rect();
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // Seed positions/velocities, spread across the canvas.
    const init = () => {
      const { width, height } = rect();
      stateRef.current = topics.map((_, i) => {
        const cols = Math.ceil(Math.sqrt(topics.length));
        const rows = Math.ceil(topics.length / cols);
        const cx = ((i % cols) + 0.5) * (width / cols);
        const cy = (Math.floor(i / cols) + 0.5) * (height / rows);
        const angle = (i / topics.length) * Math.PI * 2 + 0.6;
        const speed = 95 + (i % 3) * 25; // px/s — zippy when away from cursor
        return {
          x: Math.min(Math.max(cx - R, 0), width - ORB_SIZE),
          y: Math.min(Math.max(cy - R, 0), height - ORB_SIZE),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          phase: i * 1.7,
        };
      });
    };
    sizeCanvas();
    init();

    // emit a burst at a collision point (box-local coords).
    // nx,ny = the collision normal; sparks spray out sideways along the
    // tangent (perpendicular to the impact line) like a real impact splash.
    const burst = (x, y, nx, ny, impact) => {
      const strength = Math.min(impact / 140, 1); // 0..1 normalized impact
      const n = 14 + Math.floor(strength * 16);
      const tx = -ny;
      const ty = nx; // tangent direction
      for (let k = 0; k < n; k++) {
        // alternate the two sides of the impact line, with a soft fan spread
        const side = k % 2 === 0 ? 1 : -1;
        const a = Math.atan2(ty * side, tx * side) + (Math.random() - 0.5) * 1.6;
        const sp = 60 + Math.random() * (150 + impact);
        partsRef.current.push({
          x, y,
          px: x, py: y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 0.4 + Math.random() * 0.5,
          age: 0,
          size: 0.8 + Math.random() * 2.4,
          heat: Math.random(), // 0 cool .. 1 hot core
        });
      }
      ringsRef.current.push({ x, y, life: 0.55, age: 0, max: 26 + strength * 34 });
      flashesRef.current.push({ x, y, life: 0.16, age: 0, r: 12 + strength * 20 });
      if (partsRef.current.length > 600) partsRef.current.splice(0, partsRef.current.length - 600);
    };

    // Track the cursor in canvas-local coordinates.
    const onMove = (e) => {
      const r = rect();
      pointerRef.current = {
        x: e.clientX - r.left,
        y: e.clientY - r.top,
        inside:
          e.clientX >= r.left && e.clientX <= r.right &&
          e.clientY >= r.top && e.clientY <= r.bottom,
      };
    };
    const onLeave = () => (pointerRef.current.inside = false);
    window.addEventListener("pointermove", onMove);
    box.addEventListener("pointerleave", onLeave);

    let raf = 0;
    let last = performance.now();

    const loop = (t) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((t - last) / 1000, 0.033);
      last = t;

      const { width, height } = rect();
      const maxX = width - ORB_SIZE;
      const maxY = height - ORB_SIZE;
      const ptr = pointerRef.current;
      const orbs = stateRef.current;

      // 1) integrate each orb (steer, slow near cursor, move, bounce off walls)
      orbs.forEach((s, i) => {
        const steer = Math.sin(t * 0.0004 + s.phase) * 0.9 * dt;
        const cos = Math.cos(steer);
        const sin = Math.sin(steer);
        const nvx = s.vx * cos - s.vy * sin;
        const nvy = s.vx * sin + s.vy * cos;
        s.vx = nvx;
        s.vy = nvy;

        let factor = 1;
        if (ptr.inside) {
          const d = Math.hypot(ptr.x - (s.x + R), ptr.y - (s.y + R));
          if (d < SLOW_RADIUS) factor = MIN_FACTOR + (1 - MIN_FACTOR) * (d / SLOW_RADIUS);
        }
        if (hoveredRef.current === topics[i].id) factor = Math.min(factor, 0.04);

        s.x += s.vx * dt * factor;
        s.y += s.vy * dt * factor;

        if (s.x <= 0) { s.x = 0; s.vx = Math.abs(s.vx); }
        else if (s.x >= maxX) { s.x = maxX; s.vx = -Math.abs(s.vx); }
        if (s.y <= 0) { s.y = 0; s.vy = Math.abs(s.vy); }
        else if (s.y >= maxY) { s.y = maxY; s.vy = -Math.abs(s.vy); }
      });

      // 2) rigid orb-orb collisions (equal-mass elastic) + particle burst
      for (let i = 0; i < orbs.length; i++) {
        for (let j = i + 1; j < orbs.length; j++) {
          const a = orbs[i];
          const b = orbs[j];
          let nx = (b.x + R) - (a.x + R);
          let ny = (b.y + R) - (a.y + R);
          let dist = Math.hypot(nx, ny);
          if (dist === 0) { nx = 1; ny = 0; dist = 0.001; }
          if (dist < ORB_SIZE) {
            nx /= dist; ny /= dist;
            // push apart so they never overlap (rigid)
            const overlap = ORB_SIZE - dist;
            a.x -= nx * overlap / 2; a.y -= ny * overlap / 2;
            b.x += nx * overlap / 2; b.y += ny * overlap / 2;
            // relative velocity along the collision normal
            const along = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
            if (along > 0) {
              a.vx -= along * nx; a.vy -= along * ny;
              b.vx += along * nx; b.vy += along * ny;
              // spark burst at the contact point
              burst((a.x + R + b.x + R) / 2, (a.y + R + b.y + R) / 2, nx, ny, Math.abs(along));
            }
          }
        }
      }

      // 3) write orb positions
      orbs.forEach((s, i) => {
        const el = orbRefs.current[i];
        if (el) el.style.transform = `translate(${s.x}px, ${s.y}px)`;
      });

      // 4) update + draw flashes / rings / particles on the overlay canvas
      ctx.clearRect(0, 0, width, height);
      const dark = themeRef.current === "dark";
      // additive glow on dark backgrounds; plain blending on light ones
      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";

      // impact flashes — a quick bright pop right at the contact point
      const flashes = flashesRef.current;
      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        f.age += dt;
        const p = f.age / f.life;
        if (p >= 1) { flashes.splice(i, 1); continue; }
        const a = 1 - p;
        const rad = f.r * (0.6 + p * 0.5);
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, rad);
        if (dark) {
          g.addColorStop(0, `rgba(255,255,255,${a})`);
          g.addColorStop(0.4, `rgba(180,190,255,${a * 0.7})`);
          g.addColorStop(1, "rgba(120,130,255,0)");
        } else {
          g.addColorStop(0, `rgba(80,55,150,${a * 0.9})`);
          g.addColorStop(0.5, `rgba(45,30,95,${a * 0.5})`);
          g.addColorStop(1, "rgba(30,20,70,0)");
        }
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(f.x, f.y, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      // shock rings — ease-out expansion, crisp thinning stroke
      const rings = ringsRef.current;
      for (let i = rings.length - 1; i >= 0; i--) {
        const rg = rings[i];
        rg.age += dt;
        const p = rg.age / rg.life;
        if (p >= 1) { rings.splice(i, 1); continue; }
        const ease = 1 - (1 - p) * (1 - p); // easeOutQuad
        const rad = 5 + ease * rg.max;
        const a = (1 - p) * 0.75;
        ctx.beginPath();
        ctx.arc(rg.x, rg.y, rad, 0, Math.PI * 2);
        ctx.strokeStyle = dark
          ? `rgba(190,200,255,${a})`
          : `rgba(60,45,120,${a})`;
        ctx.lineWidth = 2.4 * (1 - p) + 0.4;
        ctx.stroke();
      }

      // spark particles — glowing streaks that arc with gravity + drag
      const parts = partsRef.current;
      ctx.lineCap = "round";
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.age += dt;
        if (p.age >= p.life) { parts.splice(i, 1); continue; }
        p.px = p.x;
        p.py = p.y;
        p.vy += 120 * dt; // gentle gravity so sparks arc downward
        p.vx *= 0.95;
        p.vy *= 0.95; // air drag
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const a = 1 - p.age / p.life;
        if (dark) {
          // white-hot core cooling to indigo as it fades
          const r = 170 + Math.floor(85 * p.heat * a);
          const gch = 180 + Math.floor(70 * p.heat * a);
          ctx.strokeStyle = `rgba(${r},${gch},255,${a})`;
        } else {
          // dark violet matter flung out of the black holes
          const r = 75 - Math.floor(35 * p.heat);
          const gch = 48 - Math.floor(22 * p.heat);
          const b = 130 - Math.floor(45 * p.heat);
          ctx.strokeStyle = `rgba(${r},${gch},${b},${a})`;
        }
        ctx.lineWidth = p.size * a + 0.3;
        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }

      ctx.globalCompositeOperation = "source-over";
    };
    raf = requestAnimationFrame(loop);

    const onResize = () => { sizeCanvas(); init(); };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      box.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-center pt-4 pb-3">dump</h1>

      {/* title list — hover to highlight the matching orb, click to open */}
      <ul className="flex flex-wrap justify-center gap-x-2 gap-y-1 pb-4 text-xs">
        {topics.map((topic, idx) => (
          <li key={topic.id} className="flex items-center gap-x-2">
            {idx > 0 && (
              <span className="text-stone-500 select-none">-</span>
            )}
            <button
              onClick={() => navigate(`/dump/${topic.id}`)}
              onMouseEnter={() => setHover(topic.id)}
              onMouseLeave={() => setHover(null)}
              className={`transition-colors hover:underline ${
                hoveredId === topic.id
                  ? theme === "dark"
                    ? "text-white"
                    : "text-black"
                  : "text-stone-400"
              }`}
            >
              {topic.title}
            </button>
          </li>
        ))}
      </ul>

      <div
        ref={boxRef}
        className="relative overflow-hidden h-[80vh] w-full"
      >
        {topics.map((topic, i) => {
          const isHot = hoveredId === topic.id;
          return (
            // outer wrapper: JS drives its translate (position) every frame
            <div
              key={topic.id}
              ref={(el) => (orbRefs.current[i] = el)}
              className="absolute top-0 left-0 will-change-transform"
              style={{ width: ORB_SIZE, height: ORB_SIZE }}
            >
              {/* inner button: owns hover/scale — no conflict with the translate above */}
              <button
                onClick={() => navigate(`/dump/${topic.id}`)}
                onMouseEnter={() => setHover(topic.id)}
                onMouseLeave={() => setHover(null)}
                title={topic.title}
                aria-label={topic.title}
                className={`w-full h-full rounded-full select-none transition-transform duration-200 hover:scale-150 active:scale-95 ${
                  isHot ? "scale-150" : ""
                }`}
                style={{
                  // black-matter / black-hole: dead black core, faint event-horizon rim
                  background:
                    "radial-gradient(circle at 50% 50%, #000 60%, #050505 74%, rgba(0,0,0,0) 100%)",
                  boxShadow: isHot
                    ? "0 0 12px 3px rgba(0,0,0,0.6), 0 0 40px 7px rgba(150,150,210,0.55), inset 0 0 10px rgba(0,0,0,1)"
                    : "0 0 12px 3px rgba(0,0,0,0.55), 0 0 26px 2px rgba(90,90,130,0.22), inset 0 0 8px rgba(0,0,0,1)",
                  border: isHot
                    ? "1px solid rgba(190,190,230,0.9)"
                    : "1px solid rgba(140,140,170,0.35)",
                }}
              />
              {/* title always shown just below the orb; drops lower on hover
                  so the scaled-up orb doesn't crowd it */}
              <span
                className={`absolute left-1/2 top-full whitespace-nowrap text-center font-bold text-[10px] leading-tight pointer-events-none transition-all duration-200 ${
                  isHot ? "text-white" : "text-stone-300"
                }`}
                style={{
                  transform: `translateX(-50%) translateY(${isHot ? 14 : 3}px)`,
                  textShadow:
                    "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
                }}
              >
                {topic.title}
              </span>
            </div>
          );
        })}

        {/* particle overlay — sits above the orbs, never blocks clicks */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
        />
      </div>
    </div>
  );
}
