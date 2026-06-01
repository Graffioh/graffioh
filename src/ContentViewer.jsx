import React, { useEffect, useState } from "react";
import Markdown from "react-markdown";
import ImageLightbox from "./ImageLightbox";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeRemoveComments from "rehype-remove-comments";
import rehypeSlug from "rehype-slug";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

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

export default function ContentViewer({ content, centered = false, zoomable = true }) {
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
            remarkPlugins={[remarkGfm, remarkMath, remarkInlineDisplayMath]}
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
                return match ? (
                  <SyntaxHighlighter
                    {...rest}
                    PreTag="div"
                    children={String(children).replace(/\n$/, "")}
                    language={match[1]}
                    style={vscDarkPlus}
                    className="text-sm my-4"
                    wrapLongLines={false}
                    // black-matter slab — same event-horizon glow as the orbs,
                    // syntax colors untouched so it stays readable
                    customStyle={{
                      overflowX: "auto",
                      borderRadius: "0.7em",
                      border: "1px solid rgba(150,150,185,0.22)",
                      boxShadow:
                        "0 0 18px 1px rgba(120,110,190,0.16), inset 0 0 30px rgba(0,0,0,0.55)",
                      background:
                        "radial-gradient(130% 160% at 50% 0%, #16161e 0%, #0b0b10 55%, #050507 100%)",
                      padding: "1em 1.1em",
                    }}
                  />
                ) : (
                  <code
                    {...rest}
                    // inline "black hole": faded translucent-black core with a
                    // faint purple rim glow, crisp light text — small + stays
                    // in the line flow
                    className="rounded-[0.35em] px-[0.36em] py-[0.04em] mx-[0.05em]"
                    style={{
                      fontSize: "0.88em",
                      background:
                        "radial-gradient(120% 135% at 50% 28%, #131316 0%, #181818 65%, #1d1d22 100%)",
                      color: "#ededf5",
                      border: "1px solid rgba(150,150,185,0.22)",
                      boxShadow:
                        "0 0 6px 0 rgba(120,110,190,0.25), inset 0 0 5px rgba(0,0,0,0.6)",
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
