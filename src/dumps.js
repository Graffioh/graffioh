// Single source of truth for the "dump" section.
// Drop a new mds/dump/*.md file and it shows up automatically — an orb on
// /dump and its own page at /dump/:id. Title comes from the file's first
// "# heading" (fallback: the filename).
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
