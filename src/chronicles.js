// Single source of truth for the "chronicles" section.
// Drop a new mds/chronicles/*.md file and it shows up automatically — an entry
// in the grid on /chronicles and its own page at /chronicles/:id. Title comes
// from the file's first "# heading" (fallback: the filename, dashes -> spaces).
// Order in the grid follows the filename: prefix files with a number to control
// it (e.g. 1-..., 2-...). Numeric-aware, so "2" comes before "10".
const files = import.meta.glob("../mds/chronicles/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

export const chronicleContent = {}; // id -> raw markdown

export const chronicles = Object.entries(files)
  .map(([path, raw]) => {
    const id = path.split("/").pop().replace(/\.md$/, "");
    chronicleContent[id] = raw;
    const heading = raw.match(/^#\s+(.+)$/m);
    return { id, title: heading ? heading[1].trim() : id.replace(/-/g, " ") };
  })
  .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
