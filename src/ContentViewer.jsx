import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import Markdown from "react-markdown";
import GithubSlugger from "github-slugger";
import ImageLightbox from "./ImageLightbox";
import { ThemeContext } from "./ThemeContext";
import { dumpContent, backlinks } from "./dumps";
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

// Obsidian-style wiki links: [[note]], [[note#heading]], [[note#heading|label]].
// Rewrites the bare `[[…]]` run inside a text node into a real mdast link aimed
// at the dump route (/dump/<note>, plus #<slug> for a section) and tags it
// `wikilink` so the `a` renderer can paint it as a cross-reference chip. The
// section slug is built with the same github-slugger that rehype-slug uses to id
// headings, so the anchors line up exactly.
function remarkWikiLinks() {
  const slug = (s) => new GithubSlugger().slug(s);
  const WIKI = /\[\[([^\]]+?)\]\]/g;
  return (tree) => {
    const visit = (node) => {
      if (!node.children) return;
      const out = [];
      for (const child of node.children) {
        if (child.type !== "text" || !child.value.includes("[[")) {
          visit(child); // recurse into containers (paragraphs, list items, …)
          out.push(child);
          continue;
        }
        const text = child.value;
        let last = 0;
        let m;
        WIKI.lastIndex = 0;
        while ((m = WIKI.exec(text))) {
          if (m.index > last)
            out.push({ type: "text", value: text.slice(last, m.index) });
          const [target, label] = m[1].split("|");
          const [note, heading] = target.split("#");
          let url = `/dump/${note.trim()}`;
          if (heading) url += `#${slug(heading.trim())}`;
          out.push({
            type: "link",
            url,
            data: { hProperties: { className: ["wikilink"] } },
            children: [{ type: "text", value: (label ?? heading ?? note).trim() }],
          });
          last = m.index + m[0].length;
        }
        if (last < text.length)
          out.push({ type: "text", value: text.slice(last) });
      }
      node.children = out;
    };
    visit(tree);
  };
}

const HEADING_RE = /^(#{1,6})\s+(.+?)\s*$/;

// Pull the slice of a dump file that a wiki-link points at, so it can be shown in
// a hover preview. With a section slug → that heading's body (down to the next
// same-or-higher heading); without one → the whole note (after its title).
// Returns { title, body } or null when the target/section can't be found.
function sectionForSlug(raw, slug) {
  if (!raw) return null;
  const lines = raw.split("\n");
  if (!slug) {
    const ti = lines.findIndex((l) => HEADING_RE.test(l));
    if (ti === -1) return { title: "", body: raw.trim() };
    return { title: HEADING_RE.exec(lines[ti])[2], body: lines.slice(ti + 1).join("\n").trim() };
  }
  let start = -1;
  let level = 0;
  for (let i = 0; i < lines.length; i++) {
    const m = HEADING_RE.exec(lines[i]);
    if (m && new GithubSlugger().slug(m[2]) === slug) {
      start = i;
      level = m[1].length;
      break;
    }
  }
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const m = HEADING_RE.exec(lines[i]);
    if (m && m[1].length <= level) {
      end = i;
      break;
    }
  }
  return {
    title: HEADING_RE.exec(lines[start])[2],
    body: lines.slice(start + 1, end).join("\n").trim(),
  };
}

// A dump note's display title — its first "# heading", else a de-kebab'd id.
function noteTitle(raw, id) {
  const m = raw && raw.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : (id || "").replace(/-/g, " ");
}

// Plugin set for the small preview render — same math/arrow handling as the page,
// minus rehypeSlug (no ids needed) and remarkWikiLinks (no nested chips/popovers).
const PREVIEW_REMARK = [remarkGfm, remarkMath, remarkInlineDisplayMath, remarkArrows];
const PREVIEW_REHYPE = [rehypeRaw, rehypeKatex];

// Cross-reference chip for a wiki-link — a small "portal" pill that mirrors the
// site's inline-code negative-space motif (dark slab + purple glow in light mode,
// light slab + olive glow in dark mode). Navigates in-app so the target page's
// hash-scroll effect lands on the linked section. Hovering (or focusing) it pops
// an Obsidian-style preview of the referenced section so you can glance without
// leaving the page.
function WikiLink({ href, children, theme }) {
  const navigate = useNavigate();
  const anchorRef = useRef(null);
  const popRef = useRef(null);
  const showTimer = useRef(null);
  const hideTimer = useRef(null);
  const [hover, setHover] = useState(false);
  // null when closed; otherwise the resolved fixed-position box for the popover.
  const [pop, setPop] = useState(null);
  const isDark = theme === "dark";
  const accent = isDark ? "135,145,65" : "120,110,190"; // olive / purple
  const inner = isDark ? "255,255,255" : "0,0,0";

  const [noteId, slug] = useMemo(() => {
    const m = href.match(/\/dump\/([^#]+)(?:#(.*))?$/) || [];
    return [m[1] || "", m[2] || ""];
  }, [href]);
  const section = useMemo(() => sectionForSlug(dumpContent[noteId], slug), [noteId, slug]);
  const source = useMemo(() => noteTitle(dumpContent[noteId], noteId), [noteId]);
  const canPreview = !!(section && (section.body || section.title));

  // Anchor the popover to the chip in viewport coords. We pin the edge nearest the
  // chip (bottom when placed above, top when below) so the box grows away from the
  // chip without us needing to measure its height first; the cross-axis is clamped
  // to stay on-screen and the caret tracks the chip's center.
  const openPop = () => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 10;
    const margin = 12;
    const width = Math.min(440, vw - margin * 2);
    const center = r.left + r.width / 2;
    const left = Math.max(margin, Math.min(center - width / 2, vw - width - margin));
    const above = r.top > vh - r.bottom; // pick the side with more room
    const arrow = Math.max(18, Math.min(center - left, width - 18));
    setPop({
      width,
      left,
      arrow,
      placement: above ? "above" : "below",
      ...(above
        ? { bottom: vh - r.top + gap, maxHeight: r.top - gap - margin }
        : { top: r.bottom + gap, maxHeight: vh - r.bottom - gap - margin }),
    });
  };

  const show = () => {
    clearTimeout(hideTimer.current);
    if (canPreview) showTimer.current = setTimeout(openPop, 130);
  };
  const hide = () => {
    clearTimeout(showTimer.current);
    hideTimer.current = setTimeout(() => setPop(null), 160);
  };

  // Clear pending timers on unmount; close the popover on scroll/resize (its fixed
  // position would otherwise drift away from the chip).
  useEffect(() => () => {
    clearTimeout(showTimer.current);
    clearTimeout(hideTimer.current);
  }, []);
  useEffect(() => {
    if (!pop) return;
    // Close on page scroll/resize, but ignore scrolling *within* the popover body.
    const close = (e) => {
      if (e?.type === "scroll" && popRef.current && popRef.current.contains(e.target))
        return;
      setPop(null);
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pop]);

  const lit = hover || !!pop;
  return (
    <>
    <a
      ref={anchorRef}
      href={href}
      onClick={(e) => {
        e.preventDefault();
        setPop(null);
        navigate(href);
      }}
      onMouseEnter={() => {
        setHover(true);
        show();
      }}
      onMouseLeave={() => {
        setHover(false);
        hide();
      }}
      onFocus={show}
      onBlur={hide}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5em",
        verticalAlign: "baseline",
        textDecoration: "none",
        textShadow: "none",
        borderRadius: "999px",
        padding: "0.22em 0.72em 0.22em 0.28em",
        fontSize: "0.9em",
        lineHeight: 1.25,
        cursor: "pointer",
        color: isDark ? "#12120a" : "#ededf5",
        background: isDark
          ? "radial-gradient(120% 135% at 50% 28%, #ecece9 0%, #e2e2dd 100%)"
          : "radial-gradient(120% 135% at 50% 28%, #131316 0%, #1d1d22 100%)",
        border: `1px solid rgba(${accent},0.38)`,
        boxShadow: lit
          ? `0 5px 18px -2px rgba(${accent},0.5), inset 0 0 6px rgba(${inner},0.55)`
          : `0 0 9px 0 rgba(${accent},0.3), inset 0 0 5px rgba(${inner},0.55)`,
        transform: lit ? "translateY(-1px)" : "none",
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "1.55em",
          height: "1.55em",
          borderRadius: "999px",
          fontStyle: "italic",
          fontWeight: 700,
          fontSize: "0.95em",
          background: `rgba(${accent},${isDark ? 0.2 : 0.34})`,
          color: isDark ? "#2f2f18" : "#d6cdff",
        }}
      >
        ƒ
      </span>
      <span style={{ fontWeight: 600 }}>{children}</span>
      <span aria-hidden="true" style={{ opacity: 0.7 }}>
        ↗
      </span>
    </a>
    {pop &&
      createPortal(
        <div
          ref={popRef}
          role="tooltip"
          onMouseEnter={() => clearTimeout(hideTimer.current)}
          onMouseLeave={hide}
          style={{
            position: "fixed",
            left: pop.left,
            width: pop.width,
            ...(pop.placement === "above"
              ? { bottom: pop.bottom }
              : { top: pop.top }),
            maxHeight: pop.maxHeight,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            borderRadius: "12px",
            border: `1px solid rgba(${accent},0.4)`,
            background: isDark ? "rgba(18,18,24,0.97)" : "rgba(250,250,248,0.98)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            color: isDark ? "#e9e9ec" : "#1a1a1f",
            boxShadow: `0 14px 44px -10px rgba(0,0,0,${isDark ? 0.65 : 0.28}), 0 0 20px -3px rgba(${accent},0.4)`,
            padding: "11px 13px",
            // fade/rise in
            animation: "wikipop-in 0.14s ease-out",
          }}
        >
          {/* caret pointing back at the chip */}
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              left: pop.arrow - 6,
              [pop.placement === "above" ? "bottom" : "top"]: -6,
              width: 11,
              height: 11,
              background: isDark ? "rgba(18,18,24,0.97)" : "rgba(250,250,248,0.98)",
              borderRight: `1px solid rgba(${accent},0.4)`,
              borderBottom: `1px solid rgba(${accent},0.4)`,
              transform:
                pop.placement === "above" ? "rotate(45deg)" : "rotate(-135deg)",
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: "10px",
              marginBottom: "7px",
              flex: "0 0 auto",
            }}
          >
            <span style={{ fontWeight: 700, fontSize: "0.92em" }}>
              {section.title || source}
            </span>
            <span
              style={{
                opacity: 0.5,
                fontSize: "0.74em",
                whiteSpace: "nowrap",
                flex: "0 0 auto",
              }}
            >
              {source} ↗
            </span>
          </div>
          <div
            style={{
              height: 1,
              background: `rgba(${accent},0.22)`,
              margin: "0 -13px 9px",
              flex: "0 0 auto",
            }}
          />
          <div
            className="markdown"
            style={{
              flex: "1 1 auto",
              minHeight: 0,
              overflow: "auto",
              fontSize: "0.86em",
              lineHeight: 1.5,
            }}
          >
            <Markdown remarkPlugins={PREVIEW_REMARK} rehypePlugins={PREVIEW_REHYPE}>
              {section.body || "_(empty section)_"}
            </Markdown>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// Tiny "backlink" orbs rendered next to a heading — one per inbound wiki-link
// reference. Mirrors the /dump orb look (white-matter in dark mode, black-hole
// in light mode), shrunk to heading scale. Each orb jumps to the note the
// reference lives in. Unnamed by design; a title tooltip names the source.
function BacklinkOrbs({ refs, theme }) {
  const navigate = useNavigate();
  const isDark = theme === "dark";
  const orb = isDark
    ? {
        background:
          "radial-gradient(circle at 50% 50%, #fff 60%, #fafafa 74%, rgba(255,255,255,0) 100%)",
        border: "1px solid rgba(220,220,240,0.55)",
        rest: "0 0 6px 1px rgba(255,255,255,0.5), 0 0 12px 1px rgba(180,185,225,0.3)",
        hot: "0 0 9px 2px rgba(255,255,255,0.7), 0 0 20px 3px rgba(200,205,255,0.55)",
      }
    : {
        background:
          "radial-gradient(circle at 50% 50%, #000 60%, #050505 74%, rgba(0,0,0,0) 100%)",
        border: "1px solid rgba(140,140,170,0.4)",
        rest: "0 0 6px 1px rgba(0,0,0,0.5), 0 0 12px 1px rgba(90,90,130,0.25)",
        hot: "0 0 9px 2px rgba(0,0,0,0.6), 0 0 20px 3px rgba(150,150,210,0.55)",
      };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        marginLeft: "0.6em",
        verticalAlign: "middle",
      }}
    >
      {refs.map((b, i) => {
        const title = noteTitle(dumpContent[b.source], b.source);
        return (
          <button
            key={`${b.source}#${b.anchor}#${i}`}
            type="button"
            title={`referenced in ${title}`}
            aria-label={`referenced in ${title}`}
            onClick={() =>
              navigate(`/dump/${b.source}${b.anchor ? `#${b.anchor}` : ""}`)
            }
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.55)";
              e.currentTarget.style.boxShadow = orb.hot;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = orb.rest;
            }}
            style={{
              width: 10,
              height: 10,
              padding: 0,
              flex: "0 0 auto",
              borderRadius: "999px",
              cursor: "pointer",
              background: orb.background,
              border: orb.border,
              boxShadow: orb.rest,
              transition: "transform 0.18s ease, box-shadow 0.18s ease",
            }}
          />
        );
      })}
    </span>
  );
}

export default function ContentViewer({ content, centered = false, zoomable = true }) {
  const { theme } = useContext(ThemeContext);
  const location = useLocation();
  const params = useParams();
  // Which dump note this is (for backlink-orb lookup); null off /dump/:id.
  const currentNoteId = location.pathname.startsWith("/dump/") ? params.id : null;
  // Image clicked to open in the zoomable lightbox overlay ({ src, alt } | null)
  const [lightbox, setLightbox] = useState(null);

  // Heading renderer factory: applies the level's styling and appends a backlink
  // orb per inbound reference to that heading (whole-note refs hang off the h1).
  const heading = (level, className) =>
    function Heading(props) {
      const { node, children, ...rest } = props;
      const id = props.id;
      const Tag = `h${level}`;
      const refs = [];
      if (currentNoteId && id && backlinks[`${currentNoteId}#${id}`])
        refs.push(...backlinks[`${currentNoteId}#${id}`]);
      if (level === 1 && currentNoteId && backlinks[currentNoteId])
        refs.push(...backlinks[currentNoteId]);
      return (
        <Tag className={className} {...rest}>
          {children}
          {refs.length > 0 && <BacklinkOrbs refs={refs} theme={theme} />}
        </Tag>
      );
    };

  // Smooth-scroll to the hash target (table of contents + wiki-link sections).
  // Re-runs on route/hash/content change so an in-app jump to another dump page
  // (e.g. a [[formulas#RoPE]] wiki-link) lands on the section once it's rendered,
  // and keeps reacting to manual hashchange events.
  useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash;
      if (!hash) return;
      const id = decodeURIComponent(hash.slice(1));
      const element = document.getElementById(id);
      if (element) element.scrollIntoView({ behavior: "smooth" });
    };

    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, [location.pathname, location.hash, content]);

  return (
    <>
      <div className="w-full">
        <div className="md:w-7/12 w-full px-4 mx-auto">
          <Markdown
            className={`markdown ${centered ? "text-center" : ""}`}
            remarkPlugins={[remarkGfm, remarkMath, remarkInlineDisplayMath, remarkArrows, remarkWikiLinks]}
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
                // Obsidian-style wiki-link → cross-reference chip (SPA navigation).
                if (/\bwikilink\b/.test(rest.className || "")) {
                  return (
                    <WikiLink href={href} theme={theme}>
                      {children}
                    </WikiLink>
                  );
                }
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
              h1: heading(1),
              h2: heading(2, "text-2xl font-bold mt-8 mb-4"),
              h3: heading(3, "text-xl font-bold mt-6 mb-3"),
              h4: heading(4, "text-lg font-bold mt-5 mb-2"),
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
