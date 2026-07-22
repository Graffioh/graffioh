import { useId } from "react";

// ── Shared primitives for every diagram in src/diagrams ──────────────────────
// See README.md in this folder for the design tokens, geometry, scene schema,
// and fence contract.

// Namespaced SVG ids, unique per mounted diagram instance:
//   const id = useDiagramIds(); id("arrow") → "arrow-«r1»"
// SVG ids are document-global, so every def (marker, pattern, gradient) must
// go through this to survive two diagrams on the same page.
export function useDiagramIds() {
  const raw = useId().replace(/:/g, "");
  return (name) => `${name}-${raw}`;
}

// The canvas every diagram draws on: dotted texture, rounded outer frame, and
// role="img" + <title>/<desc> for screen readers. Extra defs (arrow markers,
// gradients) ride in through `defs`. `frame={false}` is for diagrams whose
// outermost drawn region doubles as the frame (e.g. the hierarchy's grid).
export function DiagramCanvas({
  className,
  width = 960,
  height = 600,
  title,
  desc,
  frame = true,
  defs = null,
  children,
}) {
  const id = useDiagramIds();
  return (
    <svg
      className={["diagram-canvas", className].filter(Boolean).join(" ")}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-labelledby={`${id("title")} ${id("desc")}`}
    >
      <title id={id("title")}>{title}</title>
      <desc id={id("desc")}>{desc}</desc>
      <defs>
        <pattern
          id={id("dots")}
          width="24"
          height="24"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="2" cy="2" r="1.3" fill="var(--diagram-hairline)" />
        </pattern>
        {defs}
      </defs>
      <rect
        className="diagram-texture"
        x="0"
        y="0"
        width={width}
        height={height}
        style={{ fill: `url(#${id("dots")})` }}
      />
      {frame && (
        <rect
          className="diagram-frame"
          x="28"
          y="28"
          width={width - 56}
          height={height - 56}
          rx="26"
        />
      )}
      {children}
    </svg>
  );
}

// Solid ink arrowhead. Mint a per-instance id with useDiagramIds(), pass it
// here inside DiagramCanvas's `defs`, reference it with markerEnd={`url(#${id})`}.
export function ArrowMarker({ id }) {
  return (
    <marker
      id={id}
      viewBox="0 0 8 8"
      refX="7"
      refY="4"
      markerWidth="7"
      markerHeight="7"
      orient="auto-start-reverse"
    >
      <path d="M 0 0 L 8 4 L 0 8 Z" fill="var(--diagram-ink)" />
    </marker>
  );
}
