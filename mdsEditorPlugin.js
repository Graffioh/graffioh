// Dev-only Vite plugin backing the /dev markdown workbench (src/pages/DevPage.jsx).
// Exposes a tiny filesystem API over mds/ on the DEV SERVER ONLY — `apply: "serve"`
// plus configureServer means none of this exists in `vite build` output or the
// preview server, so the deployed site has neither the page nor the endpoints.
//
//   GET    /__mds/list                 -> { files: ["aboutme.md", "blog/1.md", ...] }
//   GET    /__mds/file?path=<rel>      -> { content }
//   PUT    /__mds/file?path=<rel>      body {content} -> save (add ?ifAbsent=1 to refuse overwrite)
//   DELETE /__mds/file?path=<rel>      -> delete (blog posts also drop their blogPosts.js entry)
//   POST   /__mds/blog-post            body {title}   -> next-numbered mds/blog/<id>.md
//                                         + entry prepended to src/data/blogPosts.js
//   GET    /__mds/diagrams             -> { diagrams: ["my-diagram", ...] }
//   GET    /__mds/diagram?name=<slug>  -> { name, scene, revision }
//   PUT    /__mds/diagram?name=<slug>  body {scene, baseRevision} -> replace JSON
//                                         (add ?ifAbsent=1 to create atomically)
import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const MDS_DIR = path.join(ROOT, "mds");
const DIAGRAMS_DIR = path.join(MDS_DIR, "diagrams");
const BLOG_POSTS_JS = path.join(ROOT, "src", "data", "blogPosts.js");
const DIAGRAM_SLUG = /^[a-z0-9][a-z0-9-]*$/;

// Resolve a client-supplied relative path, refusing anything that escapes mds/
// or isn't a markdown file.
function safeMdPath(rel) {
  if (!rel || rel.includes("\0")) return null;
  const abs = path.resolve(MDS_DIR, rel.replaceAll("\\", "/"));
  if (!abs.startsWith(MDS_DIR + path.sep)) return null;
  if (!abs.endsWith(".md")) return null;
  return abs;
}

function walk(dir, prefix = "") {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walk(path.join(dir, entry.name), rel));
    else if (entry.name.endsWith(".md")) out.push(rel);
  }
  return out.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function safeDiagramPath(name) {
  if (!DIAGRAM_SLUG.test(name)) return null;
  return path.join(DIAGRAMS_DIR, `${name}.json`);
}

function listDiagrams() {
  if (!fs.existsSync(DIAGRAMS_DIR)) return [];
  return fs
    .readdirSync(DIAGRAMS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => /^([a-z0-9][a-z0-9-]*)\.json$/.exec(entry.name))
    .filter(Boolean)
    .map((match) => match[1])
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function isScene(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sceneProblem(value) {
  if (!isScene(value)) return "scene must be a JSON object";
  if (value.version !== undefined && Number(value.version) !== 1)
    return "scene version must be 1";
  if (!Array.isArray(value.elements)) return "scene must contain an elements array";
  return "";
}

function contentRevision(content) {
  return createHash("sha256").update(content).digest("hex").slice(0, 20);
}

function readDiagram(abs, name) {
  const content = fs.readFileSync(abs, "utf8");
  let scene;
  try {
    scene = JSON.parse(content);
  } catch (error) {
    throw new Error(`invalid JSON in diagram ${name}: ${error.message}`);
  }
  const problem = sceneProblem(scene);
  if (problem) throw new Error(`diagram ${name}: ${problem}`);
  return { scene, revision: contentRevision(content) };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(obj));
}

// dd-mm-yyyy, the format blogPosts.js already uses.
function today() {
  const now = new Date();
  return [
    String(now.getDate()).padStart(2, "0"),
    String(now.getMonth() + 1).padStart(2, "0"),
    now.getFullYear(),
  ].join("-");
}

function createBlogPost(title) {
  const blogDir = path.join(MDS_DIR, "blog");
  const ids = fs
    .readdirSync(blogDir)
    .map((f) => /^(\d+)\.md$/.exec(f))
    .filter(Boolean)
    .map((m) => Number(m[1]));
  const id = String(ids.length ? Math.max(...ids) + 1 : 1);
  fs.writeFileSync(path.join(blogDir, `${id}.md`), `# ${title}\n\n`);

  // Prepend the metadata entry — the site lists posts in array order.
  const src = fs.readFileSync(BLOG_POSTS_JS, "utf8");
  const anchor = "const blogPosts = [";
  const at = src.indexOf(anchor);
  if (at === -1) throw new Error("blogPosts.js: `const blogPosts = [` not found");
  const entry =
    `\n  {\n    id: ${JSON.stringify(id)},\n` +
    `    title: ${JSON.stringify(title)},\n` +
    `    date: ${JSON.stringify(today())},\n  },`;
  fs.writeFileSync(
    BLOG_POSTS_JS,
    src.slice(0, at + anchor.length) + entry + src.slice(at + anchor.length)
  );
  return { id, path: `blog/${id}.md` };
}

// Deleting mds/blog/<id>.md also drops its entry from blogPosts.js (entries are
// flat object literals, so the brace-free regex can't over-match).
function dropBlogEntry(id) {
  const src = fs.readFileSync(BLOG_POSTS_JS, "utf8");
  const re = new RegExp(`\\n?\\s*\\{[^{}]*?\\bid:\\s*"${id}"[^{}]*?\\},`);
  if (re.test(src)) fs.writeFileSync(BLOG_POSTS_JS, src.replace(re, ""));
}

export default function mdsEditorApi() {
  return {
    name: "mds-editor-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__mds", async (req, res) => {
        try {
          const url = new URL(req.url, "http://localhost");
          const route = url.pathname;

          if (route === "/list" && req.method === "GET") {
            return send(res, 200, { files: walk(MDS_DIR) });
          }

          if (route === "/diagrams") {
            if (req.method !== "GET") {
              res.setHeader("Allow", "GET");
              return send(res, 405, { error: "method not allowed; use GET" });
            }
            return send(res, 200, { diagrams: listDiagrams() });
          }

          if (route === "/diagram") {
            if (req.method !== "GET" && req.method !== "PUT") {
              res.setHeader("Allow", "GET, PUT");
              return send(res, 405, {
                error: "method not allowed; use GET or PUT",
              });
            }

            const name = url.searchParams.get("name") || "";
            const abs = safeDiagramPath(name);
            if (!abs) {
              return send(res, 400, {
                error:
                  "invalid diagram name; use a lowercase slug matching [a-z0-9][a-z0-9-]*",
              });
            }

            if (req.method === "GET") {
              if (!fs.existsSync(abs)) {
                return send(res, 404, {
                  code: "diagram_not_found",
                  error: `diagram not found: ${name}`,
                });
              }
              if (!fs.lstatSync(abs).isFile()) {
                return send(res, 409, {
                  error: `diagram path is not a regular file: ${name}`,
                });
              }
              try {
                return send(res, 200, { name, ...readDiagram(abs, name) });
              } catch (error) {
                return send(res, 422, { error: error.message });
              }
            }

            if (url.searchParams.get("ifAbsent") && fs.existsSync(abs)) {
              return send(res, 409, {
                error: `diagram already exists: ${name}`,
              });
            }

            let payload;
            try {
              payload = JSON.parse((await readBody(req)) || "{}");
            } catch (error) {
              return send(res, 400, {
                error: `request body must be valid JSON: ${error.message}`,
              });
            }
            const problem = sceneProblem(payload?.scene);
            if (problem) {
              return send(res, 400, {
                error: problem,
              });
            }
            if (fs.existsSync(abs) && !fs.lstatSync(abs).isFile()) {
              return send(res, 409, {
                error: `diagram path is not a regular file: ${name}`,
              });
            }
            fs.mkdirSync(DIAGRAMS_DIR, { recursive: true });
            const content = `${JSON.stringify(payload.scene, null, 2)}\n`;
            const createOnly = Boolean(url.searchParams.get("ifAbsent"));

            if (!createOnly) {
              if (!fs.existsSync(abs)) {
                return send(res, 404, {
                  code: "diagram_not_found",
                  error: `diagram not found: ${name}`,
                });
              }
              const currentContent = fs.readFileSync(abs, "utf8");
              const currentRevision = contentRevision(currentContent);
              if (payload.baseRevision !== currentRevision) {
                return send(res, 409, {
                  code: "diagram_revision_conflict",
                  error: `${name}.json changed on disk; reload it before saving`,
                });
              }
              if (currentContent === content) {
                return send(res, 200, {
                  ok: true,
                  name,
                  revision: currentRevision,
                  unchanged: true,
                });
              }
            }

            try {
              fs.writeFileSync(
                abs,
                content,
                createOnly
                  ? { encoding: "utf8", flag: "wx" }
                  : "utf8"
              );
            } catch (error) {
              if (error?.code === "EEXIST") {
                return send(res, 409, {
                  error: `diagram already exists: ${name}`,
                });
              }
              throw error;
            }
            return send(res, 200, {
              ok: true,
              name,
              revision: contentRevision(content),
            });
          }

          if (route === "/blog-post" && req.method === "POST") {
            const { title } = JSON.parse((await readBody(req)) || "{}");
            if (!title || !String(title).trim())
              return send(res, 400, { error: "title required" });
            return send(res, 200, createBlogPost(String(title).trim()));
          }

          if (route === "/file") {
            const rel = url.searchParams.get("path") || "";
            const abs = safeMdPath(rel);
            if (!abs) return send(res, 400, { error: `bad path: ${rel}` });

            if (req.method === "GET") {
              if (!fs.existsSync(abs))
                return send(res, 404, { error: `not found: ${rel}` });
              return send(res, 200, { content: fs.readFileSync(abs, "utf8") });
            }

            if (req.method === "PUT") {
              if (url.searchParams.get("ifAbsent") && fs.existsSync(abs))
                return send(res, 409, { error: `already exists: ${rel}` });
              const { content } = JSON.parse((await readBody(req)) || "{}");
              if (typeof content !== "string")
                return send(res, 400, { error: "content must be a string" });
              fs.mkdirSync(path.dirname(abs), { recursive: true });
              fs.writeFileSync(abs, content);
              return send(res, 200, { ok: true });
            }

            if (req.method === "DELETE") {
              if (!fs.existsSync(abs))
                return send(res, 404, { error: `not found: ${rel}` });
              fs.unlinkSync(abs);
              const blog = /^blog\/(\d+)\.md$/.exec(rel.replaceAll("\\", "/"));
              if (blog) dropBlogEntry(blog[1]);
              return send(res, 200, { ok: true });
            }
          }

          return send(res, 404, { error: `no route: ${req.method} ${route}` });
        } catch (err) {
          return send(res, 500, { error: String((err && err.message) || err) });
        }
      });
    },
  };
}
