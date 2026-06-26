import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import ImageLightbox from "./ImageLightbox";

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

// Figure geometry (SVG user units). The figure is intrinsically dark — a glowing
// red→blue curve on deep space — so it keeps its own palette on both site themes
// (like an embedded photo), rather than inverting with the page.
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
function buildSurpriseSvg() {
  const X = (p) => ML + p * PW;
  const Y = (s) => MT + (1 - s / SMAX) * PH;

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
      <line x1="${f2(x)}" y1="${f2(Y(0))}" x2="${f2(x)}" y2="${f2(Y(0) + 10)}" stroke="rgba(220,222,235,0.45)" stroke-width="1.4"/>
      <text x="${f2(x)}" y="${f2(Y(0) + 44)}" text-anchor="middle" font-family="${SERIF}" font-size="27" fill="#cfd0db">${p.toFixed(2)}</text>`;
  }).join("");

  const yTicks = [0, 1, 2, 3, 4, 5, 6, 7].map((s) => {
    const y = Y(s);
    return `
      <line x1="${f2(ML - 10)}" y1="${f2(y)}" x2="${f2(ML)}" y2="${f2(y)}" stroke="rgba(220,222,235,0.45)" stroke-width="1.4"/>
      <text x="${f2(ML - 22)}" y="${f2(y + 9)}" text-anchor="end" font-family="${SERIF}" font-size="27" fill="#cfd0db">${s}</text>`;
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
    <radialGradient id="sp-bg" cx="34%" cy="20%" r="105%">
      <stop offset="0%" stop-color="#15151f"/>
      <stop offset="46%" stop-color="#0a0a11"/>
      <stop offset="100%" stop-color="#030206"/>
    </radialGradient>
    <linearGradient id="sp-curve" gradientUnits="userSpaceOnUse" x1="${f2(startX)}" y1="0" x2="${f2(endX)}" y2="0">
      <stop offset="0%" stop-color="#ff2d2d"/>
      <stop offset="22%" stop-color="#f23a55"/>
      <stop offset="46%" stop-color="#c0459b"/>
      <stop offset="70%" stop-color="#6e74e8"/>
      <stop offset="100%" stop-color="#33b1ff"/>
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

  <rect x="0" y="0" width="${W}" height="${H}" rx="16" fill="url(#sp-bg)"/>

  <!-- axes + ticks -->
  <line x1="${ML}" y1="${MT}" x2="${ML}" y2="${f2(Y(0))}" stroke="rgba(220,222,235,0.30)" stroke-width="1.5"/>
  <line x1="${ML}" y1="${f2(Y(0))}" x2="${f2(X(1))}" y2="${f2(Y(0))}" stroke="rgba(200,202,220,0.28)" stroke-width="1.4" stroke-dasharray="2 7" stroke-linecap="round"/>
  ${xTicks}
  ${yTicks}

  <!-- axis titles -->
  <text x="${f2(ML + PW / 2)}" y="${H - 28}" text-anchor="middle" font-family="${SERIF}" font-size="32" fill="#e7e8f0">Probability</text>
  <text x="44" y="${f2(MT + PH / 2)}" text-anchor="middle" font-family="${SERIF}" font-size="32" fill="#e7e8f0" transform="rotate(-90 44 ${f2(MT + PH / 2)})">Surprise</text>

  <!-- the curve: blurred halo under a crisp core, both gradient-stroked -->
  <path class="sp-halo" d="${d}" fill="none" stroke="url(#sp-curve)" stroke-width="15" stroke-linecap="round" opacity="0.40" filter="url(#sp-glow)" pathLength="1"/>
  <path class="sp-core" d="${d}" fill="none" stroke="url(#sp-curve)" stroke-width="4.5" stroke-linecap="round" pathLength="1"/>

  <!-- glowing end-caps -->
  <circle class="sp-fade sp-d2" cx="${f2(startX)}" cy="${f2(startY)}" r="9" fill="#ff5a5a" filter="url(#sp-glow)"/>
  <circle class="sp-fade sp-d2" cx="${f2(endX)}" cy="${f2(endY)}" r="9" fill="#4bb6ff" filter="url(#sp-glow)"/>

  <!-- curve labels -->
  <text class="sp-fade sp-d1" x="${f2(X(0.045))}" y="${f2(MT + 30)}" font-family="${SERIF}" font-size="42" font-weight="700" fill="#ff5454" style="font-style:italic">Rare</text>
  <text class="sp-fade sp-d3" x="${f2(X(0.74))}" y="${f2(Y(0.95))}" font-family="${SERIF}" font-size="42" font-weight="700" fill="#46b4ff" style="font-style:italic">Common</text>

  <!-- just h(s) — the full definition sits in the prose above the figure -->
  <g class="sp-fade sp-d2" font-family="${SERIF}" fill="#f4f4f8">
    <g filter="url(#sp-soft)" opacity="0.5">
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
    return build();
  }, [spec, fenceLang]);

  // The figure is its own deep-space plate regardless of page theme; the frame
  // just tints its rim/glow to sit against the light or dark page.
  const frame = {
    borderRadius: "0.7em",
    overflow: "hidden",
    border: isDark
      ? "1px solid rgba(150,150,185,0.28)"
      : "1px solid rgba(40,40,60,0.35)",
    boxShadow: isDark
      ? "0 0 22px 1px rgba(120,110,190,0.22)"
      : "0 8px 30px -10px rgba(0,0,0,0.5), 0 0 18px 0 rgba(80,70,150,0.18)",
    background: "#05050a",
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
