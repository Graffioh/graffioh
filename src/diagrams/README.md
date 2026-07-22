# Blog diagrams

One scene format and one renderer power every authored diagram on the blog.
There is no per-diagram React component, CSS block, or fence registration.

## Authoring

Run the Vite development server and open `/diagram`.

The workbench is development-only: `App.jsx` lazy-imports it behind
`import.meta.env.DEV`, so the page, editor code, and editor CSS are removed from
production builds. `/dev` links to it in a new tab.

Workflow:

1. Select a JSON file under **Diagrams**. The four diagrams used by blog post 19
   live in `mds/diagrams/` and are available immediately.
2. Drag a component from the left rail, or select one and click the canvas.
3. Drag to position; use the bottom-right handle to resize.
4. Double-click a label to edit it in place.
5. Choose Connector for an arrow or Line for a tipless line, then drag from one
   shape to another. Bound endpoints follow their shapes when they move.
6. Set semantic surface, type, route, and document properties in the inspector.
7. Edits save back to the selected JSON file after a short debounce. A blog page
   open in another tab updates through Vite HMR.
8. Click **copy reference** to paste a compact reference into another Markdown
   file. **New** creates another JSON file in the same directory.

The selected file is the source of truth for a published diagram. The editor also
keeps a local recovery draft; JSON import/export remains available for backup or
handoff. File reads and writes are served only by the development Vite plugin.

Useful keys: `V` select, `R` region, `B` node, `P` chip, `O` point, `T` text,
`A` connector, `L` line, `Delete`, `Cmd/Ctrl+D`, `Cmd/Ctrl+Z`, and
`Shift+Cmd/Ctrl+Z`.
Arrow keys nudge the selection; Shift uses the 8 px grid. Hold Alt while placing,
dragging, or resizing to work off-grid. While dragging, each axis snaps
independently to the canvas center and shows a red guide; Alt bypasses both grid
and center snapping. Wheel pans, Cmd/Ctrl+wheel zooms, and Space-drag or
middle-drag pans.

## Markdown contract

The registered fence is always `blog-diagram`. Published Markdown points to a
file by its lowercase slug:

````markdown
```blog-diagram
{
  "file": "request-flow"
}
```
````

That resolves `mds/diagrams/request-flow.json` at build time. Inline v1 scene
JSON is still accepted for compatibility, but file references are the normal
authoring path. A missing or invalid file renders an accessible “Diagram
unavailable” slab instead of breaking the post.

`scene.js` sanitizes every scene before it reaches the DOM. Unknown element
types, arbitrary colors/styles, invalid enums, non-finite geometry, duplicate
ids, and oversized input are normalized or discarded. An explicit version
other than `1` falls back safely instead of being guessed at.

## Scene schema

Top-level fields:

| field | value |
| --- | --- |
| `version` | `1` |
| `name` | editor/export name |
| `title` | accessible SVG title |
| `description` | accessible explanation of the insight |
| `width` | normally `960` |
| `height` | `180`–`1800`; `500`–`720` is typical |
| `frame` | draw the shared inset outer frame |
| `grid` | show the shared dot texture |
| `elements` | paint-order array; later elements sit on top |

Shape types are `frame`, `box`, `pill`, `ellipse`, and `text`. They share:

- geometry: `x`, `y`, `width`, `height`
- content: `text` (newlines are preserved)
- surface: `fill` = `none | soft | mid | strong`
- outline: `stroke` = `solid | dashed | none`
- type: `textRole` = `title | subtitle | label | micro | caption`
- layout: `align` = `left | center | right`, `labelPosition` = `center | top`
- detail: `radius`, `opacity`, and `locked`

Connectors use:

- `start` and `end`: `{ x, y, bind? }`
- `bind`: `{ elementId, anchor, gap }`, where anchor is
  `auto | top | right | bottom | left | center`
- `route`: `straight | elbow`
- `stroke`: `solid | dashed`
- `arrowStart`, `arrowEnd`, optional `text`, `opacity`, and `locked`

The Line tool creates the same connector element with `arrowStart` and
`arrowEnd` disabled, so either tip can still be added later in the inspector.

## Rendering and design system

`BlogDiagram.jsx` is the only published renderer. `DiagramSceneSvg` is shared
with the workbench, so the authoring canvas and final post cannot drift.

`DiagramShell.jsx` supplies the blog's photographic-negative slab and semantic
tokens:

| token | purpose |
| --- | --- |
| `--diagram-ink` | primary strokes and labels |
| `--diagram-muted` | standalone captions and micro annotations |
| `--diagram-hairline` | dot texture and quiet detail |
| `--diagram-surface-soft` | large calm regions |
| `--diagram-surface-mid` | nested groups |
| `--diagram-surface-strong` | nodes, lanes, registers, and emphasis |

The format intentionally has no color field. Hierarchy comes from fill strength,
stroke weight, opacity, dash, spacing, and typography, so every scene follows the
site automatically in both themes.

Text inside a shape always uses the bright `--diagram-ink` token, including the
`micro` role used by compact nodes. Standalone subtitles, micro annotations,
captions, and connector notes use `--diagram-muted` instead.

The SVG defaults to a 960-unit coordinate system, scales responsively,
retains a legible mobile minimum width with horizontal pan, uses non-scaling
strokes, and exposes `title` plus `description` through `role="img"`. The
workbench's restrained transitions are disabled under `prefers-reduced-motion`.
