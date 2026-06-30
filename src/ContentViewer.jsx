import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import Markdown from "react-markdown";
import GithubSlugger from "github-slugger";
import ImageLightbox from "./ImageLightbox";
import Mermaid from "./Mermaid";
import Plot from "./Plot";
import PythonRunner from "./PythonRunner";
import CodeFile from "./CodeFile";
import { ThemeContext } from "./ThemeContext";
import { dumpContent, references } from "./dumps";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeRemoveComments from "rehype-remove-comments";
import rehypeSlug from "rehype-slug";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import {
  SyntaxHighlighter,
  canonicalLang,
  ONE_LIGHT_NO_BG,
  VSC_DARK_PLUS_NO_BG,
} from "./codeSlab";

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

// GitHub/Obsidian-style callouts authored as blockquotes:
//   > [!note]
//   > body… (plain markdown — bullets inside still become bullet cards)
// Detects the `[!type]` marker on the first line of a blockquote (optionally
// followed by a custom title on the same line), strips it, and retags the
// blockquote as a `<div class="callout callout-<type>">` carrying the title.
// The `div` renderer then paints it; everything inside stays normal markdown,
// so nested lists / bold / links flow through their usual components.
const CALLOUT_RE = /^\[!(\w+)\]\s*(.*)$/;
function remarkCallouts() {
  return (tree) => {
    const visit = (node) => {
      if (node.children) node.children.forEach(visit);
      if (node.type !== "blockquote" || !node.children?.length) return;
      const first = node.children[0];
      if (first.type !== "paragraph" || !first.children.length) return;
      const lead = first.children[0];
      if (lead.type !== "text") return;
      // The marker sits on its own line; remark joins that line and the first
      // body line into one paragraph with a soft `break` between them, so the
      // marker is the lead text node up to any embedded newline.
      const nl = lead.value.indexOf("\n");
      const head = (nl === -1 ? lead.value : lead.value.slice(0, nl)).trim();
      const m = CALLOUT_RE.exec(head);
      if (!m) return;
      const type = m[1].toLowerCase();
      const title = m[2].trim();
      if (nl === -1) {
        first.children.shift(); // drop the "[!type]" text
        if (first.children[0]?.type === "break") first.children.shift();
        if (first.children.length === 0) node.children.shift(); // empty lead para
      } else {
        lead.value = lead.value.slice(nl + 1); // marker shared a node with body
      }
      node.data = node.data || {};
      node.data.hName = "div";
      const hProperties = { className: ["callout", `callout-${type}`] };
      if (title) hProperties["data-callout-title"] = title;
      node.data.hProperties = hProperties;
    };
    visit(tree);
  };
}

// Classify an external reference so its orb shows the right logo: arXiv papers,
// PDFs, or any other link (blog post / misc → a globe). arXiv wins over .pdf
// since arXiv pdf URLs are still papers.
function refKind(url) {
  if (/arxiv\.org\//i.test(url)) return "arxiv";
  if (/\.pdf($|[?#])/i.test(url)) return "pdf";
  return "web";
}

// Fallback label for a reference with no `|Title`, used for the orb tooltip: the
// arXiv id, else the URL's last path segment (sans `.pdf`), else the hostname.
function refLabel(url) {
  const ax = url.match(/arxiv\.org\/(?:abs|pdf)\/([^?#]+)/i);
  if (ax) return `arXiv:${ax[1].replace(/\.pdf$/i, "")}`;
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop();
    return last ? decodeURIComponent(last).replace(/\.pdf$/i, "") : u.hostname;
  } catch {
    return url;
  }
}

function arxivId(url) {
  const m = url.match(/arxiv\.org\/(?:abs|pdf)\/([^?#]+)/i);
  return m ? m[1].replace(/\.pdf$/i, "").replace(/v\d+$/i, "") : "";
}

const ARXIV_PAPERS = {
  "1706.03762": {
    title: "Attention Is All You Need",
    authors: "Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Lukasz Kaiser, Illia Polosukhin",
    abstract:
      "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks in an encoder-decoder configuration. The authors propose the Transformer, a simpler architecture based only on attention mechanisms, removing recurrence and convolutions. Experiments on machine translation show stronger quality, better parallelization, and substantially less training time, with strong results on English-German, English-French, and constituency parsing.",
  },
  "2001.08361": {
    title: "Scaling Laws for Neural Language Models",
    authors: "Jared Kaplan, Sam McCandlish, Tom Henighan, Tom B. Brown, Benjamin Chess, Rewon Child, Scott Gray, Alec Radford, Jeffrey Wu, Dario Amodei",
    abstract:
      "This paper studies empirical scaling laws for language-model cross-entropy loss. Loss follows power laws with model size, dataset size, and training compute across many orders of magnitude, while architectural details such as width and depth have relatively small effects over broad ranges. The resulting relationships help estimate compute-optimal model and dataset allocation.",
  },
};

// Strip [[<url>|Title]] reference links out of raw markdown before rendering —
// they don't appear inline; they're hoisted to logo orbs on the section heading
// (see `references` in dumps.js). Collapses the blank lines left behind.
function stripReferences(md) {
  if (!md) return md;
  return md
    .replace(/\[\[\s*https?:\/\/[^\]]+?\s*\]\]/gi, "")
    .replace(/\n{3,}/g, "\n\n");
}

// Obsidian-style wiki links: [[note]], [[note#heading]], [[note#heading|label]].
// Rewrites the bare `[[…]]` run inside a text node into a real mdast link aimed
// at the dump route (/dump/<note>, plus #<slug> for a section) and tags it
// `wikilink` so the `a` renderer can paint it as a cross-reference chip. The
// section slug is built with the same github-slugger that rehype-slug uses to id
// headings, so the anchors line up exactly. (External [[<url>]] references are
// stripped upstream by stripReferences and surfaced as heading orbs instead.)
function remarkWikiLinks() {
  const slug = (s) => new GithubSlugger().slug(s);
  const noteId = (s) => s.trim().replace(/\.md$/i, "");
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
          let url = `/dump/${noteId(note)}`;
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
const PREVIEW_REMARK = [remarkGfm, remarkMath, remarkInlineDisplayMath, remarkArrows, remarkCallouts];
const PREVIEW_REHYPE = [rehypeRaw, rehypeKatex];

// The main page's remark set — static, so hoisted to keep its identity stable
// (a fresh array per render would make react-markdown re-run the pipeline).
const REMARK_PLUGINS = [remarkGfm, remarkMath, remarkInlineDisplayMath, remarkArrows, remarkCallouts, remarkWikiLinks];

// Cross-reference chip for a wiki-link — a small "portal" pill that mirrors the
// site's inline-code negative-space motif (dark slab + purple glow in light mode,
// light slab + olive glow in dark mode). Navigates in-app so the target page's
// hash-scroll effect lands on the linked section. Hovering (or focusing) it pops
// an Obsidian-style preview of the referenced section so you can glance without
// leaving the page.
function DocLink({ href, children, theme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const anchorRef = useRef(null);
  const popRef = useRef(null);
  const showTimer = useRef(null);
  const hideTimer = useRef(null);
  const [hover, setHover] = useState(false);
  // null when closed; otherwise the resolved fixed-position box for the popover.
  const [pop, setPop] = useState(null);
  const isDark = theme === "dark";
  // Neutral grey rim + glow (was olive/purple): black on the light chip, white
  // on the dark one, matching the bullet orbs and the rest of the orb motif.
  const accent = isDark ? "255,255,255" : "0,0,0";
  const glow = isDark ? "255,255,255" : "0,0,0"; // neutral halo — white on dark, black on light

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
        // Remember the page this link sits on so the target's back-link can
        // return here (the note that contained the link) instead of the orbs.
        navigate(href, { state: { from: location.pathname + location.hash } });
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
        padding: "0.22em 0.72em",
        fontSize: "0.85em",
        lineHeight: 1.25,
        cursor: "pointer",
        // Theme-matching text: black in light mode, white in dark.
        color: isDark ? "#ededf5" : "#12120a",
        // Fill matches the bullet cards: a faint grey panel — a touch darker
        // than the light page, a touch lighter than the dark page.
        background: isDark
          ? "rgba(255,255,255,0.06)"
          : "rgba(0,0,0,0.06)",
        border: `1px solid rgba(${accent},0.3)`,
        boxShadow: lit
          ? `0 3px 12px -4px rgba(${accent},0.4)`
          : `0 0 6px 0 rgba(${accent},0.18)`,
        transform: lit ? "translateY(-1px)" : "none",
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
      }}
    >
      <span style={{ fontWeight: 600 }}>{children}</span>
      {/* arrow stays pure black (light) / white (dark), not the chip's accent */}
      <span aria-hidden="true" style={{ color: isDark ? "#ffffff" : "#000000", opacity: 0.8 }}>
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
            boxShadow: `0 14px 44px -10px rgba(0,0,0,${isDark ? 0.65 : 0.28}), 0 0 20px -3px rgba(${glow},${isDark ? 0.22 : 0.35})`,
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
              {stripReferences(section.body) || "_(empty section)_"}
            </Markdown>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// The official arXiv wordmark (2022 primary logo), inlined so it can be themed:
// the letters take `ink` (the orb's contrast color) and the crossed X takes
// `red`, instead of the logo's fixed tan/#aa142d so it reads on either orb.
function ArxivLogo({ ink, red, height = 12 }) {
  return (
    <svg
      height={height}
      viewBox="0 0 246.978 111.119"
      fill="none"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <g transform="translate(-358.165 -222.27)">
        <path fill={ink} d="M427.571,255.154c1.859,0,3.1,1.24,3.985,3.453,1.062-2.213,2.568-3.453,4.694-3.453h14.878a4.062,4.062,0,0,1,4.074,4.074v7.828c0,2.656-1.327,4.074-4.074,4.074-2.656,0-4.074-1.418-4.074-4.074V263.3H436.515a2.411,2.411,0,0,0-2.656,2.745v27.188h10.007c2.658,0,4.074,1.329,4.074,4.074s-1.416,4.074-4.074,4.074h-26.39c-2.659,0-3.986-1.328-3.986-4.074s1.327-4.074,3.986-4.074h8.236V263.3h-7.263c-2.656,0-3.985-1.329-3.985-4.074,0-2.658,1.329-4.074,3.985-4.074Z" />
        <path fill={ink} d="M539.233,255.154c2.656,0,4.074,1.416,4.074,4.074v34.007h10.1c2.746,0,4.074,1.329,4.074,4.074s-1.328,4.074-4.074,4.074H524.8c-2.656,0-4.074-1.328-4.074-4.074s1.418-4.074,4.074-4.074h10.362V263.3h-8.533c-2.744,0-4.073-1.329-4.073-4.074,0-2.658,1.329-4.074,4.073-4.074Zm4.22-17.615a5.859,5.859,0,1,1-5.819-5.819A5.9,5.9,0,0,1,543.453,237.539Z" />
        <path fill={ink} d="M605.143,259.228a4.589,4.589,0,0,1-.267,1.594L590,298.9a3.722,3.722,0,0,1-3.721,2.48h-5.933a3.689,3.689,0,0,1-3.808-2.48l-15.055-38.081a3.23,3.23,0,0,1-.355-1.594,4.084,4.084,0,0,1,4.164-4.074,3.8,3.8,0,0,1,3.718,2.656l14.348,36.134,13.9-36.134a3.8,3.8,0,0,1,3.72-2.656A4.084,4.084,0,0,1,605.143,259.228Z" />
        <path fill={red} d="M486.149,277.877l-32.741,38.852c-1.286,1.372-2.084,3.777-1.365,5.5a4.705,4.705,0,0,0,4.4,2.914,4.191,4.191,0,0,0,3.16-1.563l40.191-42.714a4.417,4.417,0,0,0,.042-6.042Z" />
        <path fill={ink} d="M486.149,277.877l31.187-38.268c1.492-1.989,2.2-3.03,1.492-4.723a5.142,5.142,0,0,0-4.481-3.161h0a4.024,4.024,0,0,0-3.008,1.108L472.711,274.6a4.769,4.769,0,0,0,.015,6.53L520.512,332.2a3.913,3.913,0,0,0,3.137,1.192,4.394,4.394,0,0,0,4.027-2.818c.719-1.727-.076-3.438-1.4-5.23l-40.124-47.464" />
        <path fill={red} d="M499.833,274.828,453.169,224.4s-1.713-2.08-3.524-2.124a4.607,4.607,0,0,0-4.338,2.788c-.705,1.692-.2,2.88,1.349,5.1l40.093,48.422" />
        <path fill={ink} d="M390.61,255.154c5.018,0,8.206,3.312,8.206,8.4v37.831H363.308a4.813,4.813,0,0,1-5.143-4.929V283.427a8.256,8.256,0,0,1,7-8.148l25.507-3.572v-8.4H362.306a4.014,4.014,0,0,1-4.141-4.074c0-2.87,2.143-4.074,4.355-4.074Zm.059,38.081V279.942l-24.354,3.4v9.9Z" />
      </g>
    </svg>
  );
}

// One reference orb: the /dump orb material (white-matter in dark mode, black-hole
// in light) carrying a logo for its link kind. arXiv papers get the real arXiv
// wordmark, so that one stretches into a glowing pill; PDFs (document glyph) and
// any other link (globe) stay round. Opens in a new tab; hovering lifts it and
// pops the title.
function RefOrb({ url, label, theme }) {
  const isDark = theme === "dark";
  const orb = isDark
    ? {
        // round orbs fade to transparent (soft glowing ball); the wide arXiv pill
        // needs a solid slab instead, or its rounded ends turn fuzzy/gray.
        bg: "radial-gradient(circle at 50% 50%, #fff 62%, #fafafa 78%, rgba(255,255,255,0) 100%)",
        pill: "radial-gradient(125% 140% at 50% 30%, #fff 0%, #f4f4f1 72%, #ececea 100%)",
        border: "1px solid rgba(220,220,240,0.55)",
        rest: "0 0 6px 1px rgba(255,255,255,0.5), 0 0 12px 1px rgba(180,185,225,0.3)",
        hot: "0 0 9px 2px rgba(255,255,255,0.7), 0 0 20px 3px rgba(200,205,255,0.55)",
      }
    : {
        bg: "radial-gradient(circle at 50% 50%, #000 62%, #050505 78%, rgba(0,0,0,0) 100%)",
        pill: "radial-gradient(125% 140% at 50% 30%, #0c0c10 0%, #060608 72%, #000 100%)",
        border: "1px solid rgba(140,140,170,0.4)",
        rest: "0 0 6px 1px rgba(0,0,0,0.5), 0 0 12px 1px rgba(90,90,130,0.25)",
        hot: "0 0 9px 2px rgba(0,0,0,0.6), 0 0 20px 3px rgba(150,150,210,0.55)",
      };
  const kind = refKind(url);
  const isArxiv = kind === "arxiv";
  const paper = isArxiv ? ARXIV_PAPERS[arxivId(url)] : null;
  const red = isDark ? "#b31b1b" : "#ff6b6b"; // arXiv / PDF red, tuned per orb
  const ink = isDark ? "#15150d" : "#f0f0f0"; // letters / glyph on the orb core
  const glyph = isArxiv ? (
    <ArxivLogo ink={ink} red={red} height={12} />
  ) : kind === "pdf" ? (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke={red}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  ) : (
    <svg
      width="11.5"
      height="11.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke={ink}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.5" />
      <line x1="2.5" y1="12" x2="21.5" y2="12" />
      <path d="M12 2.5a14 14 0 0 1 3.8 9.5 14 14 0 0 1-3.8 9.5 14 14 0 0 1-3.8-9.5 14 14 0 0 1 3.8-9.5z" />
    </svg>
  );
  return (
    <span
      className="ref-orb-wrap"
      style={{
        "--ref-orb-rest": orb.rest,
        "--ref-orb-hot": orb.hot,
        "--ref-orb-tooltip-bg": isDark
          ? "rgba(250,250,248,0.97)"
          : "rgba(18,18,24,0.97)",
        "--ref-orb-tooltip-color": isDark ? "#1a1a1f" : "#e9e9ec",
        "--ref-orb-tooltip-border": `1px solid rgba(${
          isDark ? "135,145,65" : "120,110,190"
        },0.4)`,
        "--ref-orb-tooltip-shadow": `0 10px 26px -10px rgba(0,0,0,${
          isDark ? 0.55 : 0.3
        })`,
      }}
    >
      <a
        className="ref-orb"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={label}
        aria-label={label}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          height: 22,
          width: isArxiv ? "auto" : 22,
          padding: isArxiv ? "0 9px" : 0,
          flex: "0 0 auto",
          borderRadius: "999px",
          textDecoration: "none",
          background: isArxiv ? orb.pill : orb.bg,
          border: orb.border,
          boxShadow: "var(--ref-orb-rest)",
          transform: "translateZ(0)",
          transition: "transform 0.18s ease, box-shadow 0.18s ease",
          willChange: "transform",
          cursor: "pointer",
        }}
      >
        {glyph}
      </a>
      <span
        className={`ref-orb-tooltip ${paper ? "ref-orb-paper" : ""}`}
        role="tooltip"
      >
        {paper ? (
          <>
            <span className="ref-orb-paper-title">{paper.title}</span>
            <span className="ref-orb-paper-authors">{paper.authors}</span>
            <span className="ref-orb-paper-abstract">{paper.abstract}</span>
          </>
        ) : (
          label
        )}
      </span>
    </span>
  );
}

// Section marker for headings — a small glowing orb in the same material
// as the reference orbs (white-matter in dark mode, black-hole in light), minus
// the logo. It hangs just left of the heading text and scales down with heading
// depth, so nested sections stay distinguishable without heavy rules.
function SectionOrb({ theme, level = 2 }) {
  const isDark = theme === "dark";
  const sizeByLevel = {
    2: { size: "0.46em", margin: "0.55em", glow: 1 },
    3: { size: "0.34em", margin: "0.5em", glow: 0.75 },
    4: { size: "0.25em", margin: "0.45em", glow: 0.55 },
  };
  const marker = sizeByLevel[level] || sizeByLevel[2];
  const mat = isDark
    ? {
        bg: "radial-gradient(circle at 50% 42%, #fff 55%, #fafafa 74%, rgba(255,255,255,0) 100%)",
        border: "1px solid rgba(220,220,240,0.55)",
        glow: `0 0 ${6 * marker.glow}px 1px rgba(255,255,255,0.5), 0 0 ${12 * marker.glow}px 1px rgba(180,185,225,0.3)`,
      }
    : {
        bg: "radial-gradient(circle at 50% 42%, #000 55%, #050505 74%, rgba(0,0,0,0) 100%)",
        border: "1px solid rgba(140,140,170,0.4)",
        glow: `0 0 ${6 * marker.glow}px 1px rgba(0,0,0,0.5), 0 0 ${12 * marker.glow}px 1px rgba(90,90,130,0.25)`,
      };
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        flex: "0 0 auto",
        width: marker.size,
        height: marker.size,
        marginRight: marker.margin,
        // nudge up so the dot sits on the cap-height middle, not the x-height
        position: "relative",
        top: "-0.08em",
        borderRadius: "999px",
        background: mat.bg,
        border: mat.border,
        boxShadow: mat.glow,
      }}
    />
  );
}

// GitHub/Obsidian-style callout types — just a label each. The accent is neutral
// for every type (black on the light page, white on the dark one), matching the
// site's black-hole / white-matter orb motif — no hue per type. `note` is the
// everyday aside; the others are here so `> [!warning]` etc. just work. `toc`
// wears the same chrome but renders its nested list as a quiet, indented outline
// (see TocContext + the ul/li renderers) rather than the heavy bullet-panels.
const CALLOUTS = {
  note: { label: "Note" },
  toc: { label: "Contents" },
  tip: { label: "Tip" },
  important: { label: "Important" },
  warning: { label: "Warning" },
  caution: { label: "Caution" },
};

// True inside a `> [!toc]` callout. The list renderers read this to drop the
// bullet-panel cards (grey fill + orbs + dividers) and lay the nested anchor
// list out as a plain, indented table-of-contents outline instead.
const TocContext = createContext(false);

// Per-type glyph (feather/lucide line icons), stroked in the callout's accent.
function CalloutIcon({ type, color }) {
  const common = {
    width: 13,
    height: 13,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 2.3,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    style: { flex: "0 0 auto" },
  };
  switch (type) {
    case "toc": // list (lines with leading dots)
      return (
        <svg {...common}>
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      );
    case "tip": // lightbulb
      return (
        <svg {...common}>
          <path d="M9 18h6" />
          <path d="M10 21h4" />
          <path d="M12 3a6 6 0 0 0-4 10.4c.6.6 1 1.3 1 2.1v.5h6v-.5c0-.8.4-1.5 1-2.1A6 6 0 0 0 12 3z" />
        </svg>
      );
    case "warning": // alert triangle
      return (
        <svg {...common}>
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h16.9a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case "caution": // alert octagon
      return (
        <svg {...common}>
          <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
    case "important": // speech bubble
      return (
        <svg {...common}>
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
    default: // note — info circle
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="11" x2="12" y2="16" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      );
  }
}

// A callout card: a soft neutral-grey panel set apart from the body, its label
// up top and the body markdown underneath. note/toc wear a quiet "folder-tab"
// label notched into the top border (no glyph, no left rail); the louder types
// (tip/warning/…) keep an in-flow icon + label and the accent left rail.
// Authored as a `> [!note]` blockquote (see remarkCallouts) or a raw
// `<div class="note">`. Inline-styled because the card is a direct child of
// `.markdown`, where the `> * { all: revert }` reset (index.css) would wipe it.
function Callout({ type = "note", title, children, theme }) {
  const isDark = theme === "dark";
  const spec = CALLOUTS[type] || CALLOUTS.note;
  // Neutral accent only: white on the dark page, black on the light one.
  const accent = isDark ? "255,255,255" : "0,0,0";
  const label = title || spec.label;
  const tab = type === "note" || type === "toc";
  const body =
    type === "toc" ? (
      <TocContext.Provider value={true}>{children}</TocContext.Provider>
    ) : (
      children
    );
  return (
    <div
      style={{
        position: "relative",
        margin: "1.25em 0",
        // Hug the body text instead of stretching the full content width; long
        // lines still wrap rather than overflow (capped at the container).
        width: "fit-content",
        maxWidth: "100%",
        // Extra top padding on the tab variant so the first body line clears the
        // label that straddles the top border.
        padding: tab ? "0.72em 0.9em 0.62em 0.9em" : "0.55em 0.9em 0.62em 0.9em",
        borderRadius: "0.6em",
        // Match the bullet list panel: same neutral-grey fill + uniform border
        // (no glow). Body text runs a hair smaller than the bullets (0.82 vs
        // 0.9em) so a note reads as a quieter aside.
        fontSize: "0.82em",
        lineHeight: 1.55,
        background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
        border: `1px solid ${
          isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.13)"
        }`,
        // The louder types keep the left rail as their one color cue; note/toc
        // drop it (the tab label is their only marker).
        ...(tab ? {} : { borderLeft: `3px solid rgba(${accent},0.85)` }),
      }}
    >
      {tab ? (
        // The label straddles the top border, masking it with the page bg →
        // it reads as a tab cut into the border (fieldset/legend style).
        <span
          style={{
            position: "absolute",
            top: 0,
            left: "0.85em",
            transform: "translateY(-50%)",
            padding: "0 0.4em",
            background: "var(--bg-color)",
            fontSize: "0.8em",
            fontWeight: 700,
            letterSpacing: "0.11em",
            textTransform: "uppercase",
            color: `rgba(${accent},1)`,
          }}
        >
          {label}
        </span>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.42em",
            marginBottom: "0.4em",
            fontSize: "0.8em",
            fontWeight: 700,
            letterSpacing: "0.11em",
            textTransform: "uppercase",
            color: `rgba(${accent},1)`,
          }}
        >
          <CalloutIcon type={type} color={`rgba(${accent},1)`} />
          {label}
        </div>
      )}
      {body}
    </div>
  );
}

// Resolve a `<div>`'s className to a callout type, or null for a plain div.
// `callout-<type>` (from remarkCallouts) wins; a bare `note` class supports the
// legacy raw `<div class="note">` authoring.
function calloutTypeFor(className) {
  const cn = className || "";
  const m = cn.match(/\bcallout-(\w+)\b/);
  if (m) return m[1];
  if (/\b(callout|note)\b/.test(cn)) return "note";
  return null;
}

// Reference orbs next to a heading — one per external link cited in that section
// ([[<url>|Title]]), each carrying its link-kind logo (arXiv / PDF / web).
function RefOrbs({ refs, theme }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "7px",
        marginLeft: "0.55em",
        verticalAlign: "middle",
      }}
    >
      {refs.map((r, i) => (
        <RefOrb
          key={`${r.url}#${i}`}
          url={r.url}
          label={r.title || refLabel(r.url)}
          theme={theme}
        />
      ))}
    </span>
  );
}

// Elements whose text must NOT be split: block code (under `pre`) gets
// re-serialized to a string for the SyntaxHighlighter, so injecting <mark>
// nodes there would corrupt it; the rest never carry visible prose. Inline
// `code` is NOT skipped — its children render straight through, so matches
// inside an inline pill highlight too (inline math still escapes via the
// math-class check below).
const HL_SKIP = new Set(["pre", "script", "style", "title"]);

// rehype plugin: wrap every case-insensitive occurrence of `term` in the rendered
// text with a `<mark class="search-hl">`, so a note opened from the dump search
// (?q=…) lands with the matched keyword highlighted. Runs before rehype-katex, so
// math is still a `code` fence here and gets skipped (its source isn't mangled).
function rehypeHighlightTerm(term) {
  const needle = (term || "").toLowerCase();
  const len = needle.length;
  return (tree) => {
    if (!len) return;
    const visit = (node) => {
      if (node.type === "element") {
        if (HL_SKIP.has(node.tagName)) return;
        const cn = node.properties?.className;
        const classes = Array.isArray(cn)
          ? cn
          : typeof cn === "string"
            ? cn.split(/\s+/)
            : [];
        // skip KaTeX output / math fences regardless of pipeline order
        if (classes.some((c) => c === "katex" || /(^|-)math(-|$)/.test(c)))
          return;
      }
      if (!node.children) return;
      const out = [];
      for (const child of node.children) {
        if (child.type !== "text" || !child.value) {
          visit(child);
          out.push(child);
          continue;
        }
        const value = child.value;
        const lower = value.toLowerCase();
        let from = 0;
        let idx = lower.indexOf(needle);
        if (idx === -1) {
          out.push(child);
          continue;
        }
        while (idx !== -1) {
          if (idx > from)
            out.push({ type: "text", value: value.slice(from, idx) });
          out.push({
            type: "element",
            tagName: "mark",
            properties: { className: ["search-hl"] },
            children: [{ type: "text", value: value.slice(idx, idx + len) }],
          });
          from = idx + len;
          idx = lower.indexOf(needle, from);
        }
        if (from < value.length)
          out.push({ type: "text", value: value.slice(from) });
      }
      node.children = out;
    };
    visit(tree);
  };
}

export default function ContentViewer({ content, centered = false, zoomable = true }) {
  const { theme } = useContext(ThemeContext);
  const location = useLocation();
  const params = useParams();
  // Which dump note this is (for reference-orb lookup); null off /dump/:id.
  const currentNoteId = location.pathname.startsWith("/dump/") ? params.id : null;
  // Image clicked to open in the zoomable lightbox overlay ({ src, alt } | null)
  const [lightbox, setLightbox] = useState(null);
  // Strip [[<url>]] reference links out of the body — they render as heading orbs.
  const cleaned = useMemo(() => stripReferences(content), [content]);

  // Keyword carried in from the dump search (?q=…) — every occurrence in the body
  // is wrapped in a <mark>, and we scroll to the first one. Empty when off-search.
  const searchTerm = useMemo(() => {
    const q = new URLSearchParams(location.search).get("q");
    return q ? q.trim() : "";
  }, [location.search]);
  const rehypePlugins = useMemo(() => {
    const plugins = [rehypeRaw, rehypeRemoveComments, rehypeSlug];
    if (searchTerm) plugins.push([rehypeHighlightTerm, searchTerm]);
    plugins.push(rehypeKatex);
    return plugins;
  }, [searchTerm]);

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

  // Opened from the dump search: bring the first highlighted match into view,
  // unless an explicit #section hash already targets a spot on the page.
  useEffect(() => {
    if (!searchTerm || window.location.hash) return;
    const el = document.querySelector(".search-hl");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [searchTerm, content]);

  // Every markdown renderer override, memoized so the component identities are
  // stable across re-renders: fresh per-render functions would hand
  // react-markdown new component *types* each time, unmounting and remounting
  // the entire rendered tree. (`setLightbox` is a useState setter — identity-
  // stable — so closing over it here is safe.)
  const components = useMemo(() => {
    // Heading renderer factory: applies the level's styling and appends a logo
    // orb per external reference cited in that heading's section.
    const heading = (level, className) =>
      function Heading(props) {
        const { node, children, ...rest } = props;
        const id = props.id;
        const Tag = `h${level}`;
        const refs =
          (currentNoteId && id && references[`${currentNoteId}#${id}`]) || [];
        return (
          <Tag className={className} {...rest}>
            {level >= 2 && level <= 4 && (
              <SectionOrb theme={theme} level={level} />
            )}
            {children}
            {refs.length > 0 && <RefOrbs refs={refs} theme={theme} />}
          </Tag>
        );
      };

    return {
      // A callout div — from a `> [!note]` blockquote (remarkCallouts) or
      // a raw `<div class="note">` — becomes a styled Callout card. Any
      // other raw `<div>` (e.g. the image flex rows) passes through with
      // its inline styles intact.
      div(props) {
        const { node, children, className, ...rest } = props;
        const type = calloutTypeFor(className);
        if (type) {
          return (
            <Callout
              type={type}
              title={rest["data-callout-title"]}
              theme={theme}
            >
              {children}
            </Callout>
          );
        }
        return (
          <div className={className} {...rest}>
            {children}
          </div>
        );
      },
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
            <DocLink href={href} theme={theme}>
              {children}
            </DocLink>
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
      table(props) {
        const { node, children, ...rest } = props;
        const isDark = theme === "dark";
        return (
          <div
            style={{
              overflowX: "auto",
              margin: "1.25em 0 1.5em",
              maxWidth: "100%",
            }}
          >
            <table
              {...rest}
              style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: 0,
                fontSize: "0.9em",
                lineHeight: 1.45,
                borderRadius: "0.65em",
                overflow: "hidden",
                background: isDark
                  ? "rgba(255,255,255,0.055)"
                  : "rgba(0,0,0,0.045)",
                border: `1px solid ${
                  isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.13)"
                }`,
              }}
            >
              {children}
            </table>
          </div>
        );
      },
      thead(props) {
        const { node, children, ...rest } = props;
        const isDark = theme === "dark";
        return (
          <thead
            {...rest}
            style={{
              background: isDark
                ? "rgba(255,255,255,0.09)"
                : "rgba(0,0,0,0.075)",
            }}
          >
            {children}
          </thead>
        );
      },
      th(props) {
        const { node, children, style, ...rest } = props;
        const isDark = theme === "dark";
        return (
          <th
            {...rest}
            style={{
              padding: "0.65em 0.85em",
              textAlign: "left",
              fontWeight: 700,
              WebkitTextStroke: "0.35px currentColor",
              borderBottom: `1px solid ${
                isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.14)"
              }`,
              ...style,
            }}
          >
            {children}
          </th>
        );
      },
      td(props) {
        const { node, children, style, ...rest } = props;
        const isDark = theme === "dark";
        return (
          <td
            {...rest}
            style={{
              padding: "0.58em 0.85em",
              borderTop: `1px solid ${
                isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"
              }`,
              verticalAlign: "top",
              ...style,
            }}
          >
            {children}
          </td>
        );
      },
      code(props) {
        const { children, className, node, ...rest } = props;
        // Capture hyphenated fence words too (e.g. `python-compile`), so a
        // per-block marker can ride in the language token. The second word
        // of a fence (```python no-run) is dropped by remark → rehype-raw
        // (no className, no node.data.meta survives), so the marker must
        // live in the first word.
        const match = /language-([\w-]+)/.exec(className || "");
        // Flatten, don't String(): the search highlighter may nest <mark>
        // elements inside an inline code's children, and String() on a mixed
        // array would yield "[object Object]".
        const text = flattenText(children);
        const lang = match ? match[1] : null;
        // ```python-compile / ```py-compile → a live, runnable & steppable
        // block. Plain ```python / ```py is just highlighted source with no
        // Run button, so ordinary Python fences stay inert (portable,
        // standard-markdown behaviour) and running is explicitly opt-in.
        const isPython = lang === "python" || lang === "py";
        const runnablePython =
          lang === "python-compile" || lang === "py-compile";
        // ```mermaid → render an actual diagram instead of highlighting
        // the source (theme-aware, lazy-loaded — see Mermaid.jsx).
        if (match && match[1] === "mermaid") {
          return (
            <Mermaid
              code={text.replace(/\n$/, "")}
              theme={theme}
              zoomable={zoomable}
            />
          );
        }
        // ```surprise / ```plot → a math figure rendered as a self-contained,
        // dependency-free SVG (analytic curve sampled in JS — see Plot.jsx). No
        // library, no lazy chunk: it adds nothing to the bundle and renders
        // synchronously, so it can't slow md rendering or the page.
        if (match && (match[1] === "surprise" || match[1] === "plot")) {
          return (
            <Plot
              spec={text.replace(/\n$/, "")}
              fenceLang={match[1]}
              theme={theme}
              zoomable={zoomable}
            />
          );
        }
        // ```python-compile / ```py-compile → a live, runnable & steppable
        // block (lazy CPython-in-WASM via Pyodide — see PythonRunner.jsx).
        if (runnablePython) {
          return (
            <PythonRunner code={text.replace(/\n$/, "")} theme={theme} />
          );
        }
        // ```github / ```codefile → fetch a linked source file (the fence
        // body is its GitHub blob URL) and show it scrollable, highlighted,
        // with a link back out (see CodeFile.jsx).
        if (match && (match[1] === "github" || match[1] === "codefile")) {
          return <CodeFile url={text.trim()} theme={theme} />;
        }
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
            // canonicalLang: the async-light Prism build only knows canonical
            // language names, not the aliases (js, sh, …) the full build had.
            language={isPython ? "python" : match ? canonicalLang(match[1]) : "text"}
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
            // inline code: a quiet, flat pill that sits in the prose flow
            // without competing with it. Warm tinted background + hairline
            // border echo the blog's muted palette (index.css variables);
            // no gradient or glow so it reads as typography, not a widget.
            // Dark mode inverts to the photographic negative.
            className="rounded-[0.32em] px-[0.34em] py-[0.06em] mx-[0.04em]"
            style={{
              fontFamily:
                '"Commit Mono", "Fira Code", Menlo, Consolas, "DejaVu Sans Mono", monospace',
              fontSize: "0.8em",
              background: theme === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.045)",
              color: "inherit",
              border: theme === "dark"
                ? "1px solid var(--border-color)"
                : "1px solid var(--border-color)",
              boxDecorationBreak: "clone",
              WebkitBoxDecorationBreak: "clone",
            }}
          >
            {children}
          </code>
        );
      },
      // A whole list → ONE soft tinted panel (the bullets share a single
      // merged background instead of each being its own floating card), so
      // a list reads as a grouped unit. Inline-styled because a top-level
      // `<ul>` is a direct child of `.markdown`, where the `> * { all:
      // revert }` rule (index.css) would wipe class-applied layout; inline
      // styles outrank it. A nested `<ul>` recurses through here too, so it
      // becomes an inset sub-panel inside its parent bullet row (its outer
      // margins are trimmed in index.css via `!important`, which is the only
      // thing that can beat the inline margin).
      ul(props) {
        const { children, node, className, ...rest } = props;
        const isDark = theme === "dark";
        const inToc = useContext(TocContext);
        // Inside a `> [!toc]` callout, skip the panel and lay the list
        // out as a quiet, indented outline (styled by `.toc-list` in
        // index.css — these sit inside the callout, so `all: revert`
        // doesn't reach them and class CSS applies cleanly).
        if (inToc) {
          return (
            <ul {...rest} className={`toc-list ${className || ""}`.trim()}>
              {children}
            </ul>
          );
        }
        return (
          <ul
            {...rest}
            className={className}
            style={{
              listStyle: "none",
              margin: "0.85em 0",
              // Hug the longest bullet row instead of stretching full
              // width, and leave a wide right gutter for the fade tail
              // to dissolve into.
              padding: "0.1em 4.5em 0.1em 0.9em",
              display: "flex",
              flexDirection: "column",
              width: "fit-content",
              maxWidth: "100%",
              borderRadius: "0.6em",
              background: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.06)",
              border: `1px solid ${
                isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.13)"
              }`,
              // Keep fill + border + dividers fully solid up to just
              // past the last word of the longest row, then dissolve the
              // whole panel (bg, border, rounded corner) rightward into
              // the page background.
              WebkitMaskImage:
                "linear-gradient(to right, #000 calc(100% - 4em), transparent 100%)",
              maskImage:
                "linear-gradient(to right, #000 calc(100% - 4em), transparent 100%)",
            }}
          >
            {children}
          </ul>
        );
      },
      // One bullet → a row *inside* the shared list panel (no card of its
      // own). Consecutive rows are split by a hairline divider so they stay
      // legible while the background reads as one continuous group — that
      // divider is a CSS `li + li` rule (index.css), NOT done here: react-
      // markdown v9 doesn't pass a list `index` to this component, so an
      // inline first-row check can't work. The orb marker uses the site's
      // black-hole / white-matter material (black orb in light mode, white
      // in dark); orb + content sit in a flex row so wrapped lines hang
      // past it.
      li(props) {
        const { children, node, ordered, index, checked, ...rest } = props;
        const isDark = theme === "dark";
        const inToc = useContext(TocContext);
        // TOC row: a small neutral dot + the anchor link, no panel /
        // glow / divider. `borderTop: 0` cancels the `.markdown li + li`
        // hairline (an inline value beats that non-important CSS rule).
        if (inToc) {
          return (
            <li
              {...rest}
              style={{
                listStyle: "none",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.55em",
                margin: 0,
                padding: "0.16em 0",
                borderTop: 0,
                fontSize: "0.9em",
                lineHeight: 1.5,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  flex: "0 0 auto",
                  width: "0.32em",
                  height: "0.32em",
                  marginTop: "0.5em",
                  borderRadius: "999px",
                  background: isDark
                    ? "rgba(255,255,255,0.5)"
                    : "rgba(0,0,0,0.45)",
                }}
              />
              <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                {children}
              </div>
            </li>
          );
        }
        return (
          <li
            {...rest}
            style={{
              listStyle: "none",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.6em",
              margin: 0,
              padding: "0.5em 0",
              fontSize: "0.9em",
              lineHeight: 1.55,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                flex: "0 0 auto",
                width: "0.4em",
                height: "0.4em",
                marginTop: "0.5em",
                borderRadius: "999px",
                background: isDark
                  ? "radial-gradient(circle at 50% 42%, #fff 58%, #fafafa 78%, rgba(255,255,255,0) 100%)"
                  : "radial-gradient(circle at 50% 42%, #000 58%, #050505 78%, rgba(0,0,0,0) 100%)",
                border: isDark
                  ? "1px solid rgba(255,255,255,0.55)"
                  : "1px solid rgba(0,0,0,0.35)",
                boxShadow: isDark
                  ? "0 0 5px 0 rgba(255,255,255,0.45)"
                  : "0 0 5px 0 rgba(0,0,0,0.35)",
              }}
            />
            <div style={{ flex: "1 1 auto", minWidth: 0 }}>{children}</div>
          </li>
        );
      },
      // Search-keyword highlight (from the dump search ?q=…). Tinted in
      // the site's accent — olive on the dark page, purple on the light
      // one — with a soft glow, echoing the code-slab / orb halos.
      mark(props) {
        const { node, children, ...rest } = props;
        const isDark = theme === "dark";
        return (
          <mark
            {...rest}
            style={{
              background: isDark
                ? "rgba(135,145,65,0.40)"
                : "rgba(120,110,190,0.28)",
              color: "inherit",
              borderRadius: "0.25em",
              padding: "0.04em 0.16em",
              boxShadow: isDark
                ? "0 0 6px 0 rgba(135,145,65,0.4)"
                : "0 0 6px 0 rgba(120,110,190,0.32)",
            }}
          >
            {children}
          </mark>
        );
      },
      strong(props) {
        const { children, node, ...rest } = props;
        return <strong className="font-bold" {...rest}>{children}</strong>;
      },
      em(props) {
        const { children, node, ...rest } = props;
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
    };
  }, [theme, centered, zoomable, currentNoteId]);

  // The rendered markdown element, memoized: ContentViewer re-renders for
  // lightbox open/close and for every location change (hash included) — far
  // too often to re-run the unified parse pipeline, which on a long KaTeX-
  // heavy note costs hundreds of ms plus a full DOM teardown/rebuild.
  const markdown = useMemo(
    () => (
      <Markdown
        className={`markdown ${centered ? "text-center" : ""}`}
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {cleaned}
      </Markdown>
    ),
    [cleaned, centered, rehypePlugins, components]
  );

  return (
    <>
      <div className="w-full">
        <div className="md:w-8/12 w-full px-4 mx-auto">{markdown}</div>
      </div>
      {lightbox &&
        createPortal(
          <ImageLightbox
            key={lightbox.src}
            src={lightbox.src}
            alt={lightbox.alt}
            onClose={() => setLightbox(null)}
          />,
          // Portal to <body> so the `fixed inset-0` overlay covers the viewport.
          // The dump page's `.page-fade-in` wrapper keeps a `transform` (animation
          // fill-mode: both), which would otherwise become the containing block for
          // the fixed overlay — positioning it over the whole document instead, so
          // a scrolled-open lightbox lands off-screen and just dims the page.
          document.body
        )}
    </>
  );
}
