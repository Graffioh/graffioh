// Shared chrome for every code surface on the site — the "photographic
// negative" slab (light slab + olive glow in dark mode, dark slab + purple
// glow in light mode) and the Prism setup that renders onto it. One home for
// all of it so ContentViewer / PythonRunner / CodeFile / Mermaid stay visually
// in sync instead of each carrying its own copy.

// PrismAsyncLight instead of the full Prism build: the full build inlines
// every Prism language into the main bundle (hundreds of KB), and this module
// is reached from ContentViewer — i.e. every route. The async-light build
// ships only the core and lazy-loads a language definition the first time a
// block actually uses it (unknown languages just render unhighlighted).
export { PrismAsyncLight as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  vscDarkPlus,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";

// The async-light loader only knows refractor's canonical language names — the
// full build also answered to aliases (js, sh, …) because every language was
// pre-registered. Map the common fence shorthands back to canonical names so
// existing content keeps its highlighting.
const LANG_ALIAS = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  yml: "yaml",
  md: "markdown",
  rb: "ruby",
  rs: "rust",
  golang: "go",
  "c++": "cpp",
  cs: "csharp",
  html: "markup",
  xml: "markup",
  svg: "markup",
};
export function canonicalLang(lang) {
  return LANG_ALIAS[lang] || lang;
}

// Prism themes paint their own background on the <pre>/<code>/token elements.
// Layered over the slab gradient, that shows up as per-line "bands". Strip
// every background so the slab is the only one that renders.
function stripBackgrounds(style) {
  const out = {};
  for (const selector in style) {
    const rule = style[selector];
    if (rule && typeof rule === "object") {
      const { background, backgroundColor, backgroundImage, ...rest } = rule;
      out[selector] = rest;
    } else {
      out[selector] = rule;
    }
  }
  return out;
}
export const ONE_LIGHT_NO_BG = stripBackgrounds(oneLight);
export const VSC_DARK_PLUS_NO_BG = stripBackgrounds(vscDarkPlus);

// The slab palette. Visual CSS fields (color/border/boxShadow/background) plus
// the ink/accent tokens the interactive slabs (PythonRunner, CodeFile) use for
// buttons, rails, active-line highlights, and sub-panels.
export function slab(isDark) {
  return isDark
    ? {
        // white-matter slab — olive rim glow + soft inner light
        color: "#12120a",
        ink: "#12120a",
        accent: "rgba(135,145,65,1)",
        active: "rgba(135,145,65,0.20)",
        panel: "rgba(0,0,0,0.05)",
        border: "1px solid rgba(105,105,70,0.22)",
        boxShadow:
          "0 0 18px 1px rgba(135,145,65,0.16), inset 0 0 30px rgba(255,255,255,0.6)",
        background:
          "radial-gradient(130% 160% at 50% 0%, #f1f1ee 0%, #eaeae6 55%, #e2e2dd 100%)",
      }
    : {
        // black-matter slab — event-horizon glow like the orbs
        color: "#ededf5",
        ink: "#ededf5",
        accent: "rgba(150,140,220,1)",
        active: "rgba(120,110,190,0.28)",
        panel: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(150,150,185,0.22)",
        boxShadow:
          "0 0 18px 1px rgba(120,110,190,0.16), inset 0 0 30px rgba(0,0,0,0.55)",
        background:
          "radial-gradient(130% 160% at 50% 0%, #16161e 0%, #0b0b10 55%, #050507 100%)",
      };
}

// Just the spreadable CSS fields, for callers that drop the slab straight into
// a `style` prop (Mermaid, the lightbox) — keeps the non-CSS tokens out.
export function slabCss(isDark) {
  const { color, border, boxShadow, background } = slab(isDark);
  return { color, border, boxShadow, background };
}
