import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ImageLightbox from "./ImageLightbox";
import { slabCss } from "./codeSlab";

// Mermaid is heavy (~500kb), so it's pulled in on demand the first time a
// diagram actually shows up — the import is cached as a module-level promise so
// every later diagram (and theme flip) reuses the same instance.
let mermaidPromise = null;
function loadMermaid() {
  if (!mermaidPromise) mermaidPromise = import("mermaid").then((m) => m.default);
  return mermaidPromise;
}

// mermaid.render needs a unique DOM id per call (it injects a temp node to
// measure). A monotonic counter keeps them collision-free across instances and
// re-renders without needing Math.random / Date.now.
let seq = 0;

// The shared "photographic negative" slab (codeSlab.js): in dark mode the page
// goes light (white-matter slab + olive glow), in light mode it goes dark
// (event-horizon slab + purple glow). The diagram ink therefore has to invert
// the *opposite* way to the app theme — a dark slab wants the light-ink "dark"
// mermaid theme, a light slab wants the dark-ink "neutral" one.
const slab = slabCss;

// Render a ```mermaid fenced block as an actual diagram. `code` is the raw
// mermaid source; `theme` is the app's "dark" | "light". When `zoomable`, the
// diagram opens in the shared lightbox on click — same as images.
export default function Mermaid({ code, theme, zoomable = true }) {
  const isDark = theme === "dark";
  const [svg, setSvg] = useState("");
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    loadMermaid().then(async (mermaid) => {
      // Arrows track the slab's ink so they read against it: black on the light
      // (dark-mode) slab, white on the dark (light-mode) slab.
      const lineColor = isDark ? "#12120a" : "#ededf5";
      // The edge-label box masks the line so the text stays readable (a white
      // label can't sit on a white arrow). Tint it to the slab so it blends in
      // instead of looking like a block dropped on top of the dotted edge.
      const edgeLabelBackground = isDark ? "#e8e8e3" : "#0d0d13";
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: isDark ? "neutral" : "dark",
        themeVariables: {
          lineColor,
          edgeLabelBackground,
          fontFamily: "inherit",
          fontSize: "18px", // a touch larger than the 16px default
        },
        // Wider rank gap + padding so the long edge labels (e.g.
        // "W₁ᵀ g₁ = ∂L/∂x") get breathing room instead of crowding the nodes
        // and the slab edges.
        flowchart: {
          useMaxWidth: true,
          htmlLabels: false,
          rankSpacing: 130,
          nodeSpacing: 60,
          diagramPadding: 16,
        },
      });
      try {
        const { svg } = await mermaid.render(`mermaid-${seq++}`, code);
        if (!cancelled) setSvg(svg);
      } catch {
        if (!cancelled) setFailed(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [code, isDark]);

  // Parse error → fall back to showing the source so nothing silently vanishes.
  if (failed) {
    return (
      <pre
        className="text-sm my-4"
        style={{
          ...slab(isDark),
          borderRadius: "0.7em",
          padding: "1em 1.1em",
          overflowX: "auto",
          whiteSpace: "pre",
        }}
      >
        {code}
      </pre>
    );
  }

  const canZoom = zoomable && !!svg;
  // Mermaid sizes the SVG with width="100%" + an inline max-width = its natural
  // width. The lightbox box is shrink-to-fit (no basis for width:100%), so pass
  // that natural width through and let the lightbox give its wrapper a definite
  // `min(95vw, naturalPx)`; the SVG then fills it and scales down on smaller
  // screens, never past natural size — just like an <img>.
  const naturalMatch = svg.match(/max-width:\s*([\d.]+)px/i);
  const naturalWidth = naturalMatch ? Math.ceil(parseFloat(naturalMatch[1])) : null;
  return (
    <>
      <div
        className="my-4"
        onClick={canZoom ? () => setExpanded(true) : undefined}
        style={{
          ...slab(isDark),
          borderRadius: "0.7em",
          padding: "1em 1.1em",
          overflowX: "auto",
          display: "flex",
          justifyContent: "center",
          // Hug the diagram instead of stretching the full content column: the
          // slab takes the SVG's natural width (capped at 100% on narrow
          // screens). useMaxWidth gives the SVG width:100% with no intrinsic
          // basis, so a shrink-to-fit parent would collapse it — hence the
          // definite width here. Wide diagrams (natural > column) still fill the
          // column; narrow ones (like the compute/memory sketch) sit compact.
          width: naturalWidth ? `min(100%, ${naturalWidth}px)` : undefined,
          // reserve a little height while mermaid loads so the page doesn't jump
          minHeight: svg ? undefined : "3rem",
          cursor: canZoom ? "zoom-in" : undefined,
        }}
        // mermaid output is a trusted, self-generated SVG (securityLevel: strict
        // sanitizes the labels), so injecting it directly is safe here.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {expanded &&
        createPortal(
          <ImageLightbox
            key={svg}
            svg={svg}
            slabStyle={slab(isDark)}
            maxWidthPx={naturalWidth}
            alt="diagram"
            onClose={() => setExpanded(false)}
          />,
          document.body
        )}
    </>
  );
}
