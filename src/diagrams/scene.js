export const SCENE_VERSION = 1;

const SHAPE_TYPES = new Set(["frame", "box", "pill", "ellipse", "text"]);
const ELEMENT_TYPES = new Set([...SHAPE_TYPES, "connector"]);
const FILL_ROLES = new Set(["none", "soft", "mid", "strong"]);
const SHAPE_STROKES = new Set(["solid", "dashed", "none"]);
const CONNECTOR_STROKES = new Set(["solid", "dashed"]);
const TEXT_ROLES = new Set(["title", "subtitle", "label", "micro", "caption"]);
const ALIGNMENTS = new Set(["left", "center", "right"]);
const LABEL_POSITIONS = new Set(["center", "top"]);
const ROUTES = new Set(["straight", "elbow"]);
const ANCHORS = new Set(["auto", "top", "right", "bottom", "left", "center"]);

const MAX_ELEMENTS = 500;
const DEFAULT_WIDTH = 960;
const DEFAULT_HEIGHT = 600;

const DEFAULT_SCENE = Object.freeze({
  version: SCENE_VERSION,
  name: "untitled",
  title: "Untitled diagram",
  description: "An empty blog diagram.",
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
  frame: true,
  grid: true,
  elements: Object.freeze([]),
});

const SHAPE_DEFAULTS = Object.freeze({
  frame: Object.freeze({ width: 320, height: 200, fill: "none", radius: 20 }),
  box: Object.freeze({ width: 180, height: 88, fill: "soft", radius: 14 }),
  pill: Object.freeze({ width: 140, height: 42, fill: "strong", radius: 21 }),
  ellipse: Object.freeze({ width: 150, height: 90, fill: "mid", radius: 0 }),
  text: Object.freeze({ width: 220, height: 40, fill: "none", radius: 0 }),
});

let elementSequence = 0;

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function finite(value, fallback, minimum, maximum) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function numberOr(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function finitePoint(value, fallback, sceneSize) {
  return finite(value, fallback, -sceneSize * 4, sceneSize * 5);
}

function boolean(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

function oneOf(value, allowed, fallback) {
  return allowed.has(value) ? value : fallback;
}

function cleanText(value, fallback = "", maximum = 1_000) {
  if (typeof value !== "string") return fallback;
  return value.replace(/\r\n?/g, "\n").slice(0, maximum);
}

function cleanId(value, fallback) {
  const cleaned = cleanText(value, "", 80)
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || fallback;
}

function uniqueId(id, usedIds) {
  if (!usedIds.has(id)) {
    usedIds.add(id);
    return id;
  }

  let suffix = 2;
  while (usedIds.has(`${id}-${suffix}`)) suffix += 1;
  const next = `${id}-${suffix}`;
  usedIds.add(next);
  return next;
}

export function createElementId(type = "element") {
  const prefix = ELEMENT_TYPES.has(type) ? type : "element";
  elementSequence += 1;

  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID().slice(0, 8)}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${elementSequence.toString(36)}`;
}

function sanitizeBind(value, fallbackElementId = "") {
  const source = typeof value === "string" ? { elementId: value } : value;
  if (!isRecord(source)) return undefined;

  const elementId = cleanId(source.elementId, fallbackElementId);
  if (!elementId) return undefined;

  return {
    elementId,
    anchor: oneOf(source.anchor, ANCHORS, "auto"),
    gap: finite(source.gap, 0, 0, 240),
  };
}

function sanitizeEndpoint(value, fallback, width, height) {
  const source = isRecord(value) ? value : {};
  const bind = sanitizeBind(source.bind);
  const endpoint = {
    x: finitePoint(source.x, fallback.x, width),
    y: finitePoint(source.y, fallback.y, height),
  };

  if (bind) endpoint.bind = bind;
  return endpoint;
}

function sanitizeMidpoint(value, width, height) {
  if (!isRecord(value)) return undefined;
  return {
    x: finitePoint(value.x, 0, width),
    y: finitePoint(value.y, 0, height),
  };
}

function sanitizeElement(value, index = 0, sceneSize = {}) {
  if (!isRecord(value) || !ELEMENT_TYPES.has(value.type)) return null;

  const width = finite(sceneSize.width, DEFAULT_WIDTH, 240, 2_400);
  const height = finite(sceneSize.height, DEFAULT_HEIGHT, 180, 1_800);
  const type = value.type;
  const id = cleanId(value.id, `${type}-${index + 1}`);

  if (type === "connector") {
    return {
      id,
      type,
      start: sanitizeEndpoint(value.start, { x: 120, y: 120 }, width, height),
      end: sanitizeEndpoint(value.end, { x: 300, y: 120 }, width, height),
      mid: sanitizeMidpoint(value.mid, width, height),
      route: oneOf(value.route, ROUTES, "straight"),
      stroke: oneOf(value.stroke, CONNECTOR_STROKES, "solid"),
      arrowStart: boolean(value.arrowStart, false),
      arrowEnd: boolean(value.arrowEnd, true),
      text: cleanText(value.text, "", 300),
      opacity: finite(value.opacity, 1, 0, 1),
      locked: boolean(value.locked, false),
      hidden: boolean(value.hidden, false) || undefined,
    };
  }

  const defaults = SHAPE_DEFAULTS[type];
  const elementWidth = finite(value.width, defaults.width, 1, width * 4);
  const elementHeight = finite(value.height, defaults.height, 1, height * 4);
  const defaultStroke = type === "text" ? "none" : "solid";

  return {
    id,
    type,
    x: finitePoint(value.x, 80, width),
    y: finitePoint(value.y, 80, height),
    width: elementWidth,
    height: elementHeight,
    text: cleanText(value.text, "", 1_000),
    fill: oneOf(value.fill, FILL_ROLES, defaults.fill),
    stroke: oneOf(value.stroke, SHAPE_STROKES, defaultStroke),
    textRole: oneOf(value.textRole, TEXT_ROLES, "label"),
    fontSize: finite(value.fontSize, 0, 1, 120) || undefined,
    align: oneOf(value.align, ALIGNMENTS, "center"),
    labelPosition: oneOf(value.labelPosition, LABEL_POSITIONS, "center"),
    radius: finite(value.radius, defaults.radius, 0, Math.min(elementWidth, elementHeight) / 2),
    opacity: finite(value.opacity, 1, 0, 1),
    locked: boolean(value.locked, false),
    hidden: boolean(value.hidden, false) || undefined,
  };
}

function normalizeFallback(fallback) {
  return isRecord(fallback) ? fallback : DEFAULT_SCENE;
}

export function sanitizeScene(value, fallback = DEFAULT_SCENE) {
  const safeFallback = normalizeFallback(fallback);
  if (!isRecord(value)) return createScene(safeFallback);

  // Missing versions are treated as v1 for hand-authored scenes. An explicit
  // future or legacy version is rejected instead of being interpreted loosely.
  if (value.version !== undefined && Number(value.version) !== SCENE_VERSION) {
    return createScene(safeFallback);
  }

  const width = finite(value.width, finite(safeFallback.width, DEFAULT_WIDTH, 240, 2_400), 240, 2_400);
  const height = finite(value.height, finite(safeFallback.height, DEFAULT_HEIGHT, 180, 1_800), 180, 1_800);
  const inputElements = Array.isArray(value.elements) ? value.elements.slice(0, MAX_ELEMENTS) : [];
  const usedIds = new Set();
  const elements = [];

  inputElements.forEach((item, index) => {
    const element = sanitizeElement(item, index, { width, height });
    if (!element) return;
    element.id = uniqueId(element.id, usedIds);
    elements.push(element);
  });

  const fallbackTitle = cleanText(safeFallback.title, "Untitled diagram", 160);
  const title = cleanText(value.title, fallbackTitle, 160) || fallbackTitle;
  const fallbackDescription = cleanText(safeFallback.description, "A blog diagram.", 800);

  return {
    version: SCENE_VERSION,
    name: cleanId(value.name, cleanId(safeFallback.name, "untitled")),
    title,
    description:
      cleanText(value.description, fallbackDescription, 800) ||
      `${title}, containing ${elements.length} diagram element${elements.length === 1 ? "" : "s"}.`,
    width,
    height,
    frame: boolean(value.frame, boolean(safeFallback.frame, true)),
    grid: boolean(value.grid, boolean(safeFallback.grid, true)),
    elements,
  };
}

export function createScene(overrides = {}) {
  const source = isRecord(overrides) ? overrides : {};
  return sanitizeScene({
    ...DEFAULT_SCENE,
    ...source,
    elements: Array.isArray(source.elements) ? source.elements : [],
  });
}

export function createElement(type, overrides = {}) {
  const safeType = ELEMENT_TYPES.has(type) ? type : "box";
  return sanitizeElement(
    { id: createElementId(safeType), ...overrides, type: safeType },
    0,
    { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT },
  );
}

export function parseScene(source, fallback = DEFAULT_SCENE) {
  if (isRecord(source)) return sanitizeScene(source, fallback);
  if (typeof source !== "string" || !source.trim()) return sanitizeScene(fallback);

  try {
    return sanitizeScene(JSON.parse(source), fallback);
  } catch {
    return sanitizeScene(fallback);
  }
}

export function serializeScene(scene, space = 2) {
  const indentation = Math.round(finite(space, 2, 0, 8));
  return JSON.stringify(sanitizeScene(scene), null, indentation);
}

function getElementById(elementsOrScene, id) {
  const elements = Array.isArray(elementsOrScene)
    ? elementsOrScene
    : elementsOrScene?.elements;
  if (!Array.isArray(elements)) return null;
  return elements.find((element) => element?.id === id) || null;
}

export function getElementBounds(element) {
  if (!isRecord(element)) return null;

  if (element.type === "connector") {
    const start = isRecord(element.start) ? element.start : { x: 0, y: 0 };
    const end = isRecord(element.end) ? element.end : start;
    const anchors = [start, end];
    if (isRecord(element.mid)) anchors.push(element.mid);
    const xs = anchors.map((point) => numberOr(point.x));
    const ys = anchors.map((point) => numberOr(point.y));
    return boundsFromEdges(
      Math.min(...xs),
      Math.min(...ys),
      Math.max(...xs),
      Math.max(...ys)
    );
  }

  const x = numberOr(element.x);
  const y = numberOr(element.y);
  const width = Math.max(0, numberOr(element.width));
  const height = Math.max(0, numberOr(element.height));
  return boundsFromEdges(x, y, x + width, y + height);
}

function boundsFromEdges(left, top, right, bottom) {
  const width = right - left;
  const height = bottom - top;
  return {
    x: left,
    y: top,
    left,
    top,
    right,
    bottom,
    width,
    height,
    cx: left + width / 2,
    cy: top + height / 2,
  };
}

function anchorPoint(element, anchor, toward, gap) {
  const bounds = getElementBounds(element);
  if (!bounds) return null;

  if (anchor === "center") return { x: bounds.cx, y: bounds.cy };

  const fixedAnchors = {
    top: { x: bounds.cx, y: bounds.top - gap },
    right: { x: bounds.right + gap, y: bounds.cy },
    bottom: { x: bounds.cx, y: bounds.bottom + gap },
    left: { x: bounds.left - gap, y: bounds.cy },
  };
  if (fixedAnchors[anchor]) return fixedAnchors[anchor];

  const dx = numberOr(toward?.x, bounds.cx) - bounds.cx;
  const dy = numberOr(toward?.y, bounds.cy) - bounds.cy;
  if (dx === 0 && dy === 0) return { x: bounds.cx, y: bounds.cy };

  let scale;
  if (element.type === "ellipse") {
    const rx = Math.max(bounds.width / 2, 0.001);
    const ry = Math.max(bounds.height / 2, 0.001);
    scale = 1 / Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
  } else {
    const scaleX = Math.abs(dx) > 0 ? bounds.width / 2 / Math.abs(dx) : Infinity;
    const scaleY = Math.abs(dy) > 0 ? bounds.height / 2 / Math.abs(dy) : Infinity;
    scale = Math.min(scaleX, scaleY);
  }

  const distance = Math.hypot(dx, dy) || 1;
  return {
    x: bounds.cx + dx * scale + (dx / distance) * gap,
    y: bounds.cy + dy * scale + (dy / distance) * gap,
  };
}

function resolveBoundPoint(endpoint, toward, elementsOrScene = []) {
  const point = {
    x: numberOr(endpoint?.x),
    y: numberOr(endpoint?.y),
  };
  const bind = sanitizeBind(endpoint?.bind);
  if (!bind) return point;

  const target = getElementById(elementsOrScene, bind.elementId);
  if (!target || target.type === "connector") return point;
  return anchorPoint(target, bind.anchor, toward, bind.gap) || point;
}

function dedupePoints(points) {
  return points.filter((point, index) => {
    if (index === 0) return true;
    const previous = points[index - 1];
    return point.x !== previous.x || point.y !== previous.y;
  });
}

// Axis a connector segment must follow while touching a fixed anchor: leaving
// or entering a top/bottom anchor is vertical, a left/right anchor horizontal.
const ANCHOR_AXES = Object.freeze({
  top: "v",
  bottom: "v",
  left: "h",
  right: "h",
});

function anchorAxis(endpointValue) {
  return ANCHOR_AXES[endpointValue?.bind?.anchor] || null;
}

function pointsForRoute(start, end, route, startAxis = null, endAxis = null) {
  if (route !== "elbow" || start.x === end.x || start.y === end.y) {
    return dedupePoints([start, end]);
  }

  // Fixed anchors dictate the elbow orientation at their end of the leg.
  if (startAxis || endAxis) {
    if (startAxis === "v" && endAxis === "v") {
      const middleY = start.y + (end.y - start.y) / 2;
      return dedupePoints([
        start,
        { x: start.x, y: middleY },
        { x: end.x, y: middleY },
        end,
      ]);
    }
    if (startAxis === "h" && endAxis === "h") {
      const middleX = start.x + (end.x - start.x) / 2;
      return dedupePoints([
        start,
        { x: middleX, y: start.y },
        { x: middleX, y: end.y },
        end,
      ]);
    }
    const corner =
      startAxis === "v" || endAxis === "h"
        ? { x: start.x, y: end.y }
        : { x: end.x, y: start.y };
    return dedupePoints([start, corner, end]);
  }

  if (Math.abs(end.x - start.x) >= Math.abs(end.y - start.y)) {
    const middleX = start.x + (end.x - start.x) / 2;
    return dedupePoints([
      start,
      { x: middleX, y: start.y },
      { x: middleX, y: end.y },
      end,
    ]);
  }

  const middleY = start.y + (end.y - start.y) / 2;
  return dedupePoints([
    start,
    { x: start.x, y: middleY },
    { x: end.x, y: middleY },
    end,
  ]);
}

function pathFromPoints(points) {
  if (!points.length) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function midpointOnPolyline(points) {
  if (!points.length) return { x: 0, y: 0 };
  if (points.length === 1) return { ...points[0] };

  const segments = points.slice(1).map((point, index) => {
    const start = points[index];
    return { start, end: point, length: Math.hypot(point.x - start.x, point.y - start.y) };
  });
  const total = segments.reduce((sum, segment) => sum + segment.length, 0);
  if (total === 0) return { ...points[0] };

  let remaining = total / 2;
  for (const segment of segments) {
    if (remaining <= segment.length) {
      const progress = segment.length === 0 ? 0 : remaining / segment.length;
      return {
        x: segment.start.x + (segment.end.x - segment.start.x) * progress,
        y: segment.start.y + (segment.end.y - segment.start.y) * progress,
      };
    }
    remaining -= segment.length;
  }

  return { ...points[points.length - 1] };
}

export function resolveConnector(connector, elementsOrScene = []) {
  const rawStart = {
    x: numberOr(connector?.start?.x),
    y: numberOr(connector?.start?.y),
  };
  const rawEnd = {
    x: numberOr(connector?.end?.x),
    y: numberOr(connector?.end?.y),
  };
  const mid = isRecord(connector?.mid)
    ? { x: numberOr(connector.mid.x), y: numberOr(connector.mid.y) }
    : null;

  let start;
  let end;
  if (mid) {
    // With a waypoint, each bound end aims at the waypoint so the border exit
    // matches the first visible segment.
    start = resolveBoundPoint(connector?.start, mid, elementsOrScene);
    end = resolveBoundPoint(connector?.end, mid, elementsOrScene);
  } else {
    // The second pass lets two bound ends aim at each other's resolved anchors
    // while remaining deterministic for a single render/editor frame.
    start = resolveBoundPoint(connector?.start, rawEnd, elementsOrScene);
    end = resolveBoundPoint(connector?.end, start, elementsOrScene);
    start = resolveBoundPoint(connector?.start, end, elementsOrScene);
    end = resolveBoundPoint(connector?.end, start, elementsOrScene);
  }

  const startAxis = anchorAxis(connector?.start);
  const endAxis = anchorAxis(connector?.end);
  const points = mid
    ? dedupePoints([
        ...pointsForRoute(start, mid, connector?.route, startAxis, null),
        ...pointsForRoute(mid, end, connector?.route, null, endAxis).slice(1),
      ])
    : pointsForRoute(start, end, connector?.route, startAxis, endAxis);
  const path = pathFromPoints(points);
  return {
    start,
    end,
    points,
    midpoint: midpointOnPolyline(points),
    path,
  };
}
