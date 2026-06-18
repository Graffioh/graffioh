// The site title "berto" rendered as a field of particles sampled from the
// word's glyphs. The particles spring toward their home positions, but are
// pushed *away* from the cursor (a "negative magnet") — so hovering carves a
// moving void out of the word, which heals as the cursor leaves.
import React, { useContext, useEffect, useRef, useState } from "react";
import { ThemeContext } from "./ThemeContext";

const TEXT = "bertø";
const FONT_STACK =
  'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif';

// The slashed "ø" closes up at this size — the ring + diagonal crowd its
// counter — so render just that glyph lighter to open it. Everything else
// stays heavy. Tune Ø_WEIGHT (lower = more open) if needed.
const BASE_WEIGHT = 700;
const WEIGHT_OVERRIDES = { ø: 500 };
const weightFor = (ch) => WEIGHT_OVERRIDES[ch] || BASE_WEIGHT;

export default function BertoTitle() {
  const { theme } = useContext(ThemeContext);
  const canvasRef = useRef(null);
  // Bumped whenever the device pixel ratio changes (zoom / monitor switch) to
  // re-render the canvas crisply at the new resolution.
  const [dprVersion, setDprVersion] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const fontSize = 30;
    const padX = 8;
    const cssH = 42;

    // Measure the word to size the canvas snugly around it.
    ctx.font = `700 ${fontSize}px ${FONT_STACK}`;
    const textW = ctx.measureText(TEXT).width;
    const cssW = Math.ceil(textW) + padX * 2;

    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);

    // White on the dark page, near-black on the light one.
    const rgb = theme === "dark" ? "255,255,255" : "26,26,26";

    // Sample the word at Full-HD (1x / CSS) resolution — NOT the device
    // resolution. The dot pattern was tuned around the 30px rasterization (how
    // it looks in a 1x "Full HD" viewport); rasterizing at 2x on Retina subtly
    // reshapes fine features (the e/ø counters) and looked worse. So we sample
    // the glyphs at 1x here for the pattern, then scale the resulting particle
    // positions up to the real device resolution below — crisp on Retina, but
    // with the Full-HD letterforms.
    const off = document.createElement("canvas");
    off.width = cssW;
    off.height = cssH;
    const octx = off.getContext("2d");
    octx.fillStyle = "#fff";
    octx.textBaseline = "middle";
    octx.textAlign = "left";
    octx.font = `700 ${fontSize}px ${FONT_STACK}`;
    octx.fillText(TEXT, padX, cssH / 2 + 1);

    const data = octx.getImageData(0, 0, off.width, off.height).data;
    const gap = Math.max(2, Math.round(2.1)); // sampling grid, in CSS px
    const particles = [];
    for (let y = 0; y < off.height; y += gap) {
      for (let x = 0; x < off.width; x += gap) {
        if (data[(y * off.width + x) * 4 + 3] > 128) {
          // Home position scaled up to device px; start scattered so the word
          // assembles on first paint.
          const hx = x * dpr;
          const hy = y * dpr;
          particles.push({
            hx,
            hy,
            x: hx + (Math.random() - 0.5) * 46 * dpr,
            y: hy + (Math.random() - 0.5) * 46 * dpr,
            vx: 0,
            vy: 0,
          });
        }
      }
    }

    const mouse = { x: -9999, y: -9999 };
    const R = 24 * dpr; // repulsion radius
    const K = 2.0 * dpr; // repulsion strength
    // Integer dot size so the squares land on whole device pixels (crisp, no
    // anti-aliased fuzz). 2px on a Retina (dpr 2) screen, 1px at dpr 1.
    const dot = Math.max(1, Math.round(1.1 * dpr));
    const spring = 0.09;
    const friction = 0.8;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let raf = 0;
    function frame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = `rgba(${rgb},0.92)`;
      for (const p of particles) {
        // Spring toward home.
        let ax = (p.hx - p.x) * spring;
        let ay = (p.hy - p.y) * spring;
        // Push away from the cursor, hardest at the center of the radius.
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < R * R) {
          const d = Math.sqrt(d2) || 0.0001;
          const f = K * (1 - d / R);
          ax += (dx / d) * f;
          ay += (dy / d) * f;
        }
        p.vx = (p.vx + ax) * friction;
        p.vy = (p.vy + ay) * friction;
        p.x += p.vx;
        p.y += p.vy;
        // Snap to whole device pixels so every dot stays a crisp square.
        ctx.fillRect(Math.round(p.x), Math.round(p.y), dot, dot);
      }
      raf = requestAnimationFrame(frame);
    }

    if (reduce) {
      ctx.fillStyle = `rgba(${rgb},0.92)`;
      for (const p of particles) ctx.fillRect(p.hx, p.hy, dot, dot);
    } else {
      raf = requestAnimationFrame(frame);
    }

    function onMove(e) {
      const rect = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) * dpr;
      mouse.y = (e.clientY - rect.top) * dpr;
    }
    function onLeave() {
      mouse.x = -9999;
      mouse.y = -9999;
    }

    // Re-run the whole setup if the device pixel ratio changes (browser zoom,
    // dragging the window to a screen with a different density), so the canvas
    // is always rendered at — and snapped to — the current resolution.
    function onResize() {
      const next = Math.min(window.devicePixelRatio || 1, 2);
      if (next !== dpr) setDprVersion((v) => v + 1);
    }

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", onResize);
    };
  }, [theme, dprVersion]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="berto"
      style={{ display: "block", cursor: "pointer" }}
    />
  );
}
