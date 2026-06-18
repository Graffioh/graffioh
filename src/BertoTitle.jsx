// The site title "berto" rendered as a field of particles sampled from the
// word's glyphs. The particles spring toward their home positions, but are
// pushed *away* from the cursor (a "negative magnet") — so hovering carves a
// moving void out of the word, which heals as the cursor leaves.
import React, { useContext, useEffect, useRef } from "react";
import { ThemeContext } from "./ThemeContext";

const TEXT = "bertø";
const FONT_STACK =
  'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif';

export default function BertoTitle() {
  const { theme } = useContext(ThemeContext);
  const canvasRef = useRef(null);

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

    // Render the word offscreen and sample opaque pixels into particle homes
    // (all coordinates in device px).
    const off = document.createElement("canvas");
    off.width = canvas.width;
    off.height = canvas.height;
    const octx = off.getContext("2d");
    octx.fillStyle = "#fff";
    octx.textBaseline = "middle";
    octx.textAlign = "left";
    octx.font = `700 ${fontSize * dpr}px ${FONT_STACK}`;
    octx.fillText(TEXT, padX * dpr, canvas.height / 2 + 1 * dpr);

    const data = octx.getImageData(0, 0, off.width, off.height).data;
    // Keep a fine sampling grid so every glyph (b/r/t/ø stems) stays well
    // formed; the air between particles comes from a small dot size below,
    // which also keeps the e/ø counters open.
    const gap = Math.max(2, Math.round(2.1 * dpr));
    const particles = [];
    for (let y = 0; y < off.height; y += gap) {
      for (let x = 0; x < off.width; x += gap) {
        if (data[(y * off.width + x) * 4 + 3] > 128) {
          // Start scattered so the word assembles on first paint.
          particles.push({
            hx: x,
            hy: y,
            x: x + (Math.random() - 0.5) * 46 * dpr,
            y: y + (Math.random() - 0.5) * 46 * dpr,
            vx: 0,
            vy: 0,
          });
        }
      }
    }

    const mouse = { x: -9999, y: -9999 };
    const R = 24 * dpr; // repulsion radius
    const K = 2.0 * dpr; // repulsion strength
    const dot = Math.max(1.1, 1.1 * dpr);
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
        ctx.fillRect(p.x, p.y, dot, dot);
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

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="berto"
      style={{ display: "block", cursor: "pointer" }}
    />
  );
}
