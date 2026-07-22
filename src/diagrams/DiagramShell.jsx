import { slab } from "../codeSlab";
import "./diagrams.css";

// scrollable stays on by default: under 640px every canvas keeps a min-width
// (diagrams.css) and pans inside the shell instead of scaling text below
// legibility.
export default function DiagramShell({ children, theme, label, scrollable = true }) {
  const isDark = theme === "dark";
  const material = slab(isDark);
  const monochrome = isDark
    ? {
        border: "1px solid rgba(18,18,10,0.18)",
        shadow:
          "0 12px 30px -22px rgba(0,0,0,0.55), inset 0 0 30px rgba(255,255,255,0.62)",
      }
    : {
        border: "1px solid rgba(237,237,245,0.2)",
        shadow:
          "0 12px 30px -22px rgba(0,0,0,0.7), inset 0 0 30px rgba(0,0,0,0.58)",
      };

  return (
    <div
      className="diagram-shell"
      style={{
        "--diagram-ink": material.ink,
        "--diagram-muted": isDark
          ? "rgba(18,18,10,0.58)"
          : "rgba(237,237,245,0.58)",
        "--diagram-hairline": isDark
          ? "rgba(18,18,10,0.18)"
          : "rgba(237,237,245,0.18)",
        "--diagram-surface-soft": isDark
          ? "rgba(18,18,10,0.035)"
          : "rgba(237,237,245,0.035)",
        "--diagram-surface-mid": isDark
          ? "rgba(18,18,10,0.075)"
          : "rgba(237,237,245,0.075)",
        "--diagram-surface-strong": isDark
          ? "rgba(18,18,10,0.14)"
          : "rgba(237,237,245,0.14)",
        color: material.color,
        border: monochrome.border,
        boxShadow: monochrome.shadow,
        background: material.background,
        margin: "1.5em 0",
        width: "100%",
        maxWidth: "100%",
        borderRadius: "0.8em",
        overflowX: scrollable ? "auto" : "hidden",
        overflowY: "hidden",
        WebkitOverflowScrolling: scrollable ? "touch" : undefined,
      }}
      aria-label={label}
    >
      {children}
    </div>
  );
}
