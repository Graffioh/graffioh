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

// Backlink index: who references a given section. Scans every dump file for
// [[note#heading]] wiki-links and records, per target "note#slug" (or bare
// "note"), each inbound reference as { source, anchor } — `source` being the
// note the reference lives in, `anchor` the slug of the section it sits under so
// an orb can jump back to roughly where it was written. A heading reads its own
// entry to render one tiny orb per inbound reference.
const WIKI = /\[\[([^\]]+?)\]\]/g;
const HEADING = /^(#{1,6})\s+(.+?)\s*$/;

export const backlinks = {}; // "note" | "note#slug" -> [{ source, anchor }]

for (const [id, raw] of Object.entries(dumpContent)) {
  const slugger = new GithubSlugger(); // mirrors rehype-slug's per-page dedup
  let anchor = null;
  for (const line of raw.split("\n")) {
    const h = HEADING.exec(line);
    if (h) anchor = slugger.slug(h[2]);
    WIKI.lastIndex = 0;
    let m;
    while ((m = WIKI.exec(line))) {
      const target = m[1].split("|")[0].trim();
      const [note, heading] = target.split("#");
      const key = heading
        ? `${note.trim()}#${new GithubSlugger().slug(heading.trim())}`
        : note.trim();
      const list = backlinks[key] || (backlinks[key] = []);
      if (!list.some((b) => b.source === id && b.anchor === anchor))
        list.push({ source: id, anchor });
    }
  }
}
