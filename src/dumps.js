// Single source of truth for the "dump" section.
// Drop a new mds/dump/*.md file and it shows up automatically — an orb on
// /dump and its own page at /dump/:id. Title comes from the file's first
// "# heading" (fallback: the filename).
import GithubSlugger from "github-slugger";

const files = import.meta.glob("../mds/dump/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

export const dumpContent = {}; // id -> raw markdown

export const topics = Object.entries(files)
  .map(([path, raw]) => {
    const id = path.split("/").pop().replace(/\.md$/, "");
    dumpContent[id] = raw;
    const heading = raw.match(/^#\s+(.+)$/m);
    return { id, title: heading ? heading[1].trim() : id.replace(/-/g, " ") };
  })
  // ordered by topic
  .sort((a, b) => a.title.localeCompare(b.title));

// Reference index: external links cited within a section, hoisted to its heading
// as logo orbs (arXiv / PDF / web). Scans every dump file for [[<url>|Title]]
// links — those whose target is an http(s) URL — and records them per "note#slug",
// the slug of the heading the reference sits under, built with the same
// github-slugger rehype-slug uses so a heading can look up its own refs by id.
const WIKI = /\[\[([^\]]+?)\]\]/g;
const HEADING = /^(#{1,6})\s+(.+?)\s*$/;

export const references = {}; // "note#slug" -> [{ url, title }]

for (const [id, raw] of Object.entries(dumpContent)) {
  const slugger = new GithubSlugger(); // mirrors rehype-slug's per-page dedup
  let anchor = null;
  for (const line of raw.split("\n")) {
    const h = HEADING.exec(line);
    if (h) anchor = slugger.slug(h[2]);
    WIKI.lastIndex = 0;
    let m;
    while ((m = WIKI.exec(line))) {
      const inner = m[1];
      const pipe = inner.indexOf("|");
      const target = (pipe === -1 ? inner : inner.slice(0, pipe)).trim();
      if (!/^https?:\/\//i.test(target) || !anchor) continue;
      const title = pipe === -1 ? "" : inner.slice(pipe + 1).trim();
      const key = `${id}#${anchor}`;
      const list = references[key] || (references[key] = []);
      if (!list.some((r) => r.url === target)) list.push({ url: target, title });
    }
  }
}
