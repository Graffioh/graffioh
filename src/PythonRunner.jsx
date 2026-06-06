import { useEffect, useMemo, useRef, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  vscDarkPlus,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";

// ── Pyodide worker manager ───────────────────────────────────────────────────
// All Pyodide work (the ~5 MB load, WASM compile, and every execution) happens
// in a Web Worker — off the main thread — so it never freezes the page. We keep
// ONE shared worker for the whole site; the recorder/harness lives in it (see
// pyodide.worker.js). This module just brokers postMessage requests.
let worker = null;
let workerReady = false;
let reqId = 0;
const pending = new Map(); // id → { resolve, reject }
const readyListeners = new Set(); // components wanting to know when load finishes

function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL("./pyodide.worker.js", import.meta.url), {
    type: "module",
  });
  worker.onmessage = (e) => {
    const m = e.data;
    if (m.type === "ready") {
      workerReady = true;
      readyListeners.forEach((fn) => fn());
      return;
    }
    const p = pending.get(m.id);
    if (!p) return;
    pending.delete(m.id);
    if (m.type === "result") p.resolve(m.json);
    else p.reject(new Error(m.message || "Python worker error"));
  };
  worker.onerror = () => {
    pending.forEach((p) => p.reject(new Error("Python worker crashed.")));
    pending.clear();
  };
  return worker;
}

// Terminate the worker (kills a runaway run that the step-cap can't catch, e.g.
// time.sleep) and reject anything in flight. The next run lazily respawns it.
function killWorker() {
  if (!worker) return;
  worker.terminate();
  worker = null;
  workerReady = false;
  pending.forEach((p) => p.reject(new Error("__stopped__")));
  pending.clear();
}

function onReady(fn) {
  readyListeners.add(fn);
  return () => readyListeners.delete(fn);
}

// Pre-fetching the ~5 MB runtime is great on WiFi but rude on a metered/slow
// connection the user never opted into. Only warm up when the link looks cheap.
function connectionIsCheap() {
  const c =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;
  if (!c) return true; // no Network Information API → assume it's fine
  if (c.saveData) return false; // user asked the browser to conserve data
  return !/(^|-)(2g|slow-2g|3g)$/.test(c.effectiveType || ""); // skip on slow nets
}

// Warm up the worker so the first Run is instant. Safe to call repeatedly and
// now genuinely free of main-thread cost — the load runs in the worker, so this
// can fire the moment a block scrolls into view without freezing the page.
function warmUpPyodide() {
  if (worker || !connectionIsCheap()) return;
  getWorker().postMessage({ type: "init" });
}

function execute(code) {
  const w = getWorker();
  const id = ++reqId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ type: "run", id, code });
  }).then((json) => {
    const parsed = JSON.parse(json);
    // Append a synthetic terminal frame so stepping ends on the final state
    // (all vars + full output / traceback) with nothing highlighted.
    parsed.frames.push({
      line: null,
      vars: parsed.finalVars,
      output: parsed.output,
      done: true,
    });
    return parsed;
  });
}

// ── Styling (mirrors the code-block slab in ContentViewer/Mermaid) ───────────
function stripBackgrounds(style) {
  const out = {};
  for (const sel in style) {
    const rule = style[sel];
    if (rule && typeof rule === "object") {
      const { background, backgroundColor, backgroundImage, ...rest } = rule;
      out[sel] = rest;
    } else out[sel] = rule;
  }
  return out;
}
const ONE_LIGHT_NO_BG = stripBackgrounds(oneLight);
const VSC_DARK_PLUS_NO_BG = stripBackgrounds(vscDarkPlus);

// In dark mode the slab goes light (white-matter + olive glow); in light mode it
// goes dark (event-horizon + purple glow) — the same photographic-negative motif
// as the rest of the site.
function slab(isDark) {
  return isDark
    ? {
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

function Btn({ ink, onClick, disabled, children, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        font: "inherit",
        fontSize: "0.8rem",
        lineHeight: 1,
        padding: "0.4em 0.7em",
        borderRadius: "0.5em",
        color: ink,
        border: `1px solid ${ink}33`,
        background: `${ink}12`,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
// Renders a ```python fenced block as a live runner: highlighted source + a Run
// button, and (after a run) a line-by-line stepper with a variables panel.
export default function PythonRunner({ code, theme }) {
  const isDark = theme === "dark";
  const s = useMemo(() => slab(isDark), [isDark]);

  const [status, setStatus] = useState("idle"); // idle | loading | running
  const [result, setResult] = useState(null); // { frames, output, error, truncated }
  const [stepping, setStepping] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [ready, setReady] = useState(workerReady); // Pyodide finished loading?
  const rootRef = useRef(null);

  // Reflect worker readiness across every mounted block, so once Python is
  // warm/loaded all blocks show "running" (not "loading") on their next Run.
  useEffect(() => onReady(() => setReady(true)), []);

  // Warm the worker once this block scrolls into view (on a cheap connection),
  // so the eventual Run click is instant. The load runs in the worker now, so
  // this no longer freezes the page even when the code is on-screen at reload.
  // The IntersectionObserver disconnects after the first sighting.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || worker || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          warmUpPyodide();
          io.disconnect();
        }
      },
      { rootMargin: "200px" } // start a touch before it's fully on screen
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const frames = result?.frames ?? [];
  const frame = stepping ? frames[stepIndex] : null;
  const activeLine = frame && !frame.done ? frame.line : null;

  async function run() {
    setStepping(false);
    setResult(null);
    setStatus(ready ? "running" : "loading");
    try {
      const parsed = await execute(code);
      setResult(parsed);
    } catch (e) {
      // killWorker() rejects in-flight runs with this sentinel — show a calm
      // "stopped" note rather than a scary error.
      if (e?.message === "__stopped__") {
        setResult({ frames: [], output: "■ stopped", error: false });
      } else {
        setResult({ frames: [], output: String(e?.message || e), error: true });
      }
    } finally {
      setStatus("idle");
    }
  }

  function stop() {
    killWorker(); // rejects the pending run → handled in run()'s catch
  }

  function startStepping() {
    setStepping(true);
    setStepIndex(0);
  }

  const busy = status !== "idle";
  const canStep = frames.length > 1; // >1 because of the synthetic done frame
  const output = stepping ? frame?.output ?? "" : result?.output ?? "";
  const vars = stepping ? frame?.vars ?? {} : result?.finalVars ?? {};
  const varEntries = Object.entries(vars);

  return (
    <div
      ref={rootRef}
      className="my-4"
      style={{
        ...{
          border: s.border,
          boxShadow: s.boxShadow,
          background: s.background,
        },
        color: s.ink,
        borderRadius: "0.7em",
        overflow: "hidden",
      }}
    >
      {/* code */}
      <div style={{ overflowX: "auto" }}>
        <SyntaxHighlighter
          PreTag="div"
          language="python"
          style={isDark ? ONE_LIGHT_NO_BG : VSC_DARK_PLUS_NO_BG}
          className="text-sm"
          showLineNumbers
          wrapLines
          lineProps={(n) => ({
            style: {
              display: "block",
              margin: "0 -1.1em",
              padding: "0 1.1em",
              background: n === activeLine ? s.active : "transparent",
              boxShadow:
                n === activeLine ? `inset 3px 0 0 0 ${s.accent}` : "none",
            },
          })}
          customStyle={{
            margin: 0,
            background: "transparent",
            padding: "1em 1.1em 0.6em",
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>

      {/* toolbar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0.45em",
          padding: "0.55em 1.1em",
          borderTop: `1px solid ${s.ink}1a`,
        }}
      >
        <Btn ink={s.ink} onClick={run} disabled={busy}>
          {status === "loading"
            ? "Loading Python…"
            : status === "running"
            ? "Running…"
            : "▶ Run"}
        </Btn>

        {busy && (
          <Btn ink={s.ink} onClick={stop} title="Stop & kill the interpreter">
            ■ Stop
          </Btn>
        )}

        {result && !result.error && canStep && !stepping && (
          <Btn ink={s.ink} onClick={startStepping}>
            Step through
          </Btn>
        )}

        {stepping && (
          <>
            <Btn
              ink={s.ink}
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              disabled={stepIndex === 0}
              title="Previous line"
            >
              ◀ Prev
            </Btn>
            <Btn
              ink={s.ink}
              onClick={() =>
                setStepIndex((i) => Math.min(frames.length - 1, i + 1))
              }
              disabled={stepIndex >= frames.length - 1}
              title="Next line"
            >
              Next ▶
            </Btn>
            <Btn ink={s.ink} onClick={() => setStepIndex(0)} title="Restart">
              ↺ Reset
            </Btn>
            <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>
              {frame?.done
                ? "done"
                : `line ${frame?.line} · step ${stepIndex + 1}/${
                    frames.length - 1
                  }`}
            </span>
          </>
        )}

        {result?.truncated && (
          <span style={{ fontSize: "0.72rem", opacity: 0.6 }}>
            trace truncated at 5000 steps
          </span>
        )}
      </div>

      {/* variables (stepping only) */}
      {stepping && varEntries.length > 0 && (
        <div
          style={{
            padding: "0.55em 1.1em",
            borderTop: `1px solid ${s.ink}1a`,
            background: s.panel,
            fontSize: "0.8rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.35em 1.1em",
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          }}
        >
          {varEntries.map(([k, v]) => (
            <span key={k}>
              <span style={{ opacity: 0.65 }}>{k}</span>
              <span style={{ opacity: 0.4 }}> = </span>
              <span>{v}</span>
            </span>
          ))}
        </div>
      )}

      {/* output */}
      {result && (output !== "" || !stepping) && (
        <pre
          style={{
            margin: 0,
            padding: "0.7em 1.1em",
            borderTop: `1px solid ${s.ink}1a`,
            background: s.panel,
            color: result.error ? "#e06c75" : s.ink,
            fontSize: "0.82rem",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            maxHeight: "20rem",
            overflowY: "auto",
          }}
        >
          {output === "" ? "(no output)" : output}
        </pre>
      )}
    </div>
  );
}
