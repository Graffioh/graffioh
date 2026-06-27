import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import ImageLightbox from "./ImageLightbox";
import { slab } from "./codeSlab";

// A dependency-free math figure block. The curve is an analytic function sampled
// in JS and emitted as a single self-contained SVG string — no charting library,
// no WASM, nothing lazy-loaded: it adds zero weight to the bundle and renders
// synchronously, so it can't slow down md rendering or the page. The SVG is the
// same string the zoom lightbox uses (mirroring Mermaid), so zoom comes for free.
//
// Authored as a fenced block:
//   ```surprise            (shorthand)
//   ```plot                (with optional JSON config in the body)
//   { "type": "surprise" }
//   ```

// Figure geometry (SVG user units). The figure follows the site's "photographic
// negative" slab system (like Mermaid / the code slabs): a LIGHT slab + dark ink
// on the dark page, a DARK slab + light ink on the light page. Only the red/blue
// curve keeps its hue (it reads on both), tuned a touch per slab for contrast.
const W = 1040;
const H = 820;
const ML = 120; // left margin (y-axis + "Surprise")
const MR = 70;
const MT = 70;
const MB = 120; // bottom margin (x-axis + "Probability")
const PW = W - ML - MR; // plot width
const PH = H - MT - MB; // plot height
const SMAX = 7; // top of the surprise axis (−ln(e^−7) = 7)

const SERIF = "Georgia, 'Times New Roman', 'Cambria Math', serif";
const f2 = (n) => (Math.round(n * 100) / 100).toString();

// Self-information / "surprise": h(p) = log(1/p) = −ln(p). Rare events (small p)
// carry high surprise; certain ones (p→1) carry none. It's the per-token term
// inside cross-entropy, which is why this sits under the cross-entropy section.
function buildSurpriseSvg(isDark) {
  const X = (p) => ML + p * PW;
  const Y = (s) => MT + (1 - s / SMAX) * PH;

  // Photographic-negative ink: dark on the light slab (dark page), light on the
  // dark slab (light page). The slab background itself comes from the container /
  // lightbox (slab()), so the SVG is transparent — exactly like Mermaid.
  const inkRgb = isDark ? "24,24,16" : "237,237,245";
  const ink = `rgb(${inkRgb})`;
  const titleFill = `rgba(${inkRgb},0.95)`;
  const tickFill = `rgba(${inkRgb},0.72)`;
  const tickLine = `rgba(${inkRgb},0.42)`;
  const axisLine = `rgba(${inkRgb},0.32)`;
  const baseLine = `rgba(${inkRgb},0.30)`;

  // Curve + accents keep their red→blue identity on both slabs, nudged a touch
  // deeper on the light slab so they still read against white.
  const grad = isDark
    ? ["#ee1f1f", "#e03358", "#b23f93", "#5358d6", "#1f93e6"]
    : ["#ff2d2d", "#f23a55", "#c0459b", "#6e74e8", "#33b1ff"];
  const redLabel = isDark ? "#e22a2a" : "#ff5454";
  const blueLabel = isDark ? "#1f86d6" : "#46b4ff";
  const redCap = isDark ? "#ee3636" : "#ff5a5a";
  const blueCap = isDark ? "#2090e0" : "#4bb6ff";

  // Sample p geometrically from where s = SMAX (p = e^−SMAX) up to 1, so points
  // bunch up where the curve is near-vertical and the trace stays smooth.
  const pStart = Math.exp(-SMAX);
  const N = 220;
  let d = "";
  for (let i = 0; i <= N; i++) {
    const p = pStart * Math.pow(1 / pStart, i / N);
    const s = Math.min(-Math.log(p), SMAX);
    d += `${i === 0 ? "M" : "L"}${f2(X(p))} ${f2(Y(s))} `;
  }
  d = d.trim();

  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((p) => {
    const x = X(p);
    return `
      <line x1="${f2(x)}" y1="${f2(Y(0))}" x2="${f2(x)}" y2="${f2(Y(0) + 10)}" stroke="${tickLine}" stroke-width="1.4"/>
      <text x="${f2(x)}" y="${f2(Y(0) + 44)}" text-anchor="middle" font-family="${SERIF}" font-size="27" fill="${tickFill}">${p.toFixed(2)}</text>`;
  }).join("");

  const yTicks = [0, 1, 2, 3, 4, 5, 6, 7].map((s) => {
    const y = Y(s);
    return `
      <line x1="${f2(ML - 10)}" y1="${f2(y)}" x2="${f2(ML)}" y2="${f2(y)}" stroke="${tickLine}" stroke-width="1.4"/>
      <text x="${f2(ML - 22)}" y="${f2(y + 9)}" text-anchor="end" font-family="${SERIF}" font-size="27" fill="${tickFill}">${s}</text>`;
  }).join("");

  // The bright glowing end-caps: a red blob where the curve climbs off the top,
  // a blue one where it settles onto the baseline — same as the reference figure.
  const startX = X(pStart);
  const startY = Y(SMAX);
  const endX = X(1);
  const endY = Y(0);

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="auto" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Surprise versus probability: h(s) = log 1 over p_s" style="display:block">
  <defs>
    <linearGradient id="sp-curve" gradientUnits="userSpaceOnUse" x1="${f2(startX)}" y1="0" x2="${f2(endX)}" y2="0">
      <stop offset="0%" stop-color="${grad[0]}"/>
      <stop offset="22%" stop-color="${grad[1]}"/>
      <stop offset="46%" stop-color="${grad[2]}"/>
      <stop offset="70%" stop-color="${grad[3]}"/>
      <stop offset="100%" stop-color="${grad[4]}"/>
    </linearGradient>
    <filter id="sp-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="7" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="sp-soft" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="9"/>
    </filter>
    <style>
      .sp-core, .sp-halo { stroke-dasharray: 1; stroke-dashoffset: 1; animation: sp-draw 1.7s cubic-bezier(.22,.61,.36,1) .15s forwards; }
      .sp-fade { opacity: 0; animation: sp-fade 0.9s ease-out forwards; }
      .sp-d1 { animation-delay: 1.05s; } .sp-d2 { animation-delay: 1.3s; } .sp-d3 { animation-delay: 1.5s; }
      @keyframes sp-draw { to { stroke-dashoffset: 0; } }
      @keyframes sp-fade { to { opacity: 1; } }
      @media (prefers-reduced-motion: reduce) {
        .sp-core, .sp-halo { stroke-dashoffset: 0; animation: none; }
        .sp-fade { opacity: 1; animation: none; }
      }
    </style>
  </defs>

  <!-- axes + ticks -->
  <line x1="${ML}" y1="${MT}" x2="${ML}" y2="${f2(Y(0))}" stroke="${axisLine}" stroke-width="1.5"/>
  <line x1="${ML}" y1="${f2(Y(0))}" x2="${f2(X(1))}" y2="${f2(Y(0))}" stroke="${baseLine}" stroke-width="1.4" stroke-dasharray="2 7" stroke-linecap="round"/>
  ${xTicks}
  ${yTicks}

  <!-- axis titles -->
  <text x="${f2(ML + PW / 2)}" y="${H - 28}" text-anchor="middle" font-family="${SERIF}" font-size="32" fill="${titleFill}">Probability</text>
  <text x="44" y="${f2(MT + PH / 2)}" text-anchor="middle" font-family="${SERIF}" font-size="32" fill="${titleFill}" transform="rotate(-90 44 ${f2(MT + PH / 2)})">Surprise</text>

  <!-- the curve: blurred halo under a crisp core, both gradient-stroked -->
  <path class="sp-halo" d="${d}" fill="none" stroke="url(#sp-curve)" stroke-width="15" stroke-linecap="round" opacity="0.40" filter="url(#sp-glow)" pathLength="1"/>
  <path class="sp-core" d="${d}" fill="none" stroke="url(#sp-curve)" stroke-width="4.5" stroke-linecap="round" pathLength="1"/>

  <!-- glowing end-caps -->
  <circle class="sp-fade sp-d2" cx="${f2(startX)}" cy="${f2(startY)}" r="9" fill="${redCap}" filter="url(#sp-glow)"/>
  <circle class="sp-fade sp-d2" cx="${f2(endX)}" cy="${f2(endY)}" r="9" fill="${blueCap}" filter="url(#sp-glow)"/>

  <!-- curve labels -->
  <text class="sp-fade sp-d1" x="${f2(X(0.045))}" y="${f2(MT + 30)}" font-family="${SERIF}" font-size="42" font-weight="700" fill="${redLabel}" style="font-style:italic">Rare</text>
  <text class="sp-fade sp-d3" x="${f2(X(0.74))}" y="${f2(Y(0.95))}" font-family="${SERIF}" font-size="42" font-weight="700" fill="${blueLabel}" style="font-style:italic">Common</text>

  <!-- just h(s) — the full definition sits in the prose above the figure -->
  <g class="sp-fade sp-d2" font-family="${SERIF}" fill="${ink}">
    <g filter="url(#sp-soft)" opacity="0.45">
      <text x="${f2(X(0.46))}" y="${f2(Y(4.1) + 22)}" text-anchor="middle" font-size="66"><tspan font-style="italic">h</tspan>(<tspan font-style="italic">s</tspan>)</text>
    </g>
    <text x="${f2(X(0.46))}" y="${f2(Y(4.1) + 22)}" text-anchor="middle" font-size="66"><tspan font-style="italic">h</tspan>(<tspan font-style="italic">s</tspan>)</text>
  </g>
</svg>`.trim();
}

// Parse the fence body into a figure type. Empty body or a bare preset word are
// both accepted; a JSON object can carry a `type`. Anything unrecognized falls
// back to the surprise curve so a typo still renders something sensible.
function specType(spec, fenceLang) {
  if (fenceLang === "surprise") return "surprise";
  const body = (spec || "").trim();
  if (!body) return "surprise";
  if (/^[a-z][\w-]*$/i.test(body)) return body.toLowerCase();
  try {
    const cfg = JSON.parse(body);
    return (cfg && cfg.type) || "surprise";
  } catch {
    return "surprise";
  }
}

const BUILDERS = { surprise: buildSurpriseSvg };

// A frame that holds the dark figure. Border + glow tint with the page theme so
// the plate nestles in, but the figure interior stays dark on both themes.
export default function Plot({ spec, fenceLang, theme, zoomable = true }) {
  const isDark = theme === "dark";
  const [expanded, setExpanded] = useState(false);

  const svg = useMemo(() => {
    const build = BUILDERS[specType(spec, fenceLang)] || buildSurpriseSvg;
    return build(isDark);
  }, [spec, fenceLang, isDark]);

  // Photographic-negative plate: a light slab on the dark page, a dark slab on
  // the light page (same background as Mermaid / the code slabs). In dark mode
  // the rim is white and the glow neutral-grey; in light mode a soft dark rim.
  const frame = {
    borderRadius: "0.7em",
    overflow: "hidden",
    border: isDark
      ? "1px solid rgba(255,255,255,0.55)"
      : "1px solid rgba(40,40,60,0.35)",
    boxShadow: isDark
      ? "0 8px 28px -10px rgba(0,0,0,0.55), 0 0 20px 1px rgba(200,200,210,0.20)"
      : "0 8px 30px -10px rgba(0,0,0,0.5), 0 0 18px 0 rgba(80,70,150,0.18)",
    background: slab(isDark).background,
  };

  const canZoom = zoomable && !!svg;
  return (
    <>
      <div
        className="my-4 mx-auto"
        onClick={canZoom ? () => setExpanded(true) : undefined}
        style={{
          ...frame,
          width: "min(100%, 520px)",
          cursor: canZoom ? "zoom-in" : undefined,
        }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {expanded &&
        createPortal(
          <ImageLightbox
            key={svg}
            svg={svg}
            slabStyle={{ ...frame, padding: 0 }}
            maxWidthPx={980}
            alt="surprise versus probability"
            onClose={() => setExpanded(false)}
          />,
          document.body
        )}
    </>
  );
}
