import { useEffect, useMemo, useState } from "react";
import {
  SyntaxHighlighter,
  ONE_LIGHT_NO_BG,
  VSC_DARK_PLUS_NO_BG,
  slab,
} from "./codeSlab";

// ── Code viewer for a linked source file ─────────────────────────────────────
// Renders a ```github (or ```codefile) fenced block whose body is a GitHub blob
// URL — fetches the raw file, highlights it, lets you scroll through it, and
// links back out to the page. Wears the shared "photographic-negative" slab
// (see codeSlab.js) used by the inline code blocks / PythonRunner, plus the
// neutral black/white background blur the page asks for.

// File extension → Prism language. Anything unlisted falls back to plain text.
const EXT_LANG = {
  py: "python", pyw: "python", ipynb: "json",
  js: "javascript", mjs: "javascript", cjs: "javascript", jsx: "jsx",
  ts: "typescript", tsx: "tsx",
  c: "c", h: "c", cpp: "cpp", cc: "cpp", cxx: "cpp", hpp: "cpp", hh: "cpp",
  cs: "csharp", java: "java", kt: "kotlin", scala: "scala",
  go: "go", rs: "rust", rb: "ruby", php: "php", swift: "swift",
  sh: "bash", bash: "bash", zsh: "bash", fish: "bash",
  lua: "lua", r: "r", jl: "julia", dart: "dart", ex: "elixir", exs: "elixir",
  hs: "haskell", clj: "clojure", ml: "ocaml",
  sql: "sql", graphql: "graphql", gql: "graphql",
  html: "markup", xml: "markup", svg: "markup", vue: "markup",
  css: "css", scss: "scss", sass: "sass", less: "less",
  json: "json", jsonc: "json", yml: "yaml", yaml: "yaml", toml: "toml",
  md: "markdown", mdx: "markdown", tex: "latex",
  dockerfile: "docker", makefile: "makefile",
};

function langForFile(name) {
  const lower = name.toLowerCase();
  if (lower === "dockerfile") return "docker";
  if (lower === "makefile") return "makefile";
  const ext = lower.includes(".") ? lower.split(".").pop() : "";
  return EXT_LANG[ext] || "text";
}

// Parse a GitHub blob URL (or a raw.githubusercontent URL) into the bits we need:
// the raw endpoint to fetch, the page to link out to, a display path, the file
// name, and any #L<start>(-L<end>) line range to highlight. Best-effort: an
// unrecognized URL is fetched as-is and linked as-is.
function parseSource(input) {
  const raw = (input || "").trim();
  const [urlPart, hash = ""] = raw.split("#");
  const url = urlPart.trim();

  // #L12 or #L12-L40 → highlight range (GitHub's own line-anchor syntax).
  let lineRange = null;
  const m = hash.match(/^L(\d+)(?:-L?(\d+))?$/);
  if (m) {
    const start = parseInt(m[1], 10);
    const end = m[2] ? parseInt(m[2], 10) : start;
    lineRange = { start: Math.min(start, end), end: Math.max(start, end) };
  }

  // github.com/<owner>/<repo>/blob/<branch>/<path...>
  const blob = url.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i
  );
  if (blob) {
    const [, owner, repo, branch, path] = blob;
    const cleanPath = path.replace(/\?.*$/, "");
    const filename = decodeURIComponent(cleanPath.split("/").pop());
    return {
      rawUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${cleanPath}`,
      pageUrl: raw,
      repo: `${owner}/${repo}`,
      displayPath: cleanPath,
      filename,
      lineRange,
    };
  }

  // Already a raw URL — fetch directly, still try to name the file.
  const filename = decodeURIComponent(
    url.replace(/\?.*$/, "").split("/").pop() || "file"
  );
  return {
    rawUrl: url,
    pageUrl: raw,
    repo: "",
    displayPath: filename,
    filename,
    lineRange,
  };
}

// Cache fetched files for the session so a theme toggle / remount doesn't refetch.
const fileCache = new Map(); // rawUrl → Promise<{ text } | { error }>
function loadFile(rawUrl) {
  if (fileCache.has(rawUrl)) return fileCache.get(rawUrl);
  const p = fetch(rawUrl)
    .then((r) => {
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      return r.text();
    })
    .then((text) => ({ text }))
    .catch((e) => ({ error: e?.message || "failed to load" }));
  fileCache.set(rawUrl, p);
  return p;
}

// The shared slab (codeSlab.js) plus this card's extra halo: a soft, even
// neutral glow behind the card — white with no spread in dark mode (hugs the
// rounded shape, no boxy plate), a low-alpha layered elevation in light mode
// (grounds the card without reading as a flat dark plate below it).
function haloSlab(isDark) {
  const base = slab(isDark);
  return {
    ...base,
    boxShadow: isDark
      ? `${base.boxShadow}, 0 4px 30px rgba(255,255,255,0.07)`
      : `${base.boxShadow}, 0 10px 15px -6px rgba(0,0,0,0.12), 0 4px 6px -4px rgba(0,0,0,0.10)`,
  };
}

// The GitHub mark, inlined so it can take the slab's ink color.
function GithubMark({ color, size = 15 }) {
  return (
    <svg
      height={size}
      width={size}
      viewBox="0 0 16 16"
      fill={color}
      aria-hidden="true"
      style={{ display: "block", flex: "0 0 auto" }}
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

// Line icons (lucide/feather style, stroked in `color`) — match the callout
// glyphs used elsewhere on the site.
function CopyIcon({ color, size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: "block", flex: "0 0 auto" }}
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
function CheckIcon({ color, size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: "block", flex: "0 0 auto" }}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// Small ghost button matching PythonRunner's `Btn`. `square` tightens the
// padding for icon-only buttons.
function Btn({ ink, onClick, href, title, square, children }) {
  const style = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4em",
    font: "inherit",
    fontSize: "0.78rem",
    lineHeight: 1,
    padding: square ? "0.42em 0.48em" : "0.42em 0.7em",
    borderRadius: "0.5em",
    color: ink,
    textDecoration: "none",
    border: `1px solid ${ink}33`,
    background: `${ink}12`,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" title={title} style={style}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} title={title} style={style}>
      {children}
    </button>
  );
}

export default function CodeFile({ url, theme }) {
  const isDark = theme === "dark";
  const s = useMemo(() => haloSlab(isDark), [isDark]);
  const src = useMemo(() => parseSource(url), [url]);
  const lang = useMemo(() => langForFile(src.filename), [src.filename]);

  const [state, setState] = useState({ status: "loading" }); // loading | ready | error
  const [copied, setCopied] = useState(false);

  // Fetch (through the session cache). Guard against a late resolve after the
  // url prop changed out from under us.
  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    loadFile(src.rawUrl).then((res) => {
      if (!alive) return;
      if (res.error) setState({ status: "error", message: res.error });
      else setState({ status: "ready", code: res.text.replace(/\n$/, "") });
    });
    return () => {
      alive = false;
    };
  }, [src.rawUrl]);

  const copy = () => {
    if (state.status !== "ready") return;
    navigator.clipboard?.writeText(state.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };

  const { lineRange } = src;
  const lineCount = state.status === "ready" ? state.code.split("\n").length : 0;

  return (
    <div
      className="my-5"
      style={{
        border: s.border,
        background: s.background,
        boxShadow: s.boxShadow,
        color: s.ink,
        borderRadius: "0.8em",
        overflow: "hidden",
      }}
    >
      {/* header: file identity (left) + actions (right) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75em",
          padding: "0.6em 0.85em 0.6em 0.95em",
          borderBottom: `1px solid ${s.ink}1a`,
        }}
      >
        <div style={{ minWidth: 0, flex: "1 1 auto", lineHeight: 1.25 }}>
          <div
            style={{
              fontSize: "0.86rem",
              fontWeight: 700,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {src.filename}
          </div>
          {(src.repo || src.displayPath !== src.filename) && (
            <div
              style={{
                fontSize: "0.7rem",
                opacity: 0.55,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                direction: "rtl", // keep the meaningful tail (path/file) visible
                textAlign: "left",
              }}
              title={`${src.repo}${src.repo ? " · " : ""}${src.displayPath}`}
            >
              {src.repo ? `${src.repo} / ${src.displayPath}` : src.displayPath}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4em", flex: "0 0 auto" }}>
          {state.status === "ready" && (
            <Btn
              ink={s.ink}
              square
              onClick={copy}
              title={copied ? "Copied" : "Copy file contents"}
            >
              {copied ? (
                <CheckIcon color={s.ink} />
              ) : (
                <CopyIcon color={s.ink} />
              )}
            </Btn>
          )}
          <Btn ink={s.ink} href={src.pageUrl} title="Open the file on GitHub">
            <GithubMark color={s.ink} size={14} />
            <span aria-hidden="true">↗</span>
          </Btn>
        </div>
      </div>

      {/* body */}
      {state.status === "loading" && (
        <div style={{ padding: "1.4em 1.1em", fontSize: "0.85rem", opacity: 0.6 }}>
          Loading {src.filename}…
        </div>
      )}

      {state.status === "error" && (
        <div style={{ padding: "1.2em 1.1em", fontSize: "0.82rem" }}>
          <div style={{ color: isDark ? "#b3261e" : "#e06c75", marginBottom: "0.4em" }}>
            Couldn’t load this file ({state.message}).
          </div>
          <a
            href={src.pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: s.ink, opacity: 0.8 }}
          >
            Open it on GitHub ↗
          </a>
        </div>
      )}

      {state.status === "ready" && (
        <div style={{ maxHeight: "30rem", overflow: "auto" }}>
          <SyntaxHighlighter
            PreTag="div"
            language={lang}
            style={isDark ? ONE_LIGHT_NO_BG : VSC_DARK_PLUS_NO_BG}
            className="text-sm"
            showLineNumbers
            wrapLines
            lineNumberStyle={{ minWidth: "2.6em", opacity: 0.4, userSelect: "none" }}
            lineProps={(n) => ({
              style: {
                display: "block",
                margin: "0 -1.1em",
                padding: "0 1.1em",
                background:
                  lineRange && n >= lineRange.start && n <= lineRange.end
                    ? s.active
                    : "transparent",
                boxShadow:
                  lineRange && n >= lineRange.start && n <= lineRange.end
                    ? `inset 3px 0 0 0 ${s.accent}`
                    : "none",
              },
            })}
            customStyle={{
              margin: 0,
              background: "transparent",
              padding: "0.9em 1.1em",
            }}
          >
            {state.code}
          </SyntaxHighlighter>
        </div>
      )}

      {/* footer meta */}
      {state.status === "ready" && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "0.45em 1.1em",
            borderTop: `1px solid ${s.ink}1a`,
            fontSize: "0.7rem",
            opacity: 0.5,
          }}
        >
          <span>{lang === "text" ? "plain text" : lang}</span>
          <span>
            {lineCount} line{lineCount === 1 ? "" : "s"}
            {lineRange ? ` · L${lineRange.start}–${lineRange.end}` : ""}
          </span>
        </div>
      )}
    </div>
  );
}
