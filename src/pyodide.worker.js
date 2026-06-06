// src/pyodide.worker.js
// Pyodide (real CPython in WASM) runs entirely in this Web Worker, off the main
// thread — so loading the ~5 MB runtime, compiling the WASM, and executing user
// code never freeze the page (the canvas vortex keeps animating, scroll stays
// smooth). The main thread (PythonRunner.jsx) talks to this worker over
// postMessage:
//   in : {type:'init'}                  → start loading Pyodide
//   in : {type:'run', id, code}         → execute a block, reply with its id
//   out: {type:'ready'}                 → Pyodide finished loading
//   out: {type:'result', id, json}      → recorder JSON for that run
//   out: {type:'error',  id, message}   → run failed to even start
const PYODIDE_VERSION = "0.29.4";
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

// ── The recorder ───────────────────────────────────────────────────────────
// Runs the user's code ONCE under sys.settrace, recording a frame on every line
// event: the line about to execute, a snapshot of the visible variables at that
// moment, and stdout-so-far. The main thread then scrubs through this recorded
// timeline — so stepping (forward AND back) costs zero further Python calls.
// stdout/err are redirected on the Python side, so the whole thing is
// self-contained and returns a single JSON string. MAX caps runaway loops
// (raising aborts exec so an infinite loop can't grow memory without bound;
// anything the line-cap can't catch — e.g. time.sleep — is killable from the
// main thread via worker.terminate()).
const HARNESS = `
import sys, io, json, traceback, contextlib

def __run_with_trace(src):
    MAX = 5000
    frames = []
    truncated = [False]
    out = io.StringIO()
    user_globals = {"__name__": "__main__"}

    class __StepLimit(Exception):
        pass

    def cap(value):
        try:
            r = repr(value)
        except Exception:
            r = "<unrepr-able>"
        return r if len(r) <= 200 else r[:200] + "\\u2026"

    def snapshot(fr):
        return {k: cap(v) for k, v in fr.f_locals.items()
                if not k.startswith("__")}

    def tracer(fr, event, arg):
        if fr.f_code.co_filename != "<snippet>":
            return tracer
        if event == "line":
            if len(frames) >= MAX:
                truncated[0] = True
                raise __StepLimit
            frames.append({
                "line": fr.f_lineno,
                "vars": snapshot(fr),
                "output": out.getvalue(),
            })
        return tracer

    err = None
    try:
        code_obj = compile(src, "<snippet>", "exec")
        sys.settrace(tracer)
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
            exec(code_obj, user_globals, user_globals)
    except __StepLimit:
        pass
    except SyntaxError as e:
        # compile() failed: show the caret-pointed message, no harness frames.
        err = "".join(traceback.format_exception_only(type(e), e))
    except BaseException as e:
        # Drop the harness's own frames so the traceback starts at user code.
        tb = e.__traceback__
        while tb is not None and tb.tb_frame.f_code.co_filename != "<snippet>":
            tb = tb.tb_next
        err = "".join(traceback.format_exception(type(e), e, tb))
    finally:
        sys.settrace(None)

    final_vars = {k: cap(v) for k, v in user_globals.items()
                  if not k.startswith("__")}

    output = out.getvalue()
    if err:
        if output and not output.endswith("\\n"):
            output += "\\n"
        output += err

    return json.dumps({
        "frames": frames,
        "finalVars": final_vars,
        "output": output,
        "error": err,
        "truncated": truncated[0],
    })

__run_with_trace(USER_SOURCE)
`;

// Loaded once, cached as a promise so every run reuses the same interpreter.
let pyodidePromise = null;
function getPyodide() {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      // @vite-ignore keeps Vite from trying to bundle the CDN module — it's
      // fetched at runtime in the worker.
      const mod = await import(/* @vite-ignore */ `${PYODIDE_BASE}pyodide.mjs`);
      const py = await mod.loadPyodide({ indexURL: PYODIDE_BASE });
      self.postMessage({ type: "ready" });
      return py;
    })();
  }
  return pyodidePromise;
}

// Pyodide is single-threaded: serialize runs so two blocks can't corrupt the
// shared interpreter. Each run waits for the previous to finish.
let chain = Promise.resolve();

self.onmessage = (e) => {
  const msg = e.data;
  if (msg.type === "init") {
    getPyodide();
    return;
  }
  if (msg.type === "run") {
    const { id, code } = msg;
    chain = chain.then(async () => {
      try {
        const py = await getPyodide();
        // Auto-load any stdlib-adjacent packages Pyodide ships (numpy, etc.).
        try {
          await py.loadPackagesFromImports(code);
        } catch {
          /* unknown / pip-only imports just surface as ImportError at runtime */
        }
        py.globals.set("USER_SOURCE", code);
        const json = await py.runPythonAsync(HARNESS);
        self.postMessage({ type: "result", id, json });
      } catch (err) {
        self.postMessage({
          type: "error",
          id,
          message: String((err && err.message) || err),
        });
      }
    });
  }
};
