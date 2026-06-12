// Shared chrome for every code surface on the site — the "photographic
// negative" slab (light slab + olive glow in dark mode, dark slab + purple
// glow in light mode) and the highlighter that renders onto it. One home for
// all of it so ContentViewer / PythonRunner / CodeFile / Mermaid stay visually
// in sync instead of each carrying its own copy.

// prism-react-renderer instead of react-syntax-highlighter. rsh builds one React
// element *and* runs a per-token style "powerset" computation for every token on
// every render — ~1.3k elements for a 200-line file, a ~140ms (≫500ms throttled)
// synchronous task that janks the page on load and on every theme toggle.
// prism-react-renderer tokenizes synchronously and lets us map tokens to spans
// ourselves with a plain theme lookup — far cheaper, and being synchronous it
// also can't flash "[object Object]" the way the async-light build could.
import { Highlight, themes } from "prism-react-renderer";
import "./prismLanguages"; // registers java/bash/… onto prism-react-renderer's Prism

// Map the common fence shorthands to the Prism canonical names prism-react-renderer
// expects (it answers to `js`, `sh` aliases too, but normalize for safety).
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

// Drop the theme's own background so the slab gradient is the only one that
// renders (prism-react-renderer themes paint a `plain.backgroundColor`).
function noBg(theme) {
  return { ...theme, plain: { ...theme.plain, backgroundColor: "transparent" } };
}

// The site's "photographic negative": the dark *page* shows a light slab, so it
// wears a LIGHT syntax theme; the light page shows a dark slab, so it wears a
// DARK theme. Kept under the same export names the call sites already pass as
// the `style` prop (so nothing downstream had to change).
export const ONE_LIGHT_NO_BG = noBg(themes.oneLight);
export const VSC_DARK_PLUS_NO_BG = noBg(themes.vsDark);

const CODE_FONT =
  '"Fira Code", "Fira Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace';

// Drop-in replacement for the old react-syntax-highlighter usage: same props the
// three call sites already pass (children = code string, `language`, `style` =
// one of the themes above, `customStyle`, `className`, `PreTag`,
// `showLineNumbers`, `lineNumberStyle`, `lineProps(n) => ({ style })`,
// `wrapLongLines`, `startingLineNumber`). `wrapLines` is accepted and ignored —
// we always render one block element per line.
export function SyntaxHighlighter({
  children,
  language,
  style,
  customStyle = {},
  className,
  PreTag = "pre",
  showLineNumbers = false,
  wrapLongLines = false,
  lineNumberStyle,
  lineProps,
  startingLineNumber = 1,
  // eslint-disable-next-line no-unused-vars
  wrapLines,
  ...rest
}) {
  const code = String(
    Array.isArray(children) ? children.join("") : children ?? ""
  ).replace(/\n$/, "");
  const lang = canonicalLang(language || "text");
  const theme = style || ONE_LIGHT_NO_BG;
  const Pre = PreTag;

  return (
    <Highlight code={code} language={lang} theme={theme}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <Pre
          {...rest}
          className={className}
          style={{
            // base code-surface styling (matches the old Prism theme defaults);
            // no margin / font-size here so the className (text-sm, my-4, …) and
            // each caller's customStyle stay in control.
            fontFamily: CODE_FONT,
            lineHeight: 1.5,
            tabSize: 2,
            whiteSpace: wrapLongLines ? "pre-wrap" : "pre",
            overflowX: "auto",
            ...customStyle,
          }}
        >
          {tokens.map((line, i) => {
            const ln = startingLineNumber + i;
            const lp = getLineProps({ line });
            const extra = lineProps ? lineProps(ln) : null;
            return (
              <span
                key={i}
                {...lp}
                style={{ display: "block", ...lp.style, ...(extra && extra.style) }}
              >
                {showLineNumbers && (
                  <span
                    aria-hidden="true"
                    style={{
                      display: "inline-block",
                      minWidth: "2.5em",
                      textAlign: "right",
                      marginRight: "1em",
                      userSelect: "none",
                      opacity: 0.4,
                      ...lineNumberStyle,
                    }}
                  >
                    {ln}
                  </span>
                )}
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </span>
            );
          })}
        </Pre>
      )}
    </Highlight>
  );
}

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
