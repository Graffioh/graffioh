import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import DiagramShell from "./DiagramShell";
import { DiagramSceneSvg } from "./BlogDiagram";
import {
  SCENE_VERSION,
  createElement,
  createElementId,
  createScene,
  getElementBounds,
  parseScene,
  resolveConnector,
  sanitizeScene,
  serializeScene,
} from "./scene";
import "./diagram-editor.css";

const STORAGE_KEY = "graffioh:diagram-workbench:v1";
const FILE_SELECTION_KEY = "graffioh:diagram-workbench:file:v1";
const RECOVERY_FILE_KEY = "graffioh:diagram-workbench:recovery-file:v1";
const RECOVERY_BASE_KEY = "graffioh:diagram-workbench:recovery-base:v1";
const DRAG_MIME = "application/x-graffioh-diagram-element";
const GRID = 8;
const CENTER_SNAP_SCREEN_PX = 7;
const DRAG_ACTIVATION_SCREEN_PX = 4;
const BIND_PROXIMITY_SCREEN_PX = 16;
const ANCHOR_SNAP_SCREEN_PX = 12;
const MIDPOINT_CLEAR_SCREEN_PX = 6;
const HISTORY_LIMIT = 80;
const DIAGRAM_SLUG = /^[a-z0-9][a-z0-9-]*$/;
const SHAPE_TYPES = new Set(["frame", "box", "pill", "ellipse", "text"]);
const CONNECTION_TOOLS = new Set(["connector", "line"]);
const NO_CENTER_GUIDES = Object.freeze({ vertical: false, horizontal: false });
const NO_ALIGN_GUIDES = Object.freeze([]);
const NO_ALIGN_TARGETS = Object.freeze({ vertical: [], horizontal: [] });

const PALETTE = [
  { type: "frame", label: "Region", copy: "A quiet containing frame", key: "R" },
  { type: "box", label: "Node", copy: "A strong labeled unit", key: "B" },
  { type: "pill", label: "Chip", copy: "A compact state or lane", key: "P" },
  { type: "ellipse", label: "Point", copy: "A circular step or result", key: "O" },
  { type: "text", label: "Text", copy: "A free label or caption", key: "T" },
  { type: "connector", label: "Connector", copy: "A bound line with an arrow", key: "A" },
  { type: "line", label: "Line", copy: "A bound line without arrow tips", key: "L" },
];

const TOOL_KEYS = Object.fromEntries(
  PALETTE.map((item) => [item.key.toLowerCase(), item.type])
);
TOOL_KEYS.v = "select";
TOOL_KEYS.s = "pick";
const NUDGE_BY_KEY = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

const clone = (value) => JSON.parse(JSON.stringify(value));

// Deep-copy elements with fresh ids; connectors keep bindings to elements
// copied alongside them and drop bindings to anything left behind.
function cloneElementsWithOffset(elements, offset) {
  const idMap = new Map();
  const copies = elements.map((element) => {
    const copy = clone(element);
    copy.id = createElementId(element.type);
    idMap.set(element.id, copy.id);
    return copy;
  });
  copies.forEach((copy) => {
    if (copy.type === "connector") {
      for (const key of ["start", "end"]) {
        copy[key] = {
          ...copy[key],
          x: copy[key].x + offset,
          y: copy[key].y + offset,
        };
        const boundTo = copy[key].bind?.elementId;
        if (!boundTo) continue;
        if (idMap.has(boundTo))
          copy[key].bind = { ...copy[key].bind, elementId: idMap.get(boundTo) };
        else delete copy[key].bind;
      }
      if (copy.mid)
        copy.mid = { x: copy.mid.x + offset, y: copy.mid.y + offset };
    } else {
      copy.x += offset;
      copy.y += offset;
    }
  });
  return copies;
}
const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));
const snap = (value, enabled = true) =>
  enabled ? Math.round(value / GRID) * GRID : value;

// Snap edges (left/center/right, top/center/bottom) of every element that is
// not part of the move, collected once when the gesture starts.
function buildAlignTargets(elements, movingIds) {
  const vertical = [];
  const horizontal = [];
  for (const element of elements) {
    if (
      movingIds.has(element.id) ||
      element.hidden ||
      element.type === "connector"
    )
      continue;
    const bounds = getElementBounds(element);
    vertical.push(
      { value: bounds.left, top: bounds.top, bottom: bounds.bottom },
      { value: bounds.cx, top: bounds.top, bottom: bounds.bottom },
      { value: bounds.right, top: bounds.top, bottom: bounds.bottom }
    );
    horizontal.push(
      { value: bounds.top, left: bounds.left, right: bounds.right },
      { value: bounds.cy, left: bounds.left, right: bounds.right },
      { value: bounds.bottom, left: bounds.left, right: bounds.right }
    );
  }
  return { vertical, horizontal };
}

function bestAlignDelta(targets, base, offsets, threshold) {
  let best = null;
  for (const target of targets) {
    for (const offset of offsets) {
      const delta = target.value - (base + offset);
      if (
        Math.abs(delta) <= threshold &&
        (!best || Math.abs(delta) < Math.abs(best.delta))
      )
        best = { delta, value: target.value };
    }
  }
  return best;
}

function moveGesturePosition(gesture, point, scene, zoom, enabled = true) {
  const raw = {
    x: gesture.origin.x + point.x - gesture.start.x,
    y: gesture.origin.y + point.y - gesture.start.y,
  };
  if (!enabled)
    return {
      x: raw.x,
      y: raw.y,
      guides: NO_CENTER_GUIDES,
      alignGuides: NO_ALIGN_GUIDES,
    };

  const size = gesture.size;
  const threshold = CENTER_SNAP_SCREEN_PX / Math.max(zoom, 0.01);
  const targets = gesture.alignTargets || NO_ALIGN_TARGETS;
  const centeredX = scene.width / 2 - size.width / 2;
  const centeredY = scene.height / 2 - size.height / 2;
  const bestX = bestAlignDelta(
    targets.vertical,
    raw.x,
    [0, size.width / 2, size.width],
    threshold
  );
  const bestY = bestAlignDelta(
    targets.horizontal,
    raw.y,
    [0, size.height / 2, size.height],
    threshold
  );
  const centerDeltaX = centeredX - raw.x;
  const centerDeltaY = centeredY - raw.y;

  let x = snap(raw.x);
  let vertical = false;
  let alignX = null;
  if (
    Math.abs(centerDeltaX) <= threshold &&
    (!bestX || Math.abs(centerDeltaX) <= Math.abs(bestX.delta))
  ) {
    x = centeredX;
    vertical = true;
  } else if (bestX) {
    x = raw.x + bestX.delta;
    alignX = bestX.value;
  }

  let y = snap(raw.y);
  let horizontal = false;
  let alignY = null;
  if (
    Math.abs(centerDeltaY) <= threshold &&
    (!bestY || Math.abs(centerDeltaY) <= Math.abs(bestY.delta))
  ) {
    y = centeredY;
    horizontal = true;
  } else if (bestY) {
    y = raw.y + bestY.delta;
    alignY = bestY.value;
  }

  const alignGuides = [];
  if (alignX !== null) {
    let from = y;
    let to = y + size.height;
    for (const target of targets.vertical) {
      if (Math.abs(target.value - alignX) > 0.5) continue;
      from = Math.min(from, target.top);
      to = Math.max(to, target.bottom);
    }
    alignGuides.push({ axis: "v", value: alignX, from, to });
  }
  if (alignY !== null) {
    let from = x;
    let to = x + size.width;
    for (const target of targets.horizontal) {
      if (Math.abs(target.value - alignY) > 0.5) continue;
      from = Math.min(from, target.left);
      to = Math.max(to, target.right);
    }
    alignGuides.push({ axis: "h", value: alignY, from, to });
  }

  return {
    x,
    y,
    guides:
      vertical || horizontal ? { vertical, horizontal } : NO_CENTER_GUIDES,
    alignGuides: alignGuides.length ? alignGuides : NO_ALIGN_GUIDES,
  };
}

function resizeGestureDimensions(gesture, point, element, enabled = true) {
  const dx = point.x - gesture.start.x;
  const dy = point.y - gesture.start.y;
  return {
    width: Math.max(
      element.type === "text" ? 60 : 32,
      snap(gesture.origin.width + dx, enabled)
    ),
    height: Math.max(24, snap(gesture.origin.height + dy, enabled)),
  };
}

function moveElementsByGesture(elements, gesture, position) {
  const dx = position.x - gesture.origin.x;
  const dy = position.y - gesture.origin.y;
  const items = new Map(gesture.items.map((item) => [item.id, item]));
  return elements.map((element) => {
    const item = items.get(element.id);
    if (!item) return element;
    if (item.kind === "connector")
      return {
        ...element,
        start: { ...element.start, x: item.start.x + dx, y: item.start.y + dy },
        end: { ...element.end, x: item.end.x + dx, y: item.end.y + dy },
        ...(item.mid
          ? { mid: { x: item.mid.x + dx, y: item.mid.y + dy } }
          : {}),
      };
    return { ...element, x: item.x + dx, y: item.y + dy };
  });
}

function connectorHitBounds(element, scene) {
  const resolved = resolveConnector(element, scene);
  const xs = resolved.points.map((point) => point.x);
  const ys = resolved.points.map((point) => point.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return {
    x: left,
    y: top,
    width: Math.max(...xs) - left,
    height: Math.max(...ys) - top,
  };
}

// Font metrics per text role, mirroring TEXT_METRICS in BlogDiagram.jsx and
// the sizes in diagrams.css (Commit Mono is monospace, so glyph width is
// size × advance plus letter-spacing).
const TEXT_HIT_METRICS = Object.freeze({
  title: Object.freeze({ size: 25, spacing: 0.14, lineHeight: 31 }),
  subtitle: Object.freeze({ size: 11, spacing: 0.04, lineHeight: 17 }),
  label: Object.freeze({ size: 12, spacing: 0, lineHeight: 18 }),
  micro: Object.freeze({ size: 9, spacing: 0.07, lineHeight: 14 }),
  caption: Object.freeze({ size: 10, spacing: 0.025, lineHeight: 15 }),
});

// Standalone text draws its glyphs around an anchor instead of filling the
// stored box, so marquee selection tests against the visible glyph block.
function textVisualBounds(element) {
  const bounds = getElementBounds(element);
  const text = element.text || "";
  if (!text.trim()) return bounds;
  const metrics = TEXT_HIT_METRICS[element.textRole] || TEXT_HIT_METRICS.label;
  const size = element.fontSize || metrics.size;
  const lines = text.split("\n");
  const longest = Math.max(...lines.map((line) => line.length));
  const width = longest * size * (0.62 + metrics.spacing);
  const height = lines.length * metrics.lineHeight * (size / metrics.size);
  const x =
    element.align === "left"
      ? bounds.x
      : element.align === "right"
        ? bounds.right - width
        : bounds.cx - width / 2;
  return { x, y: bounds.cy - height / 2, width, height };
}

function rectContainsBounds(rect, bounds) {
  return (
    bounds.x >= rect.x &&
    bounds.y >= rect.y &&
    bounds.x + bounds.width <= rect.x + rect.width &&
    bounds.y + bounds.height <= rect.y + rect.height
  );
}

const isFormField = (target) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

function newBlankScene() {
  return createScene({
    name: "untitled-diagram",
    description: "A diagram created in the Graffioh diagram workbench.",
  });
}

function loadDraft() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseScene(saved, newBlankScene()) : newBlankScene();
  } catch {
    return newBlankScene();
  }
}

function useSceneHistory(initialScene) {
  const [state, setState] = useState(() => {
    const present =
      typeof initialScene === "function" ? initialScene() : initialScene;
    return { past: [], present, future: [], revision: 0, savedRevision: 0 };
  });
  const stateRef = useRef(state);
  const gestureRef = useRef(null);
  stateRef.current = state;

  const commit = useCallback((next) => {
    setState((current) => {
      const present =
        typeof next === "function" ? next(current.present) : next;
      if (present === current.present) return current;
      return {
        past: [...current.past, current.present].slice(-HISTORY_LIMIT),
        present,
        future: [],
        revision: current.revision + 1,
        savedRevision: current.savedRevision,
      };
    });
  }, []);

  const replace = useCallback((next) => {
    setState((current) => ({
      ...current,
      present: typeof next === "function" ? next(current.present) : next,
      revision: current.revision + 1,
    }));
  }, []);

  const beginGesture = useCallback(() => {
    if (!gestureRef.current) gestureRef.current = stateRef.current.present;
  }, []);

  const finishGesture = useCallback(() => {
    const before = gestureRef.current;
    gestureRef.current = null;
    if (!before) return;
    setState((current) => {
      if (current.present === before) return current;
      return {
        ...current,
        past: [...current.past, before].slice(-HISTORY_LIMIT),
        present: current.present,
        future: [],
      };
    });
  }, []);

  const cancelGesture = useCallback(() => {
    const before = gestureRef.current;
    gestureRef.current = null;
    if (!before) return;
    setState((current) =>
      current.present === before
        ? current
        : {
            ...current,
            present: before,
            revision: current.revision + 1,
          }
    );
  }, []);

  const undo = useCallback(() => {
    setState((current) => {
      if (!current.past.length) return current;
      const previous = current.past[current.past.length - 1];
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future].slice(0, HISTORY_LIMIT),
        revision: current.revision + 1,
        savedRevision: current.savedRevision,
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((current) => {
      if (!current.future.length) return current;
      const next = current.future[0];
      return {
        past: [...current.past, current.present].slice(-HISTORY_LIMIT),
        present: next,
        future: current.future.slice(1),
        revision: current.revision + 1,
        savedRevision: current.savedRevision,
      };
    });
  }, []);

  const reset = useCallback((next, dirty = false) => {
    gestureRef.current = null;
    setState({
      past: [],
      present: typeof next === "function" ? next() : next,
      future: [],
      revision: dirty ? 1 : 0,
      savedRevision: 0,
    });
  }, []);

  const markSaved = useCallback((revision) => {
    setState((current) =>
      current.revision === revision
        ? { ...current, savedRevision: revision }
        : current
    );
  }, []);

  return {
    scene: state.present,
    commit,
    replace,
    beginGesture,
    finishGesture,
    cancelGesture,
    undo,
    redo,
    reset,
    revision: state.revision,
    isDirty: state.revision !== state.savedRevision,
    markSaved,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}

function Icon({ name }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (name === "select")
    return (
      <svg {...common}>
        <path d="m5 3 13 9-6 1.5L9 19z" />
      </svg>
    );
  if (name === "pick")
    return (
      <svg {...common}>
        <rect
          x="4.5"
          y="5.5"
          width="15"
          height="13"
          rx="2.5"
          strokeDasharray="3 2.6"
        />
      </svg>
    );
  if (name === "frame")
    return (
      <svg {...common}>
        <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
        <path d="M7 8h5" />
      </svg>
    );
  if (name === "box")
    return (
      <svg {...common}>
        <rect x="3.5" y="6" width="17" height="12" rx="2.5" />
      </svg>
    );
  if (name === "pill")
    return (
      <svg {...common}>
        <rect x="3" y="7" width="18" height="10" rx="5" />
      </svg>
    );
  if (name === "ellipse")
    return (
      <svg {...common}>
        <ellipse cx="12" cy="12" rx="8" ry="7" />
      </svg>
    );
  if (name === "text")
    return (
      <svg {...common}>
        <path d="M5 6h14M12 6v13M8.5 19h7" />
      </svg>
    );
  if (name === "connector")
    return (
      <svg {...common}>
        <path d="M4 17 19 7" />
        <path d="m14 6 5 1-1 5" />
      </svg>
    );
  if (name === "line")
    return (
      <svg {...common}>
        <path d="M4 17 20 7" />
      </svg>
    );
  if (name === "undo")
    return (
      <svg {...common}>
        <path d="m9 7-5 5 5 5" />
        <path d="M4 12h9a6 6 0 0 1 6 6" />
      </svg>
    );
  if (name === "redo")
    return (
      <svg {...common}>
        <path d="m15 7 5 5-5 5" />
        <path d="M20 12h-9a6 6 0 0 0-6 6" />
      </svg>
    );
  if (name === "minus")
    return (
      <svg {...common}>
        <path d="M6 12h12" />
      </svg>
    );
  if (name === "plus")
    return (
      <svg {...common}>
        <path d="M6 12h12M12 6v12" />
      </svg>
    );
  if (name === "eye")
    return (
      <svg {...common}>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    );
  if (name === "eye-off")
    return (
      <svg {...common}>
        <path d="m3 3 18 18" />
        <path d="M10.6 6.1A10.3 10.3 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.1 2.8M6.2 6.2C3.8 8 2.5 12 2.5 12s3.5 6 9.5 6c1.5 0 2.8-.4 4-1" />
      </svg>
    );
  if (name === "trash")
    return (
      <svg {...common}>
        <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
      </svg>
    );
  if (name === "front")
    return (
      <svg {...common}>
        <rect x="8" y="4" width="11" height="11" rx="2" />
        <path d="M15 15v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h2" />
      </svg>
    );
  if (name === "back")
    return (
      <svg {...common}>
        <rect x="5" y="9" width="11" height="11" rx="2" />
        <path d="M9 9V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-2" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function ToolButton({ name, label, shortcut, active, onClick }) {
  return (
    <span className="diagram-editor__tool-wrap">
      <button
        type="button"
        className="diagram-editor__tool"
        aria-label={label}
        aria-pressed={active}
        title={`${label} · ${shortcut}`}
        onClick={onClick}
      >
        <Icon name={name} />
      </button>
      <span className="diagram-editor__tool-kbd" aria-hidden="true">
        {shortcut}
      </span>
    </span>
  );
}

function PalettePreview({ type }) {
  return (
    <span className="diagram-editor__palette-preview" aria-hidden="true">
      <Icon name={type} />
    </span>
  );
}

function scenePoint(event, overlayRef) {
  const svg = overlayRef.current?.ownerSVGElement;
  const matrix = svg?.getScreenCTM();
  if (!matrix) return { x: 0, y: 0 };
  return new DOMPoint(event.clientX, event.clientY).matrixTransform(
    matrix.inverse()
  );
}

// Walk elements front-to-back and return the first bindable hit, so small
// shapes on top always beat the frames and surfaces behind them. Filled
// shapes and text hit anywhere inside their bounds or within `pad` outside;
// hollow shapes (fill "none") hit only within `pad` of their border, so a
// frame interior stays transparent to binding.
function bindableAt(scene, point, ignoredId, pad = 0) {
  for (let index = scene.elements.length - 1; index >= 0; index -= 1) {
    const element = scene.elements[index];
    if (
      element.id === ignoredId ||
      element.hidden ||
      element.type === "connector"
    )
      continue;
    const bounds = getElementBounds(element);
    const outsideX = Math.max(
      bounds.x - point.x,
      0,
      point.x - (bounds.x + bounds.width)
    );
    const outsideY = Math.max(
      bounds.y - point.y,
      0,
      point.y - (bounds.y + bounds.height)
    );
    const contained = outsideX === 0 && outsideY === 0;
    const solid =
      element.type === "text" || (element.fill || "none") !== "none";
    let distance;
    if (solid) distance = contained ? 0 : Math.hypot(outsideX, outsideY);
    else if (contained)
      distance = Math.min(
        point.x - bounds.x,
        bounds.x + bounds.width - point.x,
        point.y - bounds.y,
        bounds.y + bounds.height - point.y
      );
    else distance = Math.hypot(outsideX, outsideY);
    if (distance <= pad) return element;
  }
  return null;
}

// The four fixed attachment points shown on a bind target, at the midpoint of
// each side (which is on the border for rectangles and ellipses alike).
function anchorDots(element) {
  const bounds = getElementBounds(element);
  return [
    { anchor: "top", x: bounds.cx, y: bounds.top },
    { anchor: "right", x: bounds.right, y: bounds.cy },
    { anchor: "bottom", x: bounds.cx, y: bounds.bottom },
    { anchor: "left", x: bounds.left, y: bounds.cy },
  ];
}

function nearestAnchorDot(element, point, threshold) {
  let best = null;
  for (const dot of anchorDots(element)) {
    const distance = Math.hypot(dot.x - point.x, dot.y - point.y);
    if (distance <= threshold && (!best || distance < best.distance))
      best = { ...dot, distance };
  }
  return best;
}

function distanceToSegment(point, a, b) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lengthSq = abx * abx + aby * aby;
  const t = lengthSq
    ? clamp(((point.x - a.x) * abx + (point.y - a.y) * aby) / lengthSq, 0, 1)
    : 0;
  return Math.hypot(point.x - (a.x + abx * t), point.y - (a.y + aby * t));
}

// Dragging the midpoint bends the connector through a waypoint; dragging it
// back onto the straight line between the endpoints removes the bend.
function midpointUpdate(elements, id, point, unsnapped, zoom) {
  return elements.map((element) => {
    if (element.id !== id || element.type !== "connector") return element;
    const { mid: _mid, ...straight } = element;
    const base = resolveConnector(straight, elements);
    if (
      distanceToSegment(point, base.start, base.end) * zoom <=
      MIDPOINT_CLEAR_SCREEN_PX
    )
      return straight;
    return {
      ...element,
      mid: { x: snap(point.x, !unsnapped), y: snap(point.y, !unsnapped) },
    };
  });
}

function endpoint(point, boundElement, anchor = "auto") {
  const dot =
    boundElement && anchor !== "auto"
      ? anchorDots(boundElement).find((item) => item.anchor === anchor)
      : null;
  return {
    x: dot ? dot.x : point.x,
    y: dot ? dot.y : point.y,
    ...(boundElement
      ? {
          bind: {
            elementId: boundElement.id,
            anchor,
            gap: 0,
          },
        }
      : {}),
  };
}

function elementAtCenter(type, point, unsnapped) {
  const element = createElement(type);
  const bounds = getElementBounds(element);
  const x = type === "text" ? point.x : point.x - bounds.width / 2;
  const y = type === "text" ? point.y : point.y - bounds.height / 2;
  return {
    ...element,
    x: snap(x, !unsnapped),
    y: snap(y, !unsnapped),
  };
}

function makeFence(scene) {
  return `\`\`\`blog-diagram\n${serializeScene(scene, 2)}\n\`\`\``;
}

function makeFileFence(name) {
  return `\`\`\`blog-diagram\n${JSON.stringify({ file: name }, null, 2)}\n\`\`\``;
}

async function diagramApi(route, options) {
  const response = await fetch(`/__mds${route}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      payload.error || `${response.status} ${response.statusText}`
    );
    error.status = response.status;
    error.code = payload.code;
    throw error;
  }
  return payload;
}

function isRevisionConflict(error) {
  return (
    error?.status === 409 && error?.code === "diagram_revision_conflict"
  );
}

function isMissingDiagram(error) {
  return error?.status === 404 && error?.code === "diagram_not_found";
}

function titleFromSlug(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function validateSceneDocument(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("the diagram file is not a scene object");
  if (
    value.version !== undefined &&
    Number(value.version) !== SCENE_VERSION
  )
    throw new Error(`only diagram scene version ${SCENE_VERSION} is supported`);
  if (!Array.isArray(value.elements))
    throw new Error("the diagram file has no elements array");
  return value;
}

async function writeClipboard(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const area = document.createElement("textarea");
  area.value = value;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

function downloadText(filename, text) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json;charset=utf-8" })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function Field({ label, children }) {
  return (
    <label className="diagram-editor__field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Segmented({ value, values, onChange }) {
  return (
    <div className="diagram-editor__segmented">
      {values.map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={value === item}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function layerLabel(element) {
  const text = (element.text || "").replace(/\s+/g, " ").trim();
  if (text) return text.length > 30 ? `${text.slice(0, 29)}…` : text;
  return element.type === "connector"
    ? "Untitled connector"
    : `Untitled ${element.type}`;
}

function LayerPanel({
  elements,
  selectedIds,
  onSelect,
  onToggleVisibility,
  onArrange,
  onRemove,
}) {
  const layers = [...elements].reverse();
  const hasSelection = selectedIds.length > 0;

  return (
    <section className="diagram-editor__layers" aria-label="Layers">
      <div className="diagram-editor__panel-heading">
        <h2 className="diagram-editor__panel-title">Layers</h2>
        <span>front → back</span>
      </div>
      <div className="diagram-editor__layer-list" aria-label="Diagram layers">
        {layers.map((element, index) => (
          <div
            key={element.id}
            className="diagram-editor__layer"
            data-selected={selectedIds.includes(element.id) ? "true" : undefined}
            data-hidden={element.hidden ? "true" : undefined}
          >
            <button
              type="button"
              className="diagram-editor__layer-select"
              aria-pressed={selectedIds.includes(element.id)}
              onClick={(event) => onSelect(element.id, event)}
            >
              <span className="diagram-editor__layer-type" aria-hidden="true">
                <Icon name={element.type} />
              </span>
              <span className="diagram-editor__layer-copy">
                <span>{layerLabel(element)}</span>
                <small>
                  {element.type}
                  {index === 0 ? " · front" : ""}
                </small>
              </span>
            </button>
            <button
              type="button"
              className="diagram-editor__layer-visibility"
              aria-label={`${element.hidden ? "Show" : "Hide"} ${layerLabel(element)}`}
              aria-pressed={element.hidden}
              title={element.hidden ? "Show layer" : "Hide layer"}
              onClick={() => onToggleVisibility(element.id)}
            >
              <Icon name={element.hidden ? "eye-off" : "eye"} />
            </button>
          </div>
        ))}
        {!layers.length && (
          <p className="diagram-editor__layers-empty">No layers yet</p>
        )}
      </div>
      <div
        className="diagram-editor__layer-actions"
        aria-label="Selected layer actions"
      >
        <button
          type="button"
          aria-label="Send selected layers to back"
          title="Send to back"
          disabled={!hasSelection}
          onClick={() => onArrange(selectedIds, "back")}
        >
          <Icon name="back" />
        </button>
        <button
          type="button"
          aria-label="Bring selected layers to front"
          title="Bring to front"
          disabled={!hasSelection}
          onClick={() => onArrange(selectedIds, "front")}
        >
          <Icon name="front" />
        </button>
        <span />
        <button
          type="button"
          className="diagram-editor__layer-delete"
          aria-label="Delete selected layers"
          title="Delete layer"
          disabled={!hasSelection}
          onClick={() => onRemove(selectedIds)}
        >
          <Icon name="trash" />
        </button>
      </div>
    </section>
  );
}

function Inspector({
  scene,
  selected,
  selectionCount,
  patchScene,
  patchElement,
  beginField,
  finishField,
  duplicate,
  remove,
  arrange,
}) {
  if (!selected && selectionCount > 1) {
    return (
      <div className="diagram-editor__inspector">
        <h2 className="diagram-editor__panel-title">Selection</h2>
        <div className="diagram-editor__object-name">
          {selectionCount} elements
        </div>
        <p className="diagram-editor__hint" style={{ margin: "0 0 14px" }}>
          Drag any selected shape to move the group. Shift-click adds or
          removes an element.
        </p>
        <section className="diagram-editor__actions">
          <button
            type="button"
            className="diagram-editor__button"
            onClick={() => arrange("front")}
          >
            to front
          </button>
          <button
            type="button"
            className="diagram-editor__button"
            onClick={() => arrange("back")}
          >
            to back
          </button>
          <button
            type="button"
            className="diagram-editor__button"
            onClick={duplicate}
          >
            duplicate
          </button>
          <button
            type="button"
            className="diagram-editor__button"
            onClick={remove}
          >
            delete
          </button>
        </section>
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="diagram-editor__inspector">
        <h2 className="diagram-editor__panel-title">Document</h2>
        <section className="diagram-editor__section">
          <Field label="Scene name">
            <input
              value={scene.name}
              maxLength="80"
              onFocus={beginField}
              onBlur={finishField}
              onChange={(event) =>
                patchScene({ name: event.target.value }, false)
              }
            />
          </Field>
          <Field label="Accessible title">
            <input
              value={scene.title}
              maxLength="160"
              onFocus={beginField}
              onBlur={finishField}
              onChange={(event) =>
                patchScene({ title: event.target.value }, false)
              }
            />
          </Field>
        </section>
        <section className="diagram-editor__section">
          <div className="diagram-editor__field-row">
            <Field label="Width">
              <input value={scene.width} disabled />
            </Field>
            <Field label="Height">
              <input
                type="number"
                min="320"
                max="1200"
                step="8"
                value={scene.height}
                onChange={(event) =>
                  patchScene(
                    { height: clamp(Number(event.target.value), 320, 1200) },
                    true
                  )
                }
              />
            </Field>
          </div>
          <label className="diagram-editor__checkbox">
            Outer frame
            <input
              type="checkbox"
              checked={scene.frame}
              onChange={(event) =>
                patchScene({ frame: event.target.checked }, true)
              }
            />
          </label>
          <label className="diagram-editor__checkbox">
            Dot texture
            <input
              type="checkbox"
              checked={scene.grid}
              onChange={(event) =>
                patchScene({ grid: event.target.checked }, true)
              }
            />
          </label>
        </section>
        <p className="diagram-editor__hint">
          {scene.elements.length} elements · output stays monochrome and follows
          the active blog theme automatically.
        </p>
      </div>
    );
  }

  const shape = SHAPE_TYPES.has(selected.type);
  const connector = selected.type === "connector";
  const bounds = getElementBounds(selected);

  return (
    <div className="diagram-editor__inspector">
      <h2 className="diagram-editor__panel-title">Selection</h2>
      <div className="diagram-editor__object-name">
        {selected.type} · {selected.id}
      </div>

      {(shape || connector) && (
        <section className="diagram-editor__section">
          <Field label="Text">
            <textarea
              value={selected.text || ""}
              maxLength="1000"
              onFocus={beginField}
              onBlur={finishField}
              onChange={(event) =>
                patchElement({ text: event.target.value }, false)
              }
            />
          </Field>
          {shape && (
            <div className="diagram-editor__field-row">
              <Field label="Text role">
                <select
                  value={selected.textRole || "label"}
                  onChange={(event) =>
                    patchElement({ textRole: event.target.value }, true)
                  }
                >
                  <option value="title">title</option>
                  <option value="subtitle">subtitle</option>
                  <option value="label">label</option>
                  <option value="micro">micro</option>
                  <option value="caption">caption</option>
                </select>
              </Field>
              <Field label="Size · px">
                <input
                  type="number"
                  min="1"
                  max="120"
                  placeholder="auto"
                  value={selected.fontSize ?? ""}
                  onChange={(event) => {
                    const raw = event.target.value;
                    patchElement(
                      {
                        fontSize:
                          raw === ""
                            ? undefined
                            : clamp(Number(raw), 1, 120),
                      },
                      true
                    );
                  }}
                />
              </Field>
            </div>
          )}
        </section>
      )}

      {shape && selected.type !== "text" && (
        <section className="diagram-editor__section">
          <div className="diagram-editor__field-label">Surface</div>
          <Segmented
            value={selected.fill || "none"}
            values={["none", "soft", "mid", "strong"]}
            onChange={(fill) => patchElement({ fill }, true)}
          />
          <div className="diagram-editor__field-label" style={{ marginTop: 10 }}>
            Stroke
          </div>
          <Segmented
            value={selected.stroke || "solid"}
            values={["solid", "dashed", "none"]}
            onChange={(stroke) => patchElement({ stroke }, true)}
          />
          <div className="diagram-editor__field-row" style={{ marginTop: 10 }}>
            <Field label="Label">
              <select
                value={selected.labelPosition || "center"}
                onChange={(event) =>
                  patchElement({ labelPosition: event.target.value }, true)
                }
              >
                <option value="center">center</option>
                <option value="top">top</option>
              </select>
            </Field>
            <Field label="Radius">
              <input
                type="number"
                min="0"
                max="80"
                value={selected.radius ?? 12}
                onChange={(event) =>
                  patchElement(
                    {
                      radius: clamp(
                        Number(event.target.value),
                        0,
                        Math.min(bounds.width, bounds.height) / 2
                      ),
                    },
                    true
                  )
                }
              />
            </Field>
          </div>
        </section>
      )}

      {connector && (
        <section className="diagram-editor__section">
          <div className="diagram-editor__field-label">Route</div>
          <Segmented
            value={selected.route || "straight"}
            values={["straight", "elbow"]}
            onChange={(route) => patchElement({ route }, true)}
          />
          <div className="diagram-editor__field-label" style={{ marginTop: 10 }}>
            Line
          </div>
          <Segmented
            value={selected.stroke || "solid"}
            values={["solid", "dashed"]}
            onChange={(stroke) => patchElement({ stroke }, true)}
          />
          <label className="diagram-editor__checkbox" style={{ marginTop: 10 }}>
            Start arrow
            <input
              type="checkbox"
              checked={Boolean(selected.arrowStart)}
              onChange={(event) =>
                patchElement({ arrowStart: event.target.checked }, true)
              }
            />
          </label>
          <label className="diagram-editor__checkbox">
            End arrow
            <input
              type="checkbox"
              checked={Boolean(selected.arrowEnd)}
              onChange={(event) =>
                patchElement({ arrowEnd: event.target.checked }, true)
              }
            />
          </label>
        </section>
      )}

      {shape && (
        <section className="diagram-editor__section">
          <div className="diagram-editor__field-row">
            <Field label="X">
              <input
                type="number"
                value={Math.round(bounds.x)}
                onChange={(event) =>
                  patchElement({ x: Number(event.target.value) }, true)
                }
              />
            </Field>
            <Field label="Y">
              <input
                type="number"
                value={Math.round(bounds.y)}
                onChange={(event) =>
                  patchElement({ y: Number(event.target.value) }, true)
                }
              />
            </Field>
            <Field label="Width">
              <input
                type="number"
                min="24"
                value={Math.round(bounds.width)}
                onChange={(event) =>
                  patchElement(
                    { width: Math.max(24, Number(event.target.value)) },
                    true
                  )
                }
              />
            </Field>
            <Field label="Height">
              <input
                type="number"
                min="20"
                value={Math.round(bounds.height)}
                onChange={(event) =>
                  patchElement(
                    { height: Math.max(20, Number(event.target.value)) },
                    true
                  )
                }
              />
            </Field>
          </div>
        </section>
      )}

      <section className="diagram-editor__section">
        <Field label={`Opacity · ${Math.round((selected.opacity ?? 1) * 100)}%`}>
          <input
            type="range"
            min="0.2"
            max="1"
            step="0.05"
            value={selected.opacity ?? 1}
            onChange={(event) =>
              patchElement({ opacity: Number(event.target.value) }, true)
            }
          />
        </Field>
        <label className="diagram-editor__checkbox">
          Lock element
          <input
            type="checkbox"
            checked={Boolean(selected.locked)}
            onChange={(event) =>
              patchElement({ locked: event.target.checked }, true)
            }
          />
        </label>
      </section>

      <section className="diagram-editor__actions">
        <button
          type="button"
          className="diagram-editor__button"
          onClick={() => arrange("front")}
        >
          to front
        </button>
        <button
          type="button"
          className="diagram-editor__button"
          onClick={() => arrange("back")}
        >
          to back
        </button>
        <button
          type="button"
          className="diagram-editor__button"
          onClick={duplicate}
        >
          duplicate
        </button>
        <button
          type="button"
          className="diagram-editor__button"
          onClick={remove}
        >
          delete
        </button>
      </section>
    </div>
  );
}

export default function DiagramEditor({ theme }) {
  const {
    scene,
    commit,
    replace,
    beginGesture,
    finishGesture,
    cancelGesture,
    undo,
    redo,
    reset,
    revision,
    isDirty,
    markSaved,
    canUndo,
    canRedo,
  } = useSceneHistory(loadDraft);
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeTool, setActiveTool] = useState("select");
  const [editingId, setEditingId] = useState(null);
  const [gesture, setGesture] = useState(null);
  const [marquee, setMarquee] = useState(null);
  const [centerGuides, setCenterGuides] = useState(NO_CENTER_GUIDES);
  const [alignGuides, setAlignGuides] = useState(NO_ALIGN_GUIDES);
  const [draftConnector, setDraftConnector] = useState(null);
  const [bindTargetId, setBindTargetId] = useState(null);
  const [bindAnchor, setBindAnchor] = useState(null);
  const [zoom, setZoom] = useState(0.82);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panGesture, setPanGesture] = useState(null);
  const [toast, setToast] = useState("");
  const [diagramFiles, setDiagramFiles] = useState([]);
  const [activeFile, setActiveFile] = useState("");
  const [libraryState, setLibraryState] = useState("loading");
  const [isInitialized, setIsInitialized] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [saveState, setSaveState] = useState("loading diagrams…");
  const [saveConflict, setSaveConflict] = useState(null);
  const [orphanRecovery, setOrphanRecovery] = useState(null);
  const workspaceRef = useRef(null);
  const overlayRef = useRef(null);
  const importRef = useRef(null);
  const inlineRef = useRef(null);
  const spaceRef = useRef(false);
  const dragEngagedRef = useRef(false);
  const clipboardRef = useRef(null);
  const toastTimer = useRef(null);
  const activeFileRef = useRef("");
  const latestSceneRef = useRef(scene);
  const revisionRef = useRef(revision);
  const dirtyRef = useRef(isDirty);
  const persistedSignaturesRef = useRef(new Map());
  const persistedRevisionsRef = useRef(new Map());
  const pendingWritesRef = useRef(new Map());
  const saveQueueRef = useRef(Promise.resolve());
  const saveConflictRef = useRef(null);
  const orphanRecoveryRef = useRef(null);
  const loadRequestRef = useRef(0);
  const transitionRef = useRef(false);

  activeFileRef.current = activeFile;
  latestSceneRef.current = scene;
  revisionRef.current = revision;
  dirtyRef.current = isDirty;
  saveConflictRef.current = saveConflict;
  orphanRecoveryRef.current = orphanRecovery;

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedElements = useMemo(
    () => scene.elements.filter((element) => selectedIdSet.has(element.id)),
    [scene.elements, selectedIdSet]
  );
  const selected = selectedElements.length === 1 ? selectedElements[0] : null;

  useEffect(() => {
    if (selectedElements.length === selectedIds.length) return;
    const existing = new Set(selectedElements.map((element) => element.id));
    setSelectedIds((current) => current.filter((id) => existing.has(id)));
  }, [selectedElements, selectedIds]);

  const notify = useCallback((message) => {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(""), 1800);
  }, []);

  useEffect(
    () => () => clearTimeout(toastTimer.current),
    []
  );

  // Keep a local recovery copy even though named diagrams are persisted to disk.
  useEffect(() => {
    if (!isInitialized) return undefined;
    const save = () => {
      try {
        const serialized = serializeScene(scene);
        localStorage.setItem(STORAGE_KEY, serialized);
        if (activeFile) {
          localStorage.setItem(RECOVERY_FILE_KEY, activeFile);
          if (
            !dirtyRef.current &&
            persistedSignaturesRef.current.get(activeFile) === serialized
          ) {
            localStorage.setItem(RECOVERY_BASE_KEY, serialized);
          }
        }
        return true;
      } catch {
        return false;
      }
    };
    const timer = setTimeout(save, 220);
    const flush = () => save();
    window.addEventListener("pagehide", flush);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [activeFile, isInitialized, scene]);

  const parkMissingDiagram = useCallback(
    (name) => {
      if (activeFileRef.current !== name) return false;
      const recovery = { name };
      const recoverySignature = serializeScene(latestSceneRef.current);
      try {
        localStorage.setItem(STORAGE_KEY, recoverySignature);
        localStorage.setItem(RECOVERY_FILE_KEY, name);
      } catch {
        // The in-memory recovery remains available even without local storage.
      }
      persistedSignaturesRef.current.delete(name);
      persistedRevisionsRef.current.delete(name);
      saveConflictRef.current = null;
      orphanRecoveryRef.current = recovery;
      activeFileRef.current = "";
      setSaveConflict(null);
      setOrphanRecovery(recovery);
      setActiveFile("");
      setDiagramFiles((current) => current.filter((file) => file !== name));
      setSaveState(`unsaved recovery · ${name}.json is missing`);
      notify(`${name}.json is missing · recovery kept on canvas`);
      return true;
    },
    [notify]
  );

  const persistDiagram = useCallback(
    (name, nextScene, { ifAbsent = false } = {}) => {
      const serialized = serializeScene(nextScene);
      const suffix = ifAbsent ? "&ifAbsent=1" : "";
      pendingWritesRef.current.set(
        name,
        (pendingWritesRef.current.get(name) || 0) + 1
      );
      const write = () =>
        diagramApi(`/diagram?name=${encodeURIComponent(name)}${suffix}`, {
          method: "PUT",
          body: JSON.stringify({
            scene: JSON.parse(serialized),
            ...(!ifAbsent
              ? { baseRevision: persistedRevisionsRef.current.get(name) }
              : {}),
          }),
        });
      const task = saveQueueRef.current
        .catch(() => {})
        .then(write)
        .then(({ revision: nextRevision }) => {
          persistedSignaturesRef.current.set(name, serialized);
          if (nextRevision) persistedRevisionsRef.current.set(name, nextRevision);
          try {
            if (localStorage.getItem(RECOVERY_FILE_KEY) === name) {
              localStorage.setItem(RECOVERY_BASE_KEY, serialized);
            }
          } catch {
            // Disk persistence succeeded; local recovery metadata is best-effort.
          }
          return serialized;
        })
        .catch((error) => {
          if (!ifAbsent) {
            if (isRevisionConflict(error)) {
              const conflict = { name };
              saveConflictRef.current = conflict;
              setSaveConflict(conflict);
            } else if (isMissingDiagram(error)) {
              parkMissingDiagram(name);
            }
          }
          throw error;
        })
        .finally(() => {
          const remaining = (pendingWritesRef.current.get(name) || 1) - 1;
          if (remaining > 0) pendingWritesRef.current.set(name, remaining);
          else pendingWritesRef.current.delete(name);
        });
      saveQueueRef.current = task;
      return task;
    },
    [parkMissingDiagram]
  );

  const beginTransition = useCallback(() => {
    if (transitionRef.current) return false;
    transitionRef.current = true;
    setIsTransitioning(true);
    if (isFormField(document.activeElement)) document.activeElement.blur();
    return true;
  }, []);

  const endTransition = useCallback(() => {
    transitionRef.current = false;
    setIsTransitioning(false);
  }, []);

  const flushActiveFile = useCallback(async () => {
    const name = activeFileRef.current;
    if (!name || !dirtyRef.current) return true;
    if (saveConflictRef.current?.name === name) {
      notify(`Resolve the ${name}.json conflict before continuing`);
      return false;
    }
    const nextScene = latestSceneRef.current;
    const nextRevision = revisionRef.current;
    const serialized = serializeScene(nextScene);
    if (
      persistedSignaturesRef.current.get(name) === serialized &&
      !pendingWritesRef.current.has(name)
    ) {
      markSaved(nextRevision);
      return true;
    }

    setSaveState(`saving ${name}…`);
    try {
      await persistDiagram(name, nextScene);
      markSaved(nextRevision);
      if (activeFileRef.current === name) setSaveState(`saved · ${name}.json`);
      return true;
    } catch (error) {
      if (
        isMissingDiagram(error) &&
        orphanRecoveryRef.current?.name === name
      ) return false;
      setSaveState(isRevisionConflict(error) ? "save conflict" : "disk save failed");
      notify(
        isRevisionConflict(error)
          ? `${name}.json changed on disk`
          : `Could not save ${name}: ${error.message}`
      );
      return false;
    }
  }, [markSaved, notify, persistDiagram]);

  const openDiagram = useCallback(
    async (
      name,
      { saveCurrent = true, transitionHeld = false, allowRecovery = false } = {}
    ) => {
      if (orphanRecoveryRef.current) {
        if (transitionHeld) endTransition();
        notify("Restore, save, export, or discard the open recovery first");
        return;
      }
      if (!name || name === activeFileRef.current) {
        if (transitionHeld) endTransition();
        return;
      }
      if (!transitionHeld && !beginTransition()) return;
      const request = ++loadRequestRef.current;
      setSaveState(`loading ${name}…`);
      try {
        if (saveCurrent && !(await flushActiveFile())) return;
        const payload = await diagramApi(
          `/diagram?name=${encodeURIComponent(name)}`
        );
        if (request !== loadRequestRef.current) return;
        const diskScene = parseScene(
          validateSceneDocument(payload.scene),
          newBlankScene()
        );
        const diskSignature = serializeScene(diskScene);
        let nextScene = diskScene;
        let recovered = false;

        if (
          allowRecovery &&
          localStorage.getItem(RECOVERY_FILE_KEY) === name
        ) {
          const recoveryScene = latestSceneRef.current;
          const recoverySignature = serializeScene(recoveryScene);
          const recoveryBase = localStorage.getItem(RECOVERY_BASE_KEY);
          if (
            recoverySignature !== diskSignature &&
            recoverySignature !== recoveryBase &&
            window.confirm(
              `A local recovery differs from ${name}.json. Restore the local version?`
            )
          ) {
            nextScene = recoveryScene;
            recovered = true;
          }
        }

        persistedSignaturesRef.current.set(name, diskSignature);
        persistedRevisionsRef.current.set(name, payload.revision);
        activeFileRef.current = name;
        latestSceneRef.current = nextScene;
        setActiveFile(name);
        reset(nextScene, recovered);
        setSelectedIds([]);
        setEditingId(null);
        localStorage.setItem(FILE_SELECTION_KEY, name);
        localStorage.setItem(RECOVERY_FILE_KEY, name);
        if (!recovered) localStorage.setItem(RECOVERY_BASE_KEY, diskSignature);
        setSaveState(
          recovered ? `recovered · saving ${name}…` : `saved · ${name}.json`
        );
      } catch (error) {
        if (request !== loadRequestRef.current) return;
        setSaveState("could not load diagram");
        notify(`Could not load ${name}: ${error.message}`);
      } finally {
        if (request === loadRequestRef.current) endTransition();
      }
    },
    [beginTransition, endTransition, flushActiveFile, notify, reset]
  );

  const clearSaveConflict = useCallback((name) => {
    if (saveConflictRef.current?.name !== name) return;
    saveConflictRef.current = null;
    setSaveConflict(null);
  }, []);

  const fetchDiskDiagram = useCallback(async (name) => {
    const payload = await diagramApi(
      `/diagram?name=${encodeURIComponent(name)}`
    );
    const diskScene = parseScene(
      validateSceneDocument(payload.scene),
      newBlankScene()
    );
    return {
      scene: diskScene,
      signature: serializeScene(diskScene),
      revision: payload.revision,
    };
  }, []);

  const keepLocalAfterConflict = useCallback(async () => {
    const name = saveConflictRef.current?.name;
    if (!name || name !== activeFileRef.current || !beginTransition()) return;
    const localScene = latestSceneRef.current;
    const localRevision = revisionRef.current;
    setSaveState(`checking ${name}.json…`);

    try {
      await saveQueueRef.current.catch(() => {});
      if (saveConflictRef.current?.name !== name) return;
      const disk = await fetchDiskDiagram(name);
      persistedSignaturesRef.current.set(name, disk.signature);
      persistedRevisionsRef.current.set(name, disk.revision);
      setSaveState(`saving your version · ${name}.json`);
      await persistDiagram(name, localScene);
      markSaved(localRevision);
      clearSaveConflict(name);
      setSaveState(`saved · ${name}.json`);
      notify(`Kept your version of ${name}.json`);
    } catch (error) {
      if (isMissingDiagram(error)) {
        parkMissingDiagram(name);
        return;
      }
      setSaveState("save conflict");
      notify(`Could not keep your version: ${error.message}`);
    } finally {
      endTransition();
    }
  }, [
    beginTransition,
    clearSaveConflict,
    endTransition,
    fetchDiskDiagram,
    markSaved,
    notify,
    parkMissingDiagram,
    persistDiagram,
  ]);

  const useDiskAfterConflict = useCallback(async () => {
    const name = saveConflictRef.current?.name;
    if (!name || name !== activeFileRef.current || !beginTransition()) return;
    setSaveState(`reloading ${name}.json…`);

    try {
      await saveQueueRef.current.catch(() => {});
      if (saveConflictRef.current?.name !== name) return;
      const disk = await fetchDiskDiagram(name);
      persistedSignaturesRef.current.set(name, disk.signature);
      persistedRevisionsRef.current.set(name, disk.revision);
      latestSceneRef.current = disk.scene;
      reset(disk.scene);
      setSelectedIds([]);
      setEditingId(null);
      localStorage.setItem(STORAGE_KEY, disk.signature);
      localStorage.setItem(RECOVERY_FILE_KEY, name);
      localStorage.setItem(RECOVERY_BASE_KEY, disk.signature);
      clearSaveConflict(name);
      setSaveState(`saved · ${name}.json`);
      notify(`Reloaded ${name}.json from disk`);
    } catch (error) {
      if (isMissingDiagram(error)) {
        parkMissingDiagram(name);
        return;
      }
      setSaveState("save conflict");
      notify(`Could not reload ${name}: ${error.message}`);
    } finally {
      endTransition();
    }
  }, [
    beginTransition,
    clearSaveConflict,
    endTransition,
    fetchDiskDiagram,
    notify,
    parkMissingDiagram,
    reset,
  ]);

  useEffect(() => {
    let disposed = false;
    const loadLibrary = async () => {
      if (!beginTransition()) return;
      try {
        const { diagrams = [] } = await diagramApi("/diagrams");
        if (disposed) return;
        setDiagramFiles(diagrams);
        setLibraryState("ready");
        const recoveryFile = localStorage.getItem(RECOVERY_FILE_KEY) || "";
        const recoverySource = localStorage.getItem(STORAGE_KEY);
        const recoveryScene = latestSceneRef.current;
        const recoverySignature = serializeScene(recoveryScene);
        const recoveryBase = localStorage.getItem(RECOVERY_BASE_KEY);
        const hasOrphanedRecovery =
          Boolean(recoverySource) &&
          DIAGRAM_SLUG.test(recoveryFile) &&
          !diagrams.includes(recoveryFile) &&
          recoverySignature !== recoveryBase;

        if (
          hasOrphanedRecovery &&
          window.confirm(
            `${recoveryFile}.json no longer exists, but it has unsaved local edits. Restore that file? Cancel keeps the recovery open so you can save it under another name or export JSON.`
          )
        ) {
          try {
            setSaveState(`restoring ${recoveryFile}.json…`);
            await persistDiagram(recoveryFile, recoveryScene, { ifAbsent: true });
            if (disposed) return;
            const restoredFiles = [...diagrams, recoveryFile].sort((a, b) =>
              a.localeCompare(b)
            );
            setDiagramFiles(restoredFiles);
            activeFileRef.current = recoveryFile;
            latestSceneRef.current = recoveryScene;
            setActiveFile(recoveryFile);
            reset(recoveryScene);
            setSelectedIds([]);
            setEditingId(null);
            localStorage.setItem(FILE_SELECTION_KEY, recoveryFile);
            localStorage.setItem(RECOVERY_FILE_KEY, recoveryFile);
            localStorage.setItem(RECOVERY_BASE_KEY, recoverySignature);
            setSaveState(`saved · ${recoveryFile}.json`);
            notify(`Restored ${recoveryFile}.json`);
            endTransition();
            setIsInitialized(true);
            return;
          } catch (error) {
            notify(`Could not restore ${recoveryFile}: ${error.message}`);
          }
        }

        if (hasOrphanedRecovery) {
          const recovery = { name: recoveryFile };
          orphanRecoveryRef.current = recovery;
          setOrphanRecovery(recovery);
          activeFileRef.current = "";
          latestSceneRef.current = recoveryScene;
          setActiveFile("");
          reset(recoveryScene, true);
          setSelectedIds([]);
          setEditingId(null);
          setSaveState(`unsaved recovery · ${recoveryFile}.json is missing`);
          notify("Recovery kept on canvas · use New or JSON to preserve it");
          endTransition();
          setIsInitialized(true);
          return;
        }

        const remembered = localStorage.getItem(FILE_SELECTION_KEY);
        const first = diagrams.includes(remembered) ? remembered : diagrams[0];
        if (first)
          await openDiagram(first, {
            saveCurrent: false,
            transitionHeld: true,
            allowRecovery: true,
          });
        else {
          setSaveState("no saved diagrams");
          localStorage.removeItem(RECOVERY_FILE_KEY);
          localStorage.removeItem(RECOVERY_BASE_KEY);
          endTransition();
        }
        if (!disposed) setIsInitialized(true);
      } catch (error) {
        if (disposed) return;
        setLibraryState("error");
        setSaveState("diagram library unavailable");
        notify(`Could not read diagram library: ${error.message}`);
        endTransition();
        setIsInitialized(true);
      }
    };
    loadLibrary();
    return () => {
      disposed = true;
      loadRequestRef.current += 1;
      transitionRef.current = false;
    };
  }, [
    beginTransition,
    endTransition,
    notify,
    openDiagram,
    persistDiagram,
    reset,
  ]);

  useEffect(() => {
    if (
      !activeFile ||
      !isDirty ||
      saveConflict?.name === activeFile
    ) return;
    const saveRevision = revision;
    const serialized = serializeScene(scene);
    if (
      persistedSignaturesRef.current.get(activeFile) === serialized &&
      !pendingWritesRef.current.has(activeFile)
    ) {
      markSaved(saveRevision);
      return;
    }

    setSaveState(`saving ${activeFile}…`);
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        await persistDiagram(activeFile, scene);
        if (
          !cancelled &&
          activeFileRef.current === activeFile &&
          revisionRef.current === saveRevision &&
          serializeScene(latestSceneRef.current) === serialized
        ) {
          markSaved(saveRevision);
          setSaveState(`saved · ${activeFile}.json`);
        }
      } catch (error) {
        if (
          isMissingDiagram(error) &&
          orphanRecoveryRef.current?.name === activeFile
        ) return;
        if (!cancelled && activeFileRef.current === activeFile) {
          setSaveState(
            isRevisionConflict(error) ? "save conflict" : "disk save failed"
          );
          notify(
            isRevisionConflict(error)
              ? `${activeFile}.json changed on disk`
              : `Could not save ${activeFile}: ${error.message}`
          );
        }
      }
    }, 360);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    activeFile,
    isDirty,
    markSaved,
    notify,
    persistDiagram,
    revision,
    saveConflict,
    scene,
  ]);

  const patchScene = useCallback(
    (patch, historic = true) => {
      if (transitionRef.current) return;
      const updater = (current) =>
        sanitizeScene({ ...current, ...patch }, current);
      (historic ? commit : replace)(updater);
    },
    [commit, replace]
  );

  const patchSelected = useCallback(
    (patch, historic = true) => {
      if (transitionRef.current) return;
      if (!selected) return;
      const targetId = selected.id;
      const updater = (current) =>
        sanitizeScene(
          {
            ...current,
            elements: current.elements.map((element) =>
              element.id === targetId ? { ...element, ...patch } : element
            ),
          },
          current
        );
      (historic ? commit : replace)(updater);
    },
    [commit, replace, selected]
  );

  const removeElements = useCallback(
    (ids) => {
      const idSet = new Set(Array.isArray(ids) ? ids : [ids]);
      if (!idSet.size) return;
      commit((current) => ({
        ...current,
        elements: current.elements
          .filter((element) => !idSet.has(element.id))
          .map((element) => {
            if (element.type !== "connector") return element;
            const unbind = (end) =>
              end?.bind && idSet.has(end.bind.elementId)
                ? { x: end.x, y: end.y }
                : end;
            return {
              ...element,
              start: unbind(element.start),
              end: unbind(element.end),
            };
          }),
      }));
      setSelectedIds((current) => current.filter((id) => !idSet.has(id)));
      setEditingId((current) =>
        current && idSet.has(current) ? null : current
      );
    },
    [commit]
  );

  const removeSelected = useCallback(() => {
    removeElements(selectedIds);
  }, [removeElements, selectedIds]);

  const duplicateSelected = useCallback(() => {
    if (!selectedElements.length) return;
    const copies = cloneElementsWithOffset(selectedElements, 16);
    commit((current) => ({
      ...current,
      elements: [...current.elements, ...copies],
    }));
    setSelectedIds(copies.map((copy) => copy.id));
  }, [commit, selectedElements]);

  const copySelected = useCallback(() => {
    if (!selectedElements.length) return 0;
    clipboardRef.current = { elements: clone(selectedElements), pastes: 0 };
    return selectedElements.length;
  }, [selectedElements]);

  const pasteClipboard = useCallback(() => {
    const clip = clipboardRef.current;
    if (!clip?.elements.length) return;
    clip.pastes += 1;
    const copies = cloneElementsWithOffset(clip.elements, 16 * clip.pastes);
    commit((current) => ({
      ...current,
      elements: [...current.elements, ...copies],
    }));
    setSelectedIds(copies.map((copy) => copy.id));
  }, [commit]);

  const arrangeElements = useCallback(
    (ids, where) => {
      const idSet = new Set(Array.isArray(ids) ? ids : [ids]);
      if (!idSet.size) return;
      commit((current) => {
        const chosen = current.elements.filter((item) => idSet.has(item.id));
        if (!chosen.length) return current;
        const rest = current.elements.filter((item) => !idSet.has(item.id));
        return {
          ...current,
          elements: where === "front" ? [...rest, ...chosen] : [...chosen, ...rest],
        };
      });
    },
    [commit]
  );

  const arrangeSelected = useCallback(
    (where) => arrangeElements(selectedIds, where),
    [arrangeElements, selectedIds]
  );

  const toggleElementVisibility = useCallback((elementId) => {
    if (!elementId) return;
    commit((current) => ({
      ...current,
      elements: current.elements.map((element) =>
        element.id === elementId
          ? { ...element, hidden: !element.hidden }
          : element
      ),
    }));
    if (editingId === elementId) {
      setEditingId(null);
      finishGesture();
    }
  }, [commit, editingId, finishGesture]);

  const addElement = useCallback(
    (type, point, unsnapped = false) => {
      if (isFormField(document.activeElement)) document.activeElement.blur();
      if (CONNECTION_TOOLS.has(type)) {
        setActiveTool(type);
        return;
      }
      const element = elementAtCenter(type, point, unsnapped);
      commit((current) => ({
        ...current,
        elements: [...current.elements, element],
      }));
      setSelectedIds([element.id]);
      setActiveTool("select");
      if (type === "text") {
        setEditingId(element.id);
        requestAnimationFrame(() => {
          if (!inlineRef.current) return;
          beginGesture();
          inlineRef.current.focus();
        });
      }
    },
    [beginGesture, commit]
  );

  const fitCanvas = useCallback(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const bounds = workspace.getBoundingClientRect();
    const next = clamp(
      Math.min((bounds.width - 88) / scene.width, (bounds.height - 88) / scene.height),
      0.2,
      1.25
    );
    setZoom(next);
    setPan({ x: 0, y: 0 });
  }, [scene.height, scene.width]);

  useLayoutEffect(() => {
    const timer = requestAnimationFrame(fitCanvas);
    return () => cancelAnimationFrame(timer);
  }, [fitCanvas]);

  const beginMove = useCallback(
    (event, element) => {
      if (event.button !== 0) return;
      if (gesture || panGesture) return;
      if (CONNECTION_TOOLS.has(activeTool)) return;
      event.stopPropagation();
      if (event.shiftKey) {
        setSelectedIds((current) =>
          current.includes(element.id)
            ? current.filter((id) => id !== element.id)
            : [...current, element.id]
        );
        return;
      }
      const nextIds = selectedIds.includes(element.id)
        ? selectedIds
        : [element.id];
      setSelectedIds(nextIds);
      if (element.locked || activeTool !== "select") return;
      if (element.type === "connector") return;
      if (isFormField(document.activeElement)) document.activeElement.blur();
      const point = scenePoint(event, overlayRef);
      const items = scene.elements
        .filter(
          (item) => nextIds.includes(item.id) && !item.locked && !item.hidden
        )
        .map((item) =>
          item.type === "connector"
            ? {
                id: item.id,
                kind: "connector",
                start: { x: item.start.x, y: item.start.y },
                end: { x: item.end.x, y: item.end.y },
                mid: item.mid ? { x: item.mid.x, y: item.mid.y } : null,
              }
            : { id: item.id, kind: "shape", x: item.x, y: item.y }
        );
      setCenterGuides(NO_CENTER_GUIDES);
      setAlignGuides(NO_ALIGN_GUIDES);
      dragEngagedRef.current = false;
      beginGesture();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      setGesture({
        kind: "move",
        id: element.id,
        pointerId: event.pointerId,
        start: point,
        origin: { x: element.x, y: element.y },
        size: { width: element.width, height: element.height },
        items,
        alignTargets: buildAlignTargets(
          scene.elements,
          new Set(items.map((item) => item.id))
        ),
      });
    },
    [activeTool, beginGesture, gesture, panGesture, scene.elements, selectedIds]
  );

  const beginResize = useCallback(
    (event, element) => {
      if (event.button !== 0) return;
      if (gesture || panGesture) return;
      event.stopPropagation();
      if (isFormField(document.activeElement)) document.activeElement.blur();
      const point = scenePoint(event, overlayRef);
      dragEngagedRef.current = false;
      beginGesture();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      setGesture({
        kind: "resize",
        id: element.id,
        pointerId: event.pointerId,
        start: point,
        origin: {
          width: element.width,
          height: element.height,
        },
      });
    },
    [beginGesture, gesture, panGesture]
  );

  const beginEndpoint = useCallback(
    (event, element, which) => {
      if (event.button !== 0) return;
      if (gesture || panGesture) return;
      event.stopPropagation();
      if (isFormField(document.activeElement)) document.activeElement.blur();
      dragEngagedRef.current = false;
      beginGesture();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      setGesture({
        kind: "endpoint",
        id: element.id,
        which,
        pointerId: event.pointerId,
        start: scenePoint(event, overlayRef),
      });
    },
    [beginGesture, gesture, panGesture]
  );

  const beginMidpoint = useCallback(
    (event, element) => {
      if (event.button !== 0) return;
      if (gesture || panGesture) return;
      event.stopPropagation();
      if (isFormField(document.activeElement)) document.activeElement.blur();
      dragEngagedRef.current = false;
      beginGesture();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      setGesture({
        kind: "midpoint",
        id: element.id,
        pointerId: event.pointerId,
        start: scenePoint(event, overlayRef),
      });
    },
    [beginGesture, gesture, panGesture]
  );

  const straightenSelected = useCallback(() => {
    if (!selected?.mid) return;
    const targetId = selected.id;
    commit((current) => ({
      ...current,
      elements: current.elements.map((element) => {
        if (element.id !== targetId) return element;
        const { mid: _mid, ...straight } = element;
        return straight;
      }),
    }));
  }, [commit, selected]);

  const beginConnector = useCallback(
    (event) => {
      if (event.button !== 0) return;
      if (gesture || panGesture) return;
      event.stopPropagation();
      if (isFormField(document.activeElement)) document.activeElement.blur();
      const point = scenePoint(event, overlayRef);
      const startTarget = bindableAt(
        scene,
        point,
        null,
        BIND_PROXIMITY_SCREEN_PX / zoom
      );
      const startDot = startTarget
        ? nearestAnchorDot(startTarget, point, ANCHOR_SNAP_SCREEN_PX / zoom)
        : null;
      const start = endpoint(point, startTarget, startDot?.anchor);
      event.currentTarget.setPointerCapture?.(event.pointerId);
      setGesture({
        kind: "connector",
        pointerId: event.pointerId,
        start,
        arrowEnd: activeTool !== "line",
      });
      setDraftConnector({ start, end: { x: point.x, y: point.y } });
    },
    [activeTool, gesture, panGesture, scene, zoom]
  );

  const onBlankPointerDown = useCallback(
    (event) => {
      if (event.button !== 0) return;
      if (gesture || panGesture) return;
      const point = scenePoint(event, overlayRef);
      if (activeTool === "select" || activeTool === "pick") {
        setEditingId(null);
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setGesture({
          kind: "marquee",
          pointerId: event.pointerId,
          start: point,
          additive: event.shiftKey,
          base: selectedIds,
        });
        return;
      }
      if (CONNECTION_TOOLS.has(activeTool)) {
        beginConnector(event);
        return;
      }
      addElement(activeTool, point, event.altKey);
    },
    [activeTool, addElement, beginConnector, gesture, panGesture, selectedIds]
  );

  const onElementPointerDown = useCallback(
    (event, element) => {
      if (event.button !== 0) return;
      if (gesture || panGesture) return;
      if (CONNECTION_TOOLS.has(activeTool)) {
        beginConnector(event);
        return;
      }
      if (SHAPE_TYPES.has(activeTool)) {
        event.stopPropagation();
        addElement(activeTool, scenePoint(event, overlayRef), event.altKey);
        return;
      }
      if (activeTool === "pick") {
        event.stopPropagation();
        setEditingId(null);
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setGesture({
          kind: "marquee",
          pointerId: event.pointerId,
          start: scenePoint(event, overlayRef),
          additive: event.shiftKey,
          base: selectedIds,
          clickTarget: element.id,
        });
        return;
      }
      beginMove(event, element);
    },
    [
      activeTool,
      addElement,
      beginConnector,
      beginMove,
      gesture,
      panGesture,
      selectedIds,
    ]
  );

  const onPointerMove = useCallback(
    (event) => {
      if (!gesture) {
        // With a connection tool armed, preview the bind target and its four
        // anchor points under the cursor before the drag starts.
        if (!panGesture && CONNECTION_TOOLS.has(activeTool)) {
          const point = scenePoint(event, overlayRef);
          const target = bindableAt(
            scene,
            point,
            null,
            BIND_PROXIMITY_SCREEN_PX / zoom
          );
          const dot = target
            ? nearestAnchorDot(target, point, ANCHOR_SNAP_SCREEN_PX / zoom)
            : null;
          setBindTargetId(target ? target.id : null);
          setBindAnchor(dot ? dot.anchor : null);
        }
        return;
      }
      if (gesture.pointerId !== event.pointerId) return;
      const point = scenePoint(event, overlayRef);

      // A gesture only starts mutating the scene once the pointer has clearly
      // travelled; a plain tap must never nudge or re-snap an element.
      if (
        !dragEngagedRef.current &&
        (gesture.kind === "move" ||
          gesture.kind === "resize" ||
          gesture.kind === "endpoint" ||
          gesture.kind === "midpoint")
      ) {
        const travelled =
          Math.hypot(point.x - gesture.start.x, point.y - gesture.start.y) *
          zoom;
        if (travelled < DRAG_ACTIVATION_SCREEN_PX) return;
        dragEngagedRef.current = true;
      }

      if (gesture.kind === "move") {
        const next = moveGesturePosition(
          gesture,
          point,
          scene,
          zoom,
          !event.altKey
        );
        setCenterGuides(next.guides);
        setAlignGuides(next.alignGuides);
        replace((current) => ({
          ...current,
          elements: moveElementsByGesture(current.elements, gesture, next),
        }));
      } else if (gesture.kind === "marquee") {
        const width = Math.abs(point.x - gesture.start.x);
        const height = Math.abs(point.y - gesture.start.y);
        if (Math.max(width, height) * zoom < 4) return;
        const rect = {
          x: Math.min(gesture.start.x, point.x),
          y: Math.min(gesture.start.y, point.y),
          width,
          height,
        };
        setMarquee(rect);
        const hits = scene.elements
          .filter((element) => {
            if (element.hidden || element.locked) return false;
            const bounds =
              element.type === "connector"
                ? connectorHitBounds(element, scene)
                : element.type === "text"
                  ? textVisualBounds(element)
                  : getElementBounds(element);
            return rectContainsBounds(rect, bounds);
          })
          .map((element) => element.id);
        const nextIds = gesture.additive
          ? [...new Set([...gesture.base, ...hits])]
          : hits;
        setSelectedIds((current) =>
          current.length === nextIds.length &&
          current.every((id, index) => id === nextIds[index])
            ? current
            : nextIds
        );
      } else if (gesture.kind === "resize") {
        replace((current) => ({
          ...current,
          elements: current.elements.map((element) =>
            element.id === gesture.id
              ? {
                  ...element,
                  ...resizeGestureDimensions(
                    gesture,
                    point,
                    element,
                    !event.altKey
                  ),
                }
              : element
          ),
        }));
      } else if (gesture.kind === "midpoint") {
        replace((current) => ({
          ...current,
          elements: midpointUpdate(
            current.elements,
            gesture.id,
            point,
            event.altKey,
            zoom
          ),
        }));
      } else if (gesture.kind === "endpoint") {
        const target = bindableAt(
          scene,
          point,
          gesture.id,
          BIND_PROXIMITY_SCREEN_PX / zoom
        );
        const dot = target
          ? nearestAnchorDot(target, point, ANCHOR_SNAP_SCREEN_PX / zoom)
          : null;
        setBindTargetId(target ? target.id : null);
        setBindAnchor(dot ? dot.anchor : null);
        replace((current) => ({
          ...current,
          elements: current.elements.map((element) =>
            element.id === gesture.id
              ? {
                  ...element,
                  [gesture.which]: endpoint(point, target, dot?.anchor),
                }
              : element
          ),
        }));
      } else if (gesture.kind === "connector") {
        const target = bindableAt(
          scene,
          point,
          null,
          BIND_PROXIMITY_SCREEN_PX / zoom
        );
        const dot = target
          ? nearestAnchorDot(target, point, ANCHOR_SNAP_SCREEN_PX / zoom)
          : null;
        setBindTargetId(target ? target.id : null);
        setBindAnchor(dot ? dot.anchor : null);
        setDraftConnector({
          start: gesture.start,
          end: endpoint(point, target, dot?.anchor),
        });
      }
    },
    [activeTool, gesture, panGesture, replace, scene, zoom]
  );

  const onPointerUp = useCallback(
    (event) => {
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      const point = scenePoint(event, overlayRef);
      setCenterGuides(NO_CENTER_GUIDES);
      setAlignGuides(NO_ALIGN_GUIDES);
      setBindTargetId(null);
      setBindAnchor(null);

      if (gesture.kind === "connector") {
        const target = bindableAt(
          scene,
          point,
          null,
          BIND_PROXIMITY_SCREEN_PX / zoom
        );
        const dot = target
          ? nearestAnchorDot(target, point, ANCHOR_SNAP_SCREEN_PX / zoom)
          : null;
        const end = endpoint(point, target, dot?.anchor);
        const distance = Math.hypot(point.x - gesture.start.x, point.y - gesture.start.y);
        if (distance > 5 || target) {
          const connector = createElement("connector", {
            start: gesture.start,
            end,
            route: "straight",
            stroke: "solid",
            arrowStart: false,
            arrowEnd: gesture.arrowEnd,
          });
          commit((current) => ({
            ...current,
            elements: [...current.elements, connector],
          }));
          setSelectedIds([connector.id]);
        }
        setDraftConnector(null);
        setActiveTool("select");
      } else if (gesture.kind === "marquee") {
        const dragged =
          Math.max(
            Math.abs(point.x - gesture.start.x),
            Math.abs(point.y - gesture.start.y)
          ) * zoom >= 4;
        if (!dragged) {
          if (gesture.clickTarget) {
            setSelectedIds((current) =>
              gesture.additive
                ? current.includes(gesture.clickTarget)
                  ? current.filter((id) => id !== gesture.clickTarget)
                  : [...current, gesture.clickTarget]
                : [gesture.clickTarget]
            );
          } else if (!gesture.additive) {
            setSelectedIds([]);
          }
        }
        setMarquee(null);
      } else if (gesture.kind === "endpoint") {
        if (dragEngagedRef.current) {
          const target = bindableAt(
            scene,
            point,
            gesture.id,
            BIND_PROXIMITY_SCREEN_PX / zoom
          );
          const dot = target
            ? nearestAnchorDot(target, point, ANCHOR_SNAP_SCREEN_PX / zoom)
            : null;
          replace((current) => ({
            ...current,
            elements: current.elements.map((element) =>
              element.id === gesture.id
                ? {
                    ...element,
                    [gesture.which]: endpoint(point, target, dot?.anchor),
                  }
                : element
            ),
          }));
        }
        finishGesture();
      } else if (gesture.kind === "midpoint") {
        if (dragEngagedRef.current) {
          replace((current) => ({
            ...current,
            elements: midpointUpdate(
              current.elements,
              gesture.id,
              point,
              event.altKey,
              zoom
            ),
          }));
        }
        finishGesture();
      } else if (gesture.kind === "resize") {
        if (dragEngagedRef.current) {
          replace((current) => ({
            ...current,
            elements: current.elements.map((element) =>
              element.id === gesture.id
                ? {
                    ...element,
                    ...resizeGestureDimensions(
                      gesture,
                      point,
                      element,
                      !event.altKey
                    ),
                  }
                : element
            ),
          }));
        }
        finishGesture();
      } else if (gesture.kind === "move") {
        if (dragEngagedRef.current) {
          const next = moveGesturePosition(
            gesture,
            point,
            scene,
            zoom,
            !event.altKey
          );
          replace((current) => ({
            ...current,
            elements: moveElementsByGesture(current.elements, gesture, next),
          }));
        } else if (gesture.items.length > 1) {
          setSelectedIds([gesture.id]);
        }
        finishGesture();
      } else {
        finishGesture();
      }
      setGesture(null);
      dragEngagedRef.current = false;
    },
    [commit, finishGesture, gesture, replace, scene, zoom]
  );

  const cancelActiveGesture = useCallback(() => {
    if (gesture?.kind !== "connector") cancelGesture();
    setGesture(null);
    setCenterGuides(NO_CENTER_GUIDES);
    setAlignGuides(NO_ALIGN_GUIDES);
    setDraftConnector(null);
    setMarquee(null);
    setBindTargetId(null);
    setBindAnchor(null);
    dragEngagedRef.current = false;
  }, [cancelGesture, gesture]);

  // The hover preview of bind anchors only belongs to the connection tools.
  useEffect(() => {
    if (CONNECTION_TOOLS.has(activeTool)) return;
    setBindTargetId((current) => (current === null ? current : null));
    setBindAnchor((current) => (current === null ? current : null));
  }, [activeTool]);

  const beginInlineEdit = useCallback(
    (event, element) => {
      if (gesture || panGesture) return;
      if (!("text" in element) || element.locked) return;
      event.stopPropagation();
      setSelectedIds([element.id]);
      beginGesture();
      setEditingId(element.id);
      requestAnimationFrame(() => inlineRef.current?.focus());
    },
    [beginGesture, gesture, panGesture]
  );

  const finishInlineEdit = useCallback(() => {
    setEditingId(null);
    finishGesture();
  }, [finishGesture]);

  const onWorkspacePointerDownCapture = useCallback((event) => {
    if (gesture || panGesture) return;
    if (event.button !== 1 && !spaceRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setPanGesture({
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      origin: pan,
    });
  }, [gesture, pan, panGesture]);

  const onWorkspacePointerMove = useCallback(
    (event) => {
      if (!panGesture || panGesture.pointerId !== event.pointerId) return;
      setPan({
        x: panGesture.origin.x + event.clientX - panGesture.start.x,
        y: panGesture.origin.y + event.clientY - panGesture.start.y,
      });
    },
    [panGesture]
  );

  const onWorkspacePointerUp = useCallback(
    (event) => {
      if (panGesture?.pointerId === event.pointerId) setPanGesture(null);
    },
    [panGesture]
  );

  const onWheel = useCallback(
    (event) => {
      event.preventDefault();
      if (gesture || panGesture) return;
      if (event.ctrlKey || event.metaKey) {
        const next = clamp(zoom * (event.deltaY < 0 ? 1.08 : 0.92), 0.2, 2.5);
        if (next === zoom) return;
        const workspace = workspaceRef.current;
        if (workspace) {
          // Shift the pan so the scene point under the cursor stays put.
          const bounds = workspace.getBoundingClientRect();
          const offsetX =
            event.clientX - bounds.left - bounds.width / 2 - pan.x;
          const offsetY =
            event.clientY - bounds.top - bounds.height / 2 - pan.y;
          const shift = 1 - next / zoom;
          setPan({ x: pan.x + offsetX * shift, y: pan.y + offsetY * shift });
        }
        setZoom(next);
      } else {
        setPan((current) => ({
          x: current.x - event.deltaX,
          y: current.y - event.deltaY,
        }));
      }
    },
    [gesture, pan, panGesture, zoom]
  );

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData(DRAG_MIME);
      if (!PALETTE.some((item) => item.type === type)) return;
      const point = scenePoint(event, overlayRef);
      if (CONNECTION_TOOLS.has(type)) setActiveTool(type);
      else addElement(type, point, event.altKey);
    },
    [addElement]
  );

  const createNew = useCallback(async () => {
    if (transitionRef.current) return;
    const requested = window.prompt("Diagram file name", "new-diagram");
    if (requested === null) return;
    const name = requested
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!name) {
      notify("Use at least one letter or number");
      return;
    }
    if (diagramFiles.includes(name)) {
      notify(`${name}.json already exists`);
      return;
    }
    if (!beginTransition()) return;

    try {
      if (!(await flushActiveFile())) return;
      const nextScene =
        !activeFile && (orphanRecoveryRef.current || scene.elements.length)
        ? sanitizeScene({ ...scene, name }, scene)
        : createScene({
            name,
            title: titleFromSlug(name),
            description: `The ${titleFromSlug(name)} blog diagram.`,
          });
      setSaveState(`creating ${name}…`);
      await persistDiagram(name, nextScene, { ifAbsent: true });
      const files = [...diagramFiles, name].sort((a, b) => a.localeCompare(b));
      activeFileRef.current = name;
      latestSceneRef.current = nextScene;
      setDiagramFiles(files);
      setActiveFile(name);
      reset(nextScene);
      setSelectedIds([]);
      setEditingId(null);
      localStorage.setItem(FILE_SELECTION_KEY, name);
      localStorage.setItem(RECOVERY_FILE_KEY, name);
      localStorage.setItem(RECOVERY_BASE_KEY, serializeScene(nextScene));
      orphanRecoveryRef.current = null;
      setOrphanRecovery(null);
      setSaveState(`saved · ${name}.json`);
      notify(`Created mds/diagrams/${name}.json`);
    } catch (error) {
      setSaveState("could not create diagram");
      notify(`Could not create ${name}: ${error.message}`);
    } finally {
      endTransition();
    }
  }, [
    activeFile,
    beginTransition,
    diagramFiles,
    endTransition,
    flushActiveFile,
    notify,
    persistDiagram,
    reset,
    scene,
  ]);

  const restoreOrphanRecovery = useCallback(async () => {
    const recovery = orphanRecoveryRef.current;
    if (!recovery || !beginTransition()) return;
    const { name } = recovery;
    const recoveryScene = latestSceneRef.current;
    const recoverySignature = serializeScene(recoveryScene);
    setSaveState(`restoring ${name}.json…`);

    try {
      await persistDiagram(name, recoveryScene, { ifAbsent: true });
      const files = [...new Set([...diagramFiles, name])].sort((a, b) =>
        a.localeCompare(b)
      );
      activeFileRef.current = name;
      latestSceneRef.current = recoveryScene;
      setDiagramFiles(files);
      setActiveFile(name);
      reset(recoveryScene);
      setSelectedIds([]);
      setEditingId(null);
      localStorage.setItem(FILE_SELECTION_KEY, name);
      localStorage.setItem(RECOVERY_FILE_KEY, name);
      localStorage.setItem(RECOVERY_BASE_KEY, recoverySignature);
      orphanRecoveryRef.current = null;
      setOrphanRecovery(null);
      setSaveState(`saved · ${name}.json`);
      notify(`Restored ${name}.json`);
    } catch (error) {
      if (error.status === 409) {
        try {
          const disk = await fetchDiskDiagram(name);
          persistedSignaturesRef.current.set(name, disk.signature);
          persistedRevisionsRef.current.set(name, disk.revision);
          const conflict = { name };
          activeFileRef.current = name;
          setActiveFile(name);
          setDiagramFiles((current) =>
            [...new Set([...current, name])].sort((a, b) => a.localeCompare(b))
          );
          localStorage.setItem(FILE_SELECTION_KEY, name);
          localStorage.setItem(RECOVERY_FILE_KEY, name);
          orphanRecoveryRef.current = null;
          setOrphanRecovery(null);
          saveConflictRef.current = conflict;
          setSaveConflict(conflict);
          setSaveState("save conflict");
          notify(`${name}.json reappeared · choose which version to keep`);
          return;
        } catch (readError) {
          notify(`Could not inspect ${name}: ${readError.message}`);
          return;
        }
      }
      notify(`Could not restore ${name}: ${error.message}`);
    } finally {
      endTransition();
    }
  }, [
    beginTransition,
    diagramFiles,
    endTransition,
    fetchDiskDiagram,
    notify,
    persistDiagram,
    reset,
  ]);

  const discardOrphanRecovery = useCallback(async () => {
    const recovery = orphanRecoveryRef.current;
    if (!recovery) return;
    if (!window.confirm(`Discard the local recovery for ${recovery.name}.json?`))
      return;

    orphanRecoveryRef.current = null;
    setOrphanRecovery(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(FILE_SELECTION_KEY);
    localStorage.removeItem(RECOVERY_FILE_KEY);
    localStorage.removeItem(RECOVERY_BASE_KEY);
    notify(`Discarded the ${recovery.name}.json recovery`);

    const first = diagramFiles[0];
    if (first) {
      await openDiagram(first, { saveCurrent: false });
      return;
    }

    const blank = newBlankScene();
    activeFileRef.current = "";
    latestSceneRef.current = blank;
    setActiveFile("");
    reset(blank);
    setSaveState("no saved diagrams");
  }, [diagramFiles, notify, openDiagram, reset]);

  const importScene = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      try {
        const raw = validateSceneDocument(JSON.parse(await file.text()));
        commit(sanitizeScene(raw));
        setSelectedIds([]);
        notify("Diagram imported");
        requestAnimationFrame(fitCanvas);
      } catch (error) {
        notify(`Could not import: ${error.message}`);
      }
    },
    [commit, fitCanvas, notify]
  );

  const copyFence = useCallback(async () => {
    const held = activeFile ? beginTransition() : false;
    if (activeFile && !held) return;
    try {
      if (activeFile && !(await flushActiveFile())) return;
      await writeClipboard(activeFile ? makeFileFence(activeFile) : makeFence(scene));
      notify(activeFile ? "Markdown file reference copied" : "Markdown fence copied");
    } catch {
      notify("Clipboard permission was denied");
    } finally {
      if (held) endTransition();
    }
  }, [
    activeFile,
    beginTransition,
    endTransition,
    flushActiveFile,
    notify,
    scene,
  ]);

  const exportJson = useCallback(() => {
    const filename = `${scene.name || "diagram"}.diagram.json`;
    downloadText(filename, serializeScene(scene, 2));
    notify("JSON downloaded");
  }, [notify, scene]);

  useEffect(() => {
    const keydown = (event) => {
      if (transitionRef.current) return;
      if (isFormField(event.target)) return;
      if (event.code === "Space") {
        spaceRef.current = true;
        return;
      }
      const mod = event.metaKey || event.ctrlKey;
      if (event.key === "Escape") {
        const selectionTool = activeTool === "select" || activeTool === "pick";
        const busy =
          Boolean(editingId || gesture || panGesture) || !selectionTool;
        if (editingId) finishInlineEdit();
        cancelActiveGesture();
        setPanGesture(null);
        if (!selectionTool) setActiveTool("select");
        if (!busy) setSelectedIds([]);
        return;
      }
      if (gesture || panGesture) {
        if (
          mod ||
          event.key === "Delete" ||
          event.key === "Backspace" ||
          NUDGE_BY_KEY[event.key] ||
          TOOL_KEYS[event.key.toLowerCase()]
        ) event.preventDefault();
        return;
      }
      if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setSelectedIds(
          scene.elements
            .filter((element) => !element.hidden && !element.locked)
            .map((element) => element.id)
        );
        setActiveTool("select");
        return;
      }
      if (mod && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelected();
        return;
      }
      if (mod && event.key.toLowerCase() === "c") {
        const count = copySelected();
        if (count) {
          event.preventDefault();
          notify(`Copied ${count} element${count === 1 ? "" : "s"}`);
        }
        return;
      }
      if (mod && event.key.toLowerCase() === "x") {
        const count = copySelected();
        if (count) {
          event.preventDefault();
          removeSelected();
          notify(`Cut ${count} element${count === 1 ? "" : "s"}`);
        }
        return;
      }
      if (mod && event.key.toLowerCase() === "v") {
        event.preventDefault();
        pasteClipboard();
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        removeSelected();
        return;
      }
      const direction = NUDGE_BY_KEY[event.key];
      if (direction && selectedElements.some((element) => !element.locked)) {
        event.preventDefault();
        const amount = event.shiftKey ? 8 : 1;
        const dx = direction.x * amount;
        const dy = direction.y * amount;
        commit((current) =>
          sanitizeScene(
            {
              ...current,
              elements: current.elements.map((element) => {
                if (!selectedIdSet.has(element.id) || element.locked)
                  return element;
                if (element.type === "connector")
                  return {
                    ...element,
                    start: {
                      ...element.start,
                      x: element.start.x + dx,
                      y: element.start.y + dy,
                    },
                    end: {
                      ...element.end,
                      x: element.end.x + dx,
                      y: element.end.y + dy,
                    },
                    ...(element.mid
                      ? {
                          mid: {
                            x: element.mid.x + dx,
                            y: element.mid.y + dy,
                          },
                        }
                      : {}),
                  };
                return { ...element, x: element.x + dx, y: element.y + dy };
              }),
            },
            current
          )
        );
        return;
      }
      if (!mod && !event.altKey && TOOL_KEYS[event.key.toLowerCase()]) {
        setActiveTool(TOOL_KEYS[event.key.toLowerCase()]);
      }
    };
    const keyup = (event) => {
      if (event.code === "Space") spaceRef.current = false;
    };
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
    };
  }, [
    activeTool,
    cancelActiveGesture,
    commit,
    copySelected,
    duplicateSelected,
    editingId,
    finishInlineEdit,
    gesture,
    notify,
    panGesture,
    pasteClipboard,
    redo,
    removeSelected,
    scene.elements,
    selectedElements,
    selectedIdSet,
    undo,
  ]);

  const selectionBounds = selected && !selected.hidden && selected.type !== "connector"
    ? getElementBounds(selected)
    : null;
  const resolvedSelected = selected?.type === "connector" && !selected.hidden
    ? resolveConnector(selected, scene)
    : null;
  const draftPath = draftConnector
    ? resolveConnector(
        {
          start: draftConnector.start,
          end: draftConnector.end,
          route: "straight",
        },
        scene
      ).path
    : "";
  const bindTarget = bindTargetId
    ? scene.elements.find(
        (element) => element.id === bindTargetId && !element.hidden
      ) || null
    : null;
  const bindTargetBounds = bindTarget ? getElementBounds(bindTarget) : null;
  const editBounds = editingId && selected?.id === editingId && !selected.hidden
    ? getElementBounds(selected)
    : null;

  return (
    <div
      className="diagram-editor"
      data-theme={theme}
      data-tool={activeTool}
      aria-busy={isTransitioning}
    >
      {isTransitioning && (
        <div className="diagram-editor__transition-shield" role="status">
          {saveState}
        </div>
      )}
      <header className="diagram-editor__topbar">
        <div className="diagram-editor__identity">
          <strong>diagram workbench</strong>
          <span>{saveState}</span>
        </div>

        {saveConflict?.name === activeFile && (
          <div className="diagram-editor__conflict" role="alert">
            <span>{activeFile}.json changed on disk</span>
            <button
              type="button"
              className="diagram-editor__conflict-action"
              onClick={keepLocalAfterConflict}
            >
              keep local
            </button>
            <button
              type="button"
              className="diagram-editor__conflict-action"
              onClick={useDiskAfterConflict}
            >
              use disk
            </button>
          </div>
        )}

        {orphanRecovery && (
          <div className="diagram-editor__conflict" role="alert">
            <span>{orphanRecovery.name}.json recovery is open</span>
            <button
              type="button"
              className="diagram-editor__conflict-action"
              onClick={restoreOrphanRecovery}
            >
              restore file
            </button>
            <button
              type="button"
              className="diagram-editor__conflict-action"
              onClick={discardOrphanRecovery}
            >
              discard
            </button>
          </div>
        )}

        <div className="diagram-editor__toolbar diagram-editor__toolbar--center">
          <ToolButton
            name="select"
            label="Select"
            shortcut="V"
            active={activeTool === "select"}
            onClick={() => setActiveTool("select")}
          />
          <ToolButton
            name="pick"
            label="Select only · never moves elements"
            shortcut="S"
            active={activeTool === "pick"}
            onClick={() => setActiveTool("pick")}
          />
          <ToolButton
            name="text"
            label="Text"
            shortcut="T"
            active={activeTool === "text"}
            onClick={() => setActiveTool("text")}
          />
          <ToolButton
            name="connector"
            label="Connector"
            shortcut="A"
            active={activeTool === "connector"}
            onClick={() => setActiveTool("connector")}
          />
          <ToolButton
            name="line"
            label="Line"
            shortcut="L"
            active={activeTool === "line"}
            onClick={() => setActiveTool("line")}
          />
          <span className="diagram-editor__separator" />
          <button
            type="button"
            className="diagram-editor__tool"
            aria-label="Undo"
            title="Undo · ⌘Z"
            disabled={!canUndo}
            onClick={undo}
          >
            <Icon name="undo" />
          </button>
          <button
            type="button"
            className="diagram-editor__tool"
            aria-label="Redo"
            title="Redo · ⇧⌘Z"
            disabled={!canRedo}
            onClick={redo}
          >
            <Icon name="redo" />
          </button>
        </div>

        <div className="diagram-editor__toolbar">
          <button
            type="button"
            className="diagram-editor__button"
            onClick={createNew}
          >
            new
          </button>
          <button
            type="button"
            className="diagram-editor__button"
            onClick={() => importRef.current?.click()}
          >
            import
          </button>
          <button
            type="button"
            className="diagram-editor__button"
            onClick={exportJson}
          >
            JSON
          </button>
          <button
            type="button"
            className="diagram-editor__button diagram-editor__button--primary"
            onClick={copyFence}
          >
            copy reference
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={importScene}
          />
        </div>
      </header>

      <div className="diagram-editor__body">
        <aside className="diagram-editor__palette">
          <div className="diagram-editor__panel-heading">
            <h2 className="diagram-editor__panel-title">Diagrams</h2>
            <span>{diagramFiles.length}</span>
          </div>
          <div className="diagram-editor__file-list" aria-label="Saved diagrams">
            {diagramFiles.map((name) => (
              <button
                key={name}
                type="button"
                className="diagram-editor__file"
                aria-pressed={activeFile === name}
                title={`mds/diagrams/${name}.json`}
                onClick={() => openDiagram(name)}
              >
                <span className="diagram-editor__file-mark" aria-hidden="true" />
                <span className="diagram-editor__file-name">{name}</span>
              </button>
            ))}
            {!diagramFiles.length && (
              <p className="diagram-editor__library-empty">
                {libraryState === "loading"
                  ? "reading files…"
                  : libraryState === "error"
                    ? "library unavailable"
                    : "no diagrams yet"}
              </p>
            )}
          </div>
          <div className="diagram-editor__panel-divider" />
          <h2 className="diagram-editor__panel-title">Components</h2>
          <div className="diagram-editor__palette-list">
            {PALETTE.map((item) => (
              <button
                key={item.type}
                type="button"
                draggable
                aria-pressed={activeTool === item.type}
                className="diagram-editor__palette-item"
                onClick={() => setActiveTool(item.type)}
                onDragStart={(event) => {
                  event.dataTransfer.setData(DRAG_MIME, item.type);
                  event.dataTransfer.effectAllowed = "copy";
                }}
              >
                <PalettePreview type={item.type} />
                <span>
                  <span className="diagram-editor__palette-label">
                    {item.label} · {item.key}
                  </span>
                  <span className="diagram-editor__palette-copy">{item.copy}</span>
                </span>
              </button>
            ))}
          </div>
          <p className="diagram-editor__hint">
            Drag a component onto the slab, or choose it and click. Shift-click
            or drag on empty canvas to select several elements. Hold Alt to
            ignore snapping. Double-click any label to write in place.
          </p>
        </aside>

        <main
          ref={workspaceRef}
          className="diagram-editor__workspace"
          data-panning={Boolean(panGesture)}
          onPointerDownCapture={onWorkspacePointerDownCapture}
          onPointerMove={onWorkspacePointerMove}
          onPointerUp={onWorkspacePointerUp}
          onPointerCancel={onWorkspacePointerUp}
          onWheel={onWheel}
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
        >
          <div
            className="diagram-editor__stage"
            style={{
              width: scene.width,
              height: scene.height,
              transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            <DiagramShell
              theme={theme}
              label={scene.title || "Diagram editor canvas"}
              scrollable={false}
            >
              <DiagramSceneSvg scene={scene}>
                <g
                  ref={overlayRef}
                  data-editor-only="true"
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={cancelActiveGesture}
                  onPointerLeave={() => {
                    if (gesture) return;
                    setBindTargetId(null);
                    setBindAnchor(null);
                  }}
                >
                  <rect
                    x="0"
                    y="0"
                    width={scene.width}
                    height={scene.height}
                    fill="transparent"
                    onPointerDown={onBlankPointerDown}
                  />

                  {(centerGuides.vertical || centerGuides.horizontal) && (
                    <g className="diagram-editor__center-guides" aria-hidden="true">
                      {centerGuides.vertical && (
                        <line
                          x1={scene.width / 2}
                          y1="0"
                          x2={scene.width / 2}
                          y2={scene.height}
                          data-center-guide="vertical"
                        />
                      )}
                      {centerGuides.horizontal && (
                        <line
                          x1="0"
                          y1={scene.height / 2}
                          x2={scene.width}
                          y2={scene.height / 2}
                          data-center-guide="horizontal"
                        />
                      )}
                    </g>
                  )}

                  {alignGuides.length > 0 && (
                    <g className="diagram-editor__align-guides" aria-hidden="true">
                      {alignGuides.map((guide) => (
                        <line
                          key={`${guide.axis}-${guide.value}`}
                          x1={guide.axis === "v" ? guide.value : guide.from}
                          y1={guide.axis === "v" ? guide.from : guide.value}
                          x2={guide.axis === "v" ? guide.value : guide.to}
                          y2={guide.axis === "v" ? guide.to : guide.value}
                        />
                      ))}
                    </g>
                  )}

                  {scene.elements.map((element) => {
                    if (element.hidden) return null;
                    if (element.type === "connector") {
                      const path = resolveConnector(element, scene).path;
                      return (
                        <path
                          key={element.id}
                          d={path}
                          className="diagram-editor__connector-hit"
                          onPointerDown={(event) => onElementPointerDown(event, element)}
                          onDoubleClick={(event) => beginInlineEdit(event, element)}
                        />
                      );
                    }
                    const bounds = getElementBounds(element);
                    return (
                      <rect
                        key={element.id}
                        x={bounds.x}
                        y={bounds.y}
                        width={bounds.width}
                        height={bounds.height}
                        rx={element.type === "ellipse" ? bounds.height / 2 : 4}
                        className={`diagram-editor__element-hit${
                          element.locked ? " diagram-editor__element-hit--locked" : ""
                        }`}
                        onPointerDown={(event) => onElementPointerDown(event, element)}
                        onDoubleClick={(event) => beginInlineEdit(event, element)}
                      />
                    );
                  })}

                  {selectedElements.map((element) => {
                    if (element.hidden) return null;
                    if (element.type === "connector")
                      return (
                        <path
                          key={`selection-${element.id}`}
                          d={resolveConnector(element, scene).path}
                          className="diagram-editor__selection"
                        />
                      );
                    const bounds = getElementBounds(element);
                    return (
                      <rect
                        key={`selection-${element.id}`}
                        x={bounds.x - 5}
                        y={bounds.y - 5}
                        width={bounds.width + 10}
                        height={bounds.height + 10}
                        rx="7"
                        className="diagram-editor__selection"
                      />
                    );
                  })}

                  {selectionBounds && !selected.locked && activeTool !== "pick" && (
                    <rect
                      x={selectionBounds.x + selectionBounds.width - 3}
                      y={selectionBounds.y + selectionBounds.height - 3}
                      width="10"
                      height="10"
                      rx="2"
                      className="diagram-editor__handle"
                      onPointerDown={(event) => beginResize(event, selected)}
                    />
                  )}

                  {selected?.type === "connector" &&
                    activeTool !== "pick" &&
                    !selected.locked &&
                    resolvedSelected?.start &&
                    resolvedSelected?.end && (
                      <>
                        <circle
                          cx={resolvedSelected.start.x}
                          cy={resolvedSelected.start.y}
                          r="6"
                          className="diagram-editor__handle diagram-editor__handle--point"
                          onPointerDown={(event) =>
                            beginEndpoint(event, selected, "start")
                          }
                        />
                        <circle
                          cx={resolvedSelected.end.x}
                          cy={resolvedSelected.end.y}
                          r="6"
                          className="diagram-editor__handle diagram-editor__handle--point"
                          onPointerDown={(event) =>
                            beginEndpoint(event, selected, "end")
                          }
                        />
                        <circle
                          cx={selected.mid?.x ?? resolvedSelected.midpoint.x}
                          cy={selected.mid?.y ?? resolvedSelected.midpoint.y}
                          r="5"
                          className="diagram-editor__handle diagram-editor__handle--mid"
                          data-bent={selected.mid ? "true" : undefined}
                          onPointerDown={(event) =>
                            beginMidpoint(event, selected)
                          }
                          onDoubleClick={(event) => {
                            event.stopPropagation();
                            straightenSelected();
                          }}
                        />
                      </>
                    )}

                  {marquee && (
                    <rect
                      x={marquee.x}
                      y={marquee.y}
                      width={marquee.width}
                      height={marquee.height}
                      className="diagram-editor__marquee"
                    />
                  )}

                  {bindTargetBounds && (
                    <rect
                      x={bindTargetBounds.x - 4}
                      y={bindTargetBounds.y - 4}
                      width={bindTargetBounds.width + 8}
                      height={bindTargetBounds.height + 8}
                      rx={
                        bindTarget.type === "ellipse"
                          ? bindTargetBounds.height / 2 + 4
                          : 8
                      }
                      className="diagram-editor__bind-target"
                    />
                  )}

                  {bindTarget && (
                    <g className="diagram-editor__anchors" aria-hidden="true">
                      {anchorDots(bindTarget).map((dot) => (
                        <circle
                          key={dot.anchor}
                          cx={dot.x}
                          cy={dot.y}
                          r={bindAnchor === dot.anchor ? 6 : 4}
                          className="diagram-editor__anchor"
                          data-active={
                            bindAnchor === dot.anchor ? "true" : undefined
                          }
                        />
                      ))}
                    </g>
                  )}

                  {draftPath && (
                    <path d={draftPath} className="diagram-editor__draft-connector" />
                  )}

                  {editBounds && selected && (
                    <foreignObject
                      x={editBounds.x + 5}
                      y={
                        selected.labelPosition === "top"
                          ? editBounds.y + 7
                          : editBounds.y + Math.max(5, editBounds.height / 2 - 22)
                      }
                      width={Math.max(40, editBounds.width - 10)}
                      height={Math.min(54, Math.max(34, editBounds.height - 10))}
                    >
                      <textarea
                        ref={inlineRef}
                        xmlns="http://www.w3.org/1999/xhtml"
                        className="diagram-editor__inline-editor"
                        value={selected.text || ""}
                        onPointerDown={(event) => event.stopPropagation()}
                        onChange={(event) =>
                          patchSelected({ text: event.target.value }, false)
                        }
                        onBlur={finishInlineEdit}
                        onKeyDown={(event) => {
                          if (event.key === "Escape" || (event.key === "Enter" && (event.metaKey || event.ctrlKey)))
                            event.currentTarget.blur();
                        }}
                      />
                    </foreignObject>
                  )}
                </g>
              </DiagramSceneSvg>
            </DiagramShell>
          </div>

          {!scene.elements.length && (
            <div className="diagram-editor__empty-note">
              Drag a region or node onto the slab. Add labels in place, then draw
              connectors between elements. Named diagrams save to disk as you work.
            </div>
          )}

          <div className="diagram-editor__status">
            <button
              type="button"
              className="diagram-editor__icon-button"
              aria-label="Zoom out"
              disabled={Boolean(gesture || panGesture)}
              onClick={() => setZoom((value) => clamp(value / 1.15, 0.2, 2.5))}
            >
              <Icon name="minus" />
            </button>
            <button
              type="button"
              className="diagram-editor__zoom diagram-editor__icon-button"
              disabled={Boolean(gesture || panGesture)}
              onClick={fitCanvas}
              title="Fit canvas"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              className="diagram-editor__icon-button"
              aria-label="Zoom in"
              disabled={Boolean(gesture || panGesture)}
              onClick={() => setZoom((value) => clamp(value * 1.15, 0.2, 2.5))}
            >
              <Icon name="plus" />
            </button>
          </div>
          <div className="diagram-editor__breadcrumbs">
            wheel to pan · ⌘ wheel to zoom · space drag
          </div>
          {toast && <div className="diagram-editor__toast">{toast}</div>}
        </main>

        <aside className="diagram-editor__sidebar">
          <LayerPanel
            elements={scene.elements}
            selectedIds={selectedIds}
            onSelect={(elementId, event) => {
              setEditingId(null);
              setActiveTool("select");
              setSelectedIds((current) =>
                event?.shiftKey
                  ? current.includes(elementId)
                    ? current.filter((id) => id !== elementId)
                    : [...current, elementId]
                  : [elementId]
              );
            }}
            onToggleVisibility={toggleElementVisibility}
            onArrange={arrangeElements}
            onRemove={removeElements}
          />
          <Inspector
            scene={scene}
            selected={selected}
            selectionCount={selectedElements.length}
            patchScene={patchScene}
            patchElement={patchSelected}
            beginField={beginGesture}
            finishField={finishGesture}
            duplicate={duplicateSelected}
            remove={removeSelected}
            arrange={arrangeSelected}
          />
        </aside>
      </div>
    </div>
  );
}
