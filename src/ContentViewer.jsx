import React, { useContext, useEffect, useState } from "react";
import Markdown from "react-markdown";
import ImageLightbox from "./ImageLightbox";
import { ThemeContext } from "./ThemeContext";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeRemoveComments from "rehype-remove-comments";
import rehypeSlug from "rehype-slug";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  vscDarkPlus,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";

// Prism themes paint their own background on the <pre>/<code>/token elements.
// Layered over our custom slab gradient, that shows up as per-line white "bands".
// Strip every background so our `customStyle` slab is the only one that renders.
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
const ONE_LIGHT_NO_BG = stripBackgrounds(oneLight);
const VSC_DARK_PLUS_NO_BG = stripBackgrounds(vscDarkPlus);

// Flatten a React children tree down to its plain text (raw-HTML inline markup
// can split a string across nested nodes — we want the whole run as one string).
function flattenText(node) {
  if (node == null || node === false) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join("");
  if (React.isValidElement(node)) return flattenText(node.props.children);
  return "";
}

// RGB bracket-pair coloring, keyed by bracket *type*: {} = red, [] = green,
// () = blue. Brighter hues in dark mode so they read against the dark page.
// Triggered by `<span class="rgb">…</span>` in the markdown.
const BRACKET_HUES = {
  dark: { "{": "#ff6b6b", "}": "#ff6b6b", "[": "#5fd95f", "]": "#5fd95f", "(": "#6ba8ff", ")": "#6ba8ff" },
  light: { "{": "#cc2626", "}": "#cc2626", "[": "#1a8a1a", "]": "#1a8a1a", "(": "#1846dd", ")": "#1846dd" },
};
function colorizeBrackets(text, theme) {
  const hues = BRACKET_HUES[theme === "dark" ? "dark" : "light"];
  return [...text].map((ch, i) =>
    hues[ch] ? (
      <span key={i} style={{ color: hues[ch], fontWeight: 600 }}>
        {ch}
      </span>
    ) : (
      ch
    )
  );
}

// Obsidian-style display math: remark-math only treats $$…$$ as a block when it
// sits alone on its own line. This plugin detects $$ used inline (the delimiter
// isn't kept in the AST, so we read it back from the source position), splits the
// surrounding paragraph, and promotes it to a real block `math` node — rendering
// it as a centered block on its own line instead of inline.
function remarkInlineDisplayMath() {
  return (tree, file) => {
    const src = String(file);
    const isDisplay = (n) => {
      if (n.type !== "inlineMath" || !n.position) return false;
      const { start, end } = n.position;
      if (start.offset == null || end.offset == null) return false;
      const raw = src.slice(start.offset, end.offset);
      return raw.startsWith("$$") && raw.endsWith("$$");
    };
    const toMathBlock = (n) => ({
      type: "math",
      value: n.value,
      data: {
        hName: "pre",
        hChildren: [
          {
            type: "element",
            tagName: "code",
            properties: { className: ["language-math", "math-display"] },
            children: [{ type: "text", value: n.value }],
          },
        ],
      },
    });
    const split = (parent) => {
      if (!parent.children) return;
      const out = [];
      for (const child of parent.children) {
        if (child.type === "paragraph" && child.children.some(isDisplay)) {
          let buf = [];
          const flush = () => {
            const meaningful = buf.some(
              (c) => !(c.type === "text" && !c.value.trim())
            );
            if (meaningful) out.push({ type: "paragraph", children: buf });
            buf = [];
          };
          for (const c of child.children) {
            if (isDisplay(c)) {
              flush();
              out.push(toMathBlock(c));
            } else {
              buf.push(c);
            }
          }
          flush();
        } else {
          split(child); // recurse into containers (blockquote, list items, …)
          out.push(child);
        }
      }
      parent.children = out;
    };
    split(tree);
  };
}

// Render a plain-text `->` as a real arrow (→). It only rewrites `text` nodes, so
// arrows inside code / inline-code (e.g. C++ `ptr->member`) and math are untouched
// — those are separate node types whose content never lives in a `text` child.
function remarkArrows() {
  return (tree) => {
    const visit = (node) => {
      if (!node.children) return;
      for (const child of node.children) {
        if (child.type === "text") {
          child.value = child.value.replace(/->/g, "→");
        } else {
          visit(child);
        }
      }
    };
    visit(tree);
  };
}

export default function ContentViewer({ content, centered = false, zoomable = true }) {
  const { theme } = useContext(ThemeContext);
  // Image clicked to open in the zoomable lightbox overlay ({ src, alt } | null)
  const [lightbox, setLightbox] = useState(null);

  // Add anchor scroll handling for smooth navigation
  useEffect(() => {
    // Handle hash changes for table of contents navigation
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash) {
        const id = hash.replace("#", "");
        const element = document.getElementById(id);
        if (element) {
          // Smooth scroll to element
          element.scrollIntoView({ behavior: "smooth" });
        }
      }
    };

    // Handle initial hash if present
    handleHashChange();

    // Add event listener for hash changes
    window.addEventListener("hashchange", handleHashChange);

    // Clean up
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return (
    <>
      <div className="w-full">
        <div className="md:w-7/12 w-full px-4 mx-auto">
          <Markdown
            className={`markdown ${centered ? "text-center" : ""}`}
            remarkPlugins={[remarkGfm, remarkMath, remarkInlineDisplayMath, remarkArrows]}
            rehypePlugins={[rehypeRaw, rehypeRemoveComments, rehypeSlug, rehypeKatex]}
            components={{
              img(props) {
                const { node, alt, width, height, style, ...rest } = props;
                // Tailwind's preflight sets `img { height: auto; max-width: 100% }`,
                // which overrides the HTML width/height *attributes*. Promote any
                // explicit dimensions to inline styles (which win over the
                // stylesheet rule) so sizes set in the markdown actually apply.
                const toCss = (v) =>
                  v != null && /^\d+$/.test(String(v)) ? `${v}px` : v;
                const sizeStyle = {};
                if (width != null) sizeStyle.width = toCss(width);
                if (height != null) sizeStyle.height = toCss(height);
                const hasExplicitSize =
                  width != null ||
                  height != null ||
                  (style && (style.width || style.height));
                // The zoom cursor must be set inline, not via a class: raw-HTML
                // images render as direct children of `.markdown`, where the
                // `.markdown > * { all: revert }` rule (index.css) wipes any
                // class-applied `cursor`. Inline styles outrank that rule.
                const mergedStyle = {
                  ...sizeStyle,
                  ...style,
                  ...(zoomable ? { cursor: "zoom-in" } : {}),
                };
                const className = hasExplicitSize
                  ? ""
                  : alt === "griffith-castle"
                    ? ""
                    : "w-8/12";
                return (
                  <img
                    className={`${className} ${centered ? "mx-auto" : ""}`}
                    alt={alt}
                    style={Object.keys(mergedStyle).length ? mergedStyle : undefined}
                    onClick={
                      zoomable
                        ? () => setLightbox({ src: rest.src, alt })
                        : undefined
                    }
                    {...rest}
                  />
                );
              },
              a(props) {
                const { node, ref, href, children, ...rest } = props;
                // Handle internal links properly
                if (href && href.startsWith("#")) {
                  return (
                    <a href={href} {...rest}>
                      {children}
                    </a>
                  );
                }
                // External links open in new tab
                return (
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={href}
                    {...rest}
                  >
                    {children}
                  </a>
                );
              },
              span(props) {
                const { children, className, node, ...rest } = props;
                // `<span class="rgb">…</span>` → RGB bracket-pair coloring.
                // Any other span passes through untouched.
                if (/\brgb\b/.test(className || "")) {
                  return (
                    <span className={className} {...rest}>
                      {colorizeBrackets(flattenText(children), theme)}
                    </span>
                  );
                }
                return (
                  <span className={className} {...rest}>
                    {children}
                  </span>
                );
              },
              h2(props) {
                const { children, ...rest } = props;
                return (
                  <h2 className="text-2xl font-bold mt-8 mb-4" {...rest}>
                    {children}
                  </h2>
                );
              },
              h3(props) {
                const { children, ...rest } = props;
                return (
                  <h3 className="text-xl font-bold mt-6 mb-3" {...rest}>
                    {children}
                  </h3>
                );
              },
              code(props) {
                const { children, className, node, ...rest } = props;
                const match = /language-(\w+)/.exec(className || "");
                const text = String(children);
                // A fenced block (multiline) with no language must still render as a
                // unified block. Otherwise it falls through to the inline `<code>`
                // pill styling below, whose `box-decoration-break: clone` repaints
                // the background/border on every wrapped line ("split pills").
                const isBlock = match || text.includes("\n");
                return isBlock ? (
                  <SyntaxHighlighter
                    {...rest}
                    PreTag="div"
                    children={text.replace(/\n$/, "")}
                    language={match ? match[1] : "text"}
                    // Mirror the inline-code "photographic negative": dark slab in
                    // light mode, white slab in dark mode (syntax theme flips too).
                    style={theme === "dark" ? ONE_LIGHT_NO_BG : VSC_DARK_PLUS_NO_BG}
                    className="text-sm my-4"
                    wrapLongLines={false}
                    customStyle={{
                      overflowX: "auto",
                      borderRadius: "0.7em",
                      padding: "1em 1.1em",
                      ...(theme === "dark"
                        ? {
                            // white-matter slab — olive rim glow + soft inner light
                            color: "#12120a",
                            border: "1px solid rgba(105,105,70,0.22)",
                            boxShadow:
                              "0 0 18px 1px rgba(135,145,65,0.16), inset 0 0 30px rgba(255,255,255,0.6)",
                            background:
                              "radial-gradient(130% 160% at 50% 0%, #f1f1ee 0%, #eaeae6 55%, #e2e2dd 100%)",
                          }
                        : {
                            // black-matter slab — event-horizon glow like the orbs
                            border: "1px solid rgba(150,150,185,0.22)",
                            boxShadow:
                              "0 0 18px 1px rgba(120,110,190,0.16), inset 0 0 30px rgba(0,0,0,0.55)",
                            background:
                              "radial-gradient(130% 160% at 50% 0%, #16161e 0%, #0b0b10 55%, #050507 100%)",
                          }),
                    }}
                  />
                ) : (
                  <code
                    {...rest}
                    // inline "black hole": faded translucent-black core with a
                    // faint purple rim glow, crisp light text — small + stays
                    // in the line flow. In dark mode it flips to the exact
                    // photographic negative: white core, black text.
                    className="rounded-[0.35em] px-[0.36em] py-[0.04em] mx-[0.05em]"
                    style={{
                      fontSize: "0.88em",
                      background:
                        theme === "dark"
                          ? "radial-gradient(120% 135% at 50% 28%, #ecece9 0%, #e7e7e7 65%, #e2e2dd 100%)"
                          : "radial-gradient(120% 135% at 50% 28%, #131316 0%, #181818 65%, #1d1d22 100%)",
                      color: theme === "dark" ? "#12120a" : "#ededf5",
                      border:
                        theme === "dark"
                          ? "1px solid rgba(105,105,70,0.22)"
                          : "1px solid rgba(150,150,185,0.22)",
                      boxShadow:
                        theme === "dark"
                          ? "0 0 6px 0 rgba(135,145,65,0.25), inset 0 0 5px rgba(255,255,255,0.6)"
                          : "0 0 6px 0 rgba(120,110,190,0.25), inset 0 0 5px rgba(0,0,0,0.6)",
                      boxDecorationBreak: "clone",
                      WebkitBoxDecorationBreak: "clone",
                    }}
                  >
                    {children}
                  </code>
                );
              },
              ul(props) {
                const { children, ...rest } = props;
                // Add special styling for table of contents lists
                if (props.node.position?.start.line < 30) {
                  // Assuming TOC is at the top
                  return (
                    <ul className="toc-list list-disc pl-5 space-y-1" {...rest}>
                      {children}
                    </ul>
                  );
                }
                return (
                  <ul className="list-disc pl-5 my-3" {...rest}>
                    {children}
                  </ul>
                );
              },
              strong(props) {
                const { children, ...rest } = props;
                return <strong className="font-bold" {...rest}>{children}</strong>;
              },
              em(props) {
                const { children, ...rest } = props;
                return <em className="italic" {...rest}>{children}</em>;
              },
              // Small caption / reference line, e.g. an image source under a
              // figure. Inline-styled so it survives `.markdown > * {all:revert}`.
              small(props) {
                const { node, children, style, ...rest } = props;
                return (
                  <small
                    {...rest}
                    style={{
                      display: "block",
                      marginTop: "-0.4rem",
                      marginBottom: "1.5rem",
                      fontSize: "0.78em",
                      fontStyle: "italic",
                      opacity: 0.55,
                      textAlign: centered ? "center" : "left",
                      ...style,
                    }}
                  >
                    {children}
                  </small>
                );
              },
            }}
          >
            {content}
          </Markdown>
        </div>
      </div>
      {lightbox && (
        <ImageLightbox
          key={lightbox.src}
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}
