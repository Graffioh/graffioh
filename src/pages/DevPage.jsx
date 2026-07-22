// Local-only markdown workbench for the mds/ directory — an Obsidian-flavored
// read / split / edit view over every note, rendered through the site's real
// ContentViewer so the preview matches the deployed pages exactly. Reached at
// /dev, which is only routed on the vite dev server (see App.jsx); the file
// API behind it (/__mds/*) likewise only exists in dev (mdsEditorPlugin.js).
import React, {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import ContentViewer from "../ContentViewer";
import { ThemeContext } from "../ThemeContext";
import blogPosts from "../data/blogPosts";
import {
  EditorState,
  EditorSelection,
  Compartment,
} from "@codemirror/state";
import {
  EditorView,
  keymap,
  drawSelection,
  lineNumbers,
  highlightActiveLineGutter,
} from "@codemirror/view";
import {
  history,
  defaultKeymap,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import {
  markdown,
  markdownLanguage,
  markdownKeymap,
} from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { tags } from "@lezer/highlight";
import { vim, getCM, Vim } from "@replit/codemirror-vim";

// ---------------------------------------------------------------- api client

async function call(url, opts) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
  return data;
}

const api = {
  list: () => call("/__mds/list"),
  read: (p) => call(`/__mds/file?path=${encodeURIComponent(p)}`),
  save: (p, content, { ifAbsent = false } = {}) =>
    call(`/__mds/file?path=${encodeURIComponent(p)}${ifAbsent ? "&ifAbsent=1" : ""}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    }),
  remove: (p) =>
    call(`/__mds/file?path=${encodeURIComponent(p)}`, { method: "DELETE" }),
  newBlogPost: (title) =>
    call("/__mds/blog-post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }),
};

// ------------------------------------------------------------------- helpers

const GROUP_ORDER = ["blog", "dump", "chronicles", "notes", "pages"];

// Folders kept out of the sidebar (still on disk, just not listed).
const HIDDEN_GROUPS = ["notes"];

const dirOf = (p) => (p.includes("/") ? p.slice(0, p.indexOf("/")) : "pages");

function groupFiles(files) {
  const groups = new Map();
  for (const f of files) {
    const slash = f.indexOf("/");
    const dir = slash === -1 ? "pages" : f.slice(0, slash);
    if (!groups.has(dir)) groups.set(dir, []);
    groups.get(dir).push(f);
  }
  for (const [dir, list] of groups) {
    if (dir === "blog") {
      // newest post first, like the /blog page
      list.sort((a, b) => blogNum(b) - blogNum(a));
    } else {
      list.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }
  }
  const rank = (d) => {
    const i = GROUP_ORDER.indexOf(d);
    return i === -1 ? GROUP_ORDER.length : i;
  };
  return [...groups.entries()].sort((a, b) => rank(a[0]) - rank(b[0]));
}

function blogNum(p) {
  const m = /(\d+)\.md$/.exec(p);
  return m ? Number(m[1]) : 0;
}

const blogTitleById = Object.fromEntries(
  blogPosts.map((p) => [p.id, p.title.trim()])
);
const blogDateById = Object.fromEntries(blogPosts.map((p) => [p.id, p.date]));

function fileLabel(path) {
  const name = path.slice(path.indexOf("/") + 1).replace(/\.md$/, "");
  if (path.startsWith("blog/"))
    return `${name} · ${blogTitleById[name] || "untitled"}`;
  return name;
}

// Where this file renders on the real site, for the "view ↗" button.
function siteUrlFor(path) {
  const m = /^([^/]+)\/(.+)\.md$/.exec(path);
  if (!m) {
    const root = path.replace(/\.md$/, "");
    return (
      { aboutme: "/", projects: "/projects", resources: "/resources", bertologies: "/bertologies" }[root] ||
      null
    );
  }
  const [, dir, id] = m;
  return (
    {
      blog: `/blog/post/${id}`,
      dump: `/dump/${id}`,
      chronicles: `/chronicles/${id}`,
      notes: `/notes/note/${id}`,
    }[dir] || null
  );
}

const draftKey = (p) => `mds-draft:${p}`;

// ------------------------------------------------------------------- editor
// CodeMirror 6 with @replit/codemirror-vim — real vim (counts, registers,
// visual mode, / search, ex commands), markdown syntax highlighting with
// per-language fenced code, and list/quote continuation on Enter.

const MONO =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';

// The vim ex command `:w` routes to the workbench's save button; the mounted
// editor keeps this pointing at the current save handler.
let requestSave = null;
Vim.defineEx("write", "w", () => {
  if (requestSave) requestSave();
});

// ⌘B / ⌘I — wrap the selection in ** / *
const wrapWith = (mark) => (view) => {
  view.dispatch(
    view.state.changeByRange((range) => {
      const text = view.state.sliceDoc(range.from, range.to) || "text";
      return {
        changes: { from: range.from, to: range.to, insert: mark + text + mark },
        range: EditorSelection.range(
          range.from + mark.length,
          range.from + mark.length + text.length
        ),
      };
    })
  );
  return true;
};

// Editor chrome, themed with the site's CSS vars so it follows light/dark.
// The big bottom padding is Obsidian-style overscroll past the last line.
function cmTheme(dark) {
  const selection = dark ? "rgba(135,145,65,0.35)" : "rgba(120,110,190,0.28)";
  return EditorView.theme(
    {
      "&": {
        height: "100%",
        backgroundColor: "transparent",
        color: "var(--text-color)",
        fontSize: "13.5px",
      },
      ".cm-scroller": {
        fontFamily: MONO,
        lineHeight: "1.7",
        paddingTop: "20px",
        paddingBottom: "45vh",
      },
      ".cm-content": { padding: "0", caretColor: "var(--text-color)" },
      ".cm-line": { padding: "0 24px 0 14px" },
      ".cm-gutters": {
        backgroundColor: "transparent",
        color: dark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.26)",
        border: "none",
        paddingLeft: "10px",
      },
      ".cm-lineNumbers .cm-gutterElement": {
        minWidth: "34px",
        textAlign: "right",
      },
      ".cm-activeLineGutter": {
        backgroundColor: "transparent",
        color: "var(--text-color)",
      },
      "&.cm-focused": { outline: "none" },
      ".cm-cursor": { borderLeftColor: "var(--text-color)" },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
        backgroundColor: selection,
      },
      // vim's block cursor
      ".cm-fat-cursor": {
        background: "var(--text-color)",
        color: "var(--bg-color)",
      },
      "&:not(.cm-focused) .cm-fat-cursor": {
        background: "none",
        outline: "1px solid var(--text-color)",
      },
      // the : / search panel vim opens along the bottom edge
      ".cm-panels": {
        backgroundColor: "var(--bg-color)",
        color: "var(--text-color)",
        borderTop: "1px solid var(--border-color)",
        fontFamily: MONO,
      },
      ".cm-panels input": {
        color: "var(--text-color)",
        fontFamily: MONO,
      },
    },
    { dark }
  );
}

// Markdown (and fenced-code) token colors — the same purple/olive accents as
// the site's inline-code glow.
function cmHighlight(dark) {
  const accent = dark ? "#aab661" : "#6d5bd0";
  const url = dark ? "#8fa7e8" : "#4a6bd4";
  const code = dark ? "#d3b56a" : "#9a6700";
  const dim = dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)";
  return HighlightStyle.define([
    { tag: tags.heading, fontWeight: "750" },
    { tag: tags.processingInstruction, color: accent }, // #, >, ``` fences, …
    { tag: tags.strong, fontWeight: "700" },
    { tag: tags.emphasis, fontStyle: "italic" },
    { tag: tags.strikethrough, textDecoration: "line-through" },
    { tag: tags.monospace, color: code },
    { tag: tags.url, color: url },
    { tag: tags.link, color: url },
    { tag: tags.contentSeparator, color: dim }, // ---
    // inside fenced code blocks
    { tag: tags.keyword, color: accent },
    { tag: tags.string, color: code },
    { tag: tags.comment, color: dim, fontStyle: "italic" },
    { tag: tags.number, color: url },
  ]);
}

function MarkdownEditor({
  value,
  onChange,
  scrollRef,
  onScroll,
  vimEnabled,
  dark,
  onSave,
}) {
  const hostRef = useRef(null);
  const viewRef = useRef(null);
  const [vimMode, setVimMode] = useState("normal");
  const vimConf = useRef(new Compartment()).current;
  const themeConf = useRef(new Compartment()).current;

  // Latest callbacks, so the one-time listeners below never go stale.
  const cbRef = useRef({});
  cbRef.current = { onChange, onScroll, onSave };

  useEffect(() => {
    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          // vim() must precede the other keymaps to win key conflicts
          vimConf.of(vimEnabled ? vim() : []),
          history(),
          drawSelection(),
          lineNumbers(),
          highlightActiveLineGutter(),
          EditorView.lineWrapping,
          markdown({ base: markdownLanguage, codeLanguages: languages }),
          themeConf.of([cmTheme(dark), syntaxHighlighting(cmHighlight(dark))]),
          keymap.of([
            { key: "Mod-b", run: wrapWith("**") },
            { key: "Mod-i", run: wrapWith("*") },
            indentWithTab,
            ...markdownKeymap, // Enter continues lists / quotes
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) cbRef.current.onChange(u.state.doc.toString());
          }),
        ],
      }),
      parent: hostRef.current,
    });
    viewRef.current = view;
    if (scrollRef) scrollRef.current = view.scrollDOM;
    const onScrollEv = () => cbRef.current.onScroll?.();
    view.scrollDOM.addEventListener("scroll", onScrollEv);
    requestSave = () => cbRef.current.onSave?.();
    view.focus();
    return () => {
      requestSave = null;
      view.scrollDOM.removeEventListener("scroll", onScrollEv);
      if (scrollRef) scrollRef.current = null;
      viewRef.current = null;
      view.destroy();
    };
    // mounts once per file (keyed on path); compartments track prop changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // External value changes (revert, draft restore) — replace the doc.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const cur = view.state.doc.toString();
    if (value !== cur)
      view.dispatch({ changes: { from: 0, to: cur.length, insert: value } });
  }, [value]);

  // Toggle vim in place, and mirror its mode into the corner badge.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ effects: vimConf.reconfigure(vimEnabled ? vim() : []) });
    if (!vimEnabled) return;
    setVimMode("normal");
    const cm = getCM(view);
    const onMode = ({ mode }) => setVimMode(mode);
    cm?.on("vim-mode-change", onMode);
    return () => cm?.off("vim-mode-change", onMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vimEnabled]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: themeConf.reconfigure([
        cmTheme(dark),
        syntaxHighlighting(cmHighlight(dark)),
      ]),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dark]);

  return (
    <div style={{ position: "relative", flex: 1, minWidth: 0, minHeight: 0 }}>
      <div ref={hostRef} style={{ position: "absolute", inset: 0 }} />
      {vimEnabled && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            right: 16,
            bottom: 10,
            fontFamily: MONO,
            fontSize: "0.66rem",
            letterSpacing: "0.09em",
            textTransform: "uppercase",
            padding: "2px 8px",
            borderRadius: 6,
            border: "1px solid var(--border-color)",
            background: "var(--bg-color)",
            color: "var(--text-color)",
            opacity: 0.8,
            pointerEvents: "none",
            zIndex: 2,
          }}
        >
          {vimMode}
        </span>
      )}
    </div>
  );
}

// -------------------------------------------------------------------- chrome

function ToolButton({ onClick, title, children, disabled, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="mds-toolbtn"
      style={danger ? { color: "#c05252" } : undefined}
    >
      {children}
    </button>
  );
}

const MODES = ["read", "split", "edit"];

// --------------------------------------------------------------------- page

export default function DevPage() {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === "dark";
  const [searchParams, setSearchParams] = useSearchParams();

  const [files, setFiles] = useState([]);
  const [openPath, setOpenPath] = useState(null);
  const [content, setContent] = useState("");
  const [diskContent, setDiskContent] = useState("");
  const [mode, setMode] = useState(
    () => sessionStorage.getItem("mds-mode") || "split"
  );
  const [vimEnabled, setVimEnabled] = useState(
    () => localStorage.getItem("mds-vim") !== "0"
  );
  useEffect(() => {
    localStorage.setItem("mds-vim", vimEnabled ? "1" : "0");
  }, [vimEnabled]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const dirty = openPath != null && content !== diskContent;

  const wrapRef = useRef(null);
  const edScrollRef = useRef(null);
  const pvScrollRef = useRef(null);
  const [height, setHeight] = useState("75vh");

  const groups = useMemo(
    () => groupFiles(files).filter(([dir]) => !HIDDEN_GROUPS.includes(dir)),
    [files]
  );

  // Which sidebar groups are unfolded — collapsed by default, remembered
  // across sessions. Opening a file always unfolds its own group.
  const [expandedGroups, setExpandedGroups] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("mds-expanded") || "[]"));
    } catch {
      return new Set();
    }
  });
  useEffect(() => {
    localStorage.setItem("mds-expanded", JSON.stringify([...expandedGroups]));
  }, [expandedGroups]);
  const toggleGroup = (dir) =>
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(dir)) next.delete(dir);
      else next.add(dir);
      return next;
    });

  // Debounced preview so keystrokes don't re-run the unified pipeline each hit.
  const [preview, setPreview] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setPreview(content), 250);
    return () => clearTimeout(t);
  }, [content]);

  // Fill the viewport below the site header.
  useEffect(() => {
    const measure = () => {
      if (!wrapRef.current) return;
      const top = wrapRef.current.getBoundingClientRect().top;
      setHeight(Math.max(320, window.innerHeight - top - 10));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const refreshList = async () => {
    const { files: next } = await api.list();
    setFiles(next);
    return next;
  };

  async function openFile(p) {
    try {
      const { content: disk } = await api.read(p);
      const draft = sessionStorage.getItem(draftKey(p));
      setOpenPath(p);
      setDiskContent(disk);
      // an unsaved draft (stashed below) survives reloads; disk wins when equal
      setContent(draft != null && draft !== disk ? draft : disk);
      setError(null);
      setSearchParams({ file: p }, { replace: true });
      // make sure the opened file's group is unfolded in the sidebar
      setExpandedGroups((prev) =>
        prev.has(dirOf(p)) ? prev : new Set([...prev, dirOf(p)])
      );
      if (edScrollRef.current) edScrollRef.current.scrollTop = 0;
      if (pvScrollRef.current) pvScrollRef.current.scrollTop = 0;
    } catch (err) {
      setError(err.message);
    }
  }

  // Initial load: file list, then reopen ?file= if present.
  useEffect(() => {
    (async () => {
      try {
        const list = await refreshList();
        const wanted = searchParams.get("file");
        if (wanted && list.includes(wanted)) await openFile(wanted);
      } catch (err) {
        setError(err.message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stash unsaved work in sessionStorage so an HMR full-reload can't eat it.
  useEffect(() => {
    if (!openPath) return;
    const t = setTimeout(() => {
      if (content !== diskContent)
        sessionStorage.setItem(draftKey(openPath), content);
      else sessionStorage.removeItem(draftKey(openPath));
    }, 300);
    return () => clearTimeout(t);
  }, [content, diskContent, openPath]);

  useEffect(() => {
    sessionStorage.setItem("mds-mode", mode);
  }, [mode]);

  async function save() {
    if (!openPath || !dirty || saving) return;
    setSaving(true);
    try {
      await api.save(openPath, content);
      setDiskContent(content);
      sessionStorage.removeItem(draftKey(openPath));
      setError(null);
    } catch (err) {
      setError(`save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }
  const saveRef = useRef(save);
  saveRef.current = save;

  // cmd/ctrl+S anywhere on the page
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Native "unsaved changes" prompt on tab close / hard reload.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function createIn(dir) {
    try {
      if (dir === "blog") {
        const title = window.prompt("New blog post title:");
        if (!title || !title.trim()) return;
        const { path: p } = await api.newBlogPost(title.trim());
        await refreshList();
        await openFile(p);
        setMode("split");
        return;
      }
      const name = window.prompt(
        `New file in ${dir === "pages" ? "mds/ (root)" : `mds/${dir}/`} — name:`
      );
      if (!name || !name.trim()) return;
      const slug = name
        .trim()
        .replace(/\.md$/i, "")
        .replace(/\s+/g, "-")
        .toLowerCase();
      const p = dir === "pages" ? `${slug}.md` : `${dir}/${slug}.md`;
      if (files.includes(p)) {
        await openFile(p);
        return;
      }
      await api.save(p, `# ${name.trim().replace(/\.md$/i, "")}\n\n`, {
        ifAbsent: true,
      });
      await refreshList();
      await openFile(p);
      setMode("split");
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeOpen() {
    if (!openPath) return;
    const extra = openPath.startsWith("blog/")
      ? " (its blogPosts.js entry goes too)"
      : "";
    if (!window.confirm(`Delete mds/${openPath}${extra}? This deletes the file on disk.`))
      return;
    try {
      await api.remove(openPath);
      sessionStorage.removeItem(draftKey(openPath));
      setOpenPath(null);
      setContent("");
      setDiskContent("");
      setSearchParams({}, { replace: true });
      await refreshList();
    } catch (err) {
      setError(err.message);
    }
  }

  function revert() {
    if (!dirty) return;
    if (!window.confirm("Discard unsaved changes and reload from disk?")) return;
    setContent(diskContent);
    sessionStorage.removeItem(draftKey(openPath));
  }

  // One-way proportional scroll sync, editor → preview, in split mode.
  const syncScroll = () => {
    if (mode !== "split") return;
    const e = edScrollRef.current;
    const p = pvScrollRef.current;
    if (!e || !p) return;
    const ratio = e.scrollTop / Math.max(1, e.scrollHeight - e.clientHeight);
    p.scrollTop = ratio * (p.scrollHeight - p.clientHeight);
  };

  const siteUrl = openPath ? siteUrlFor(openPath) : null;
  const words = useMemo(
    () => (content ? content.trim().split(/\s+/).filter(Boolean).length : 0),
    [content]
  );

  // Blog posts get their date under the title, like PostPage does.
  const titleMeta = useMemo(() => {
    const m = openPath && /^blog\/(\d+)\.md$/.exec(openPath);
    const date = m && blogDateById[m[1]];
    return date ? (
      <time
        style={{
          color: "#a8a29e",
          display: "block",
          fontSize: "0.875rem",
          marginBottom: "0.5rem",
          marginTop: "-0.9rem",
        }}
      >
        {date}
      </time>
    ) : null;
  }, [openPath]);

  const border = `1px solid var(--border-color)`;
  const dim = { color: "var(--text-color)", opacity: 0.55 };

  const previewPane = (fluid) => (
    <div
      ref={pvScrollRef}
      style={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: "auto" }}
    >
      <div style={{ paddingTop: 8, paddingBottom: "30vh" }}>
        <ContentViewer content={preview} fluid={fluid} titleMeta={titleMeta} />
      </div>
    </div>
  );

  return (
    <div
      ref={wrapRef}
      className="page-fade-in"
      style={{
        height,
        display: "flex",
        margin: "8px 10px 0",
        border,
        borderRadius: 10,
        overflow: "hidden",
        background: "var(--bg-color)",
        position: "relative",
        zIndex: 1,
      }}
    >
      <style>{editorCss(isDark)}</style>

      {/* ------------------------------------------------ sidebar */}
      <aside
        style={{
          width: 250,
          flex: "0 0 auto",
          borderRight: border,
          overflowY: "auto",
          padding: "10px 0 30px",
          background: isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.02)",
        }}
      >
        <div
          style={{
            padding: "2px 14px 8px",
            fontWeight: 700,
            fontSize: "0.8rem",
            letterSpacing: "0.09em",
            textTransform: "uppercase",
          }}
        >
          mds workbench
        </div>
        {groups.map(([dir, list]) => {
          const open = expandedGroups.has(dir);
          const holdsOpenFile = openPath && dirOf(openPath) === dir;
          return (
          <div key={dir} style={{ marginBottom: open ? 10 : 2 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "0 8px 0 6px",
              }}
            >
              <button
                type="button"
                className="mds-toolbtn"
                onClick={() => toggleGroup(dir)}
                title={open ? `fold ${dir}` : `unfold ${dir}`}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "3px 8px",
                  fontSize: "0.72rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  textAlign: "left",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-block",
                    fontSize: "0.58rem",
                    transition: "transform 0.15s ease",
                    transform: open ? "rotate(90deg)" : "none",
                  }}
                >
                  ▶
                </span>
                <span style={{ flex: 1 }}>
                  {dir} <span style={{ opacity: 0.6 }}>({list.length})</span>
                  {/* dot marks the folded-away group holding the open file */}
                  {!open && holdsOpenFile ? " •" : null}
                </span>
              </button>
              <button
                type="button"
                className="mds-toolbtn"
                title={dir === "blog" ? "new blog post" : `new file in ${dir}`}
                onClick={() => createIn(dir)}
                style={{ padding: "0 6px", fontSize: "0.95rem" }}
              >
                +
              </button>
            </div>
            {open && list.map((f) => {
              const active = f === openPath;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => openFile(f)}
                  className="mds-filerow"
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "3.5px 14px",
                    fontSize: "0.82rem",
                    lineHeight: 1.35,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    color: "var(--text-color)",
                    background: active
                      ? isDark
                        ? "rgba(255,255,255,0.09)"
                        : "rgba(0,0,0,0.075)"
                      : "transparent",
                    fontWeight: active ? 650 : 400,
                  }}
                  title={f}
                >
                  {fileLabel(f)}
                  {active && dirty ? (
                    <span style={{ opacity: 0.8 }}> •</span>
                  ) : null}
                </button>
              );
            })}
          </div>
          );
        })}
      </aside>

      {/* ------------------------------------------------ main */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 12px",
            borderBottom: border,
            flex: "0 0 auto",
            fontSize: "0.84rem",
          }}
        >
          <span
            style={{
              fontFamily: MONO,
              fontSize: "0.78rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {openPath ? `mds/${openPath}` : "no file open"}
            {dirty && (
              <span style={{ color: isDark ? "#d3b56a" : "#a3701c" }}>
                {" "}
                ● unsaved
              </span>
            )}
          </span>

          <span style={{ flex: 1 }} />

          <ToolButton
            title="open the visual diagram workbench"
            onClick={() => window.open("/diagram", "_blank")}
          >
            diagram ↗
          </ToolButton>

          {/* mode segmented control */}
          <span
            style={{
              display: "inline-flex",
              border,
              borderRadius: 7,
              overflow: "hidden",
            }}
          >
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className="mds-toolbtn"
                style={{
                  padding: "2.5px 11px",
                  borderRadius: 0,
                  fontWeight: mode === m ? 700 : 400,
                  background:
                    mode === m
                      ? isDark
                        ? "rgba(255,255,255,0.12)"
                        : "rgba(0,0,0,0.09)"
                      : "transparent",
                }}
              >
                {m}
              </button>
            ))}
          </span>

          <ToolButton
            title={vimEnabled ? "vim keys on — click to disable" : "vim keys off — click to enable"}
            onClick={() => setVimEnabled((x) => !x)}
          >
            <span style={{ fontWeight: vimEnabled ? 750 : 400, opacity: vimEnabled ? 1 : 0.55 }}>
              vim
            </span>
          </ToolButton>
          {siteUrl && (
            <ToolButton
              title="open the real page in a new tab"
              onClick={() => window.open(siteUrl, "_blank")}
            >
              view ↗
            </ToolButton>
          )}
          <ToolButton title="discard unsaved changes" onClick={revert} disabled={!dirty}>
            revert
          </ToolButton>
          <ToolButton title="delete this file" onClick={removeOpen} disabled={!openPath} danger>
            delete
          </ToolButton>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="mds-savebtn"
          >
            {saving ? "saving…" : "save ⌘S"}
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "5px 12px",
              fontSize: "0.78rem",
              color: "#c05252",
              borderBottom: border,
              flex: "0 0 auto",
            }}
          >
            {error}
            <button
              type="button"
              className="mds-toolbtn"
              style={{ marginLeft: 8 }}
              onClick={() => setError(null)}
            >
              dismiss
            </button>
          </div>
        )}

        {/* work area */}
        {openPath == null ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              ...dim,
              fontSize: "0.9rem",
            }}
          >
            pick a file on the left, or hit + to start a new one
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
            {mode !== "read" && (
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  minHeight: 0,
                  display: "flex",
                  borderRight: mode === "split" ? border : "none",
                }}
              >
                <MarkdownEditor
                  key={openPath}
                  value={content}
                  onChange={setContent}
                  scrollRef={edScrollRef}
                  onScroll={syncScroll}
                  vimEnabled={vimEnabled}
                  dark={isDark}
                  onSave={save}
                />
              </div>
            )}
            {mode !== "edit" && previewPane(mode === "split")}
          </div>
        )}

        {/* status bar */}
        <div
          style={{
            display: "flex",
            gap: 14,
            padding: "4px 12px",
            borderTop: border,
            flex: "0 0 auto",
            fontSize: "0.72rem",
            ...dim,
          }}
        >
          <span>{content.split("\n").length} lines</span>
          <span>{words} words</span>
          <span>{content.length} chars</span>
          <span style={{ flex: 1 }} />
          <span>
            local only — this page and its file API exist just on the dev
            server
          </span>
        </div>
      </main>
    </div>
  );
}

// Workbench chrome styles (the editor itself is themed in cmTheme/cmHighlight).
function editorCss(isDark) {
  return `
.mds-toolbtn {
  background: transparent;
  border: none;
  color: var(--text-color);
  opacity: 0.75;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 2.5px 7px;
  border-radius: 6px;
}
.mds-toolbtn:hover:not(:disabled) { opacity: 1; background: ${
    isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"
  }; }
.mds-toolbtn:disabled { opacity: 0.3; cursor: default; }
.mds-filerow { border: none; cursor: pointer; }
.mds-filerow:hover { background: ${
    isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.045)"
  } !important; }
.mds-savebtn {
  border: 1px solid var(--border-color);
  background: ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)"};
  color: var(--text-color);
  font-size: 0.8rem;
  font-weight: 650;
  padding: 2.5px 12px;
  border-radius: 7px;
  cursor: pointer;
}
.mds-savebtn:disabled { opacity: 0.35; cursor: default; }
`;
}
