import DiagramShell from "./DiagramShell";
import { ArrowMarker, DiagramCanvas, useDiagramIds } from "./primitives";
import {
  parseScene,
  resolveConnector,
  sanitizeScene,
  SCENE_VERSION,
} from "./scene";

// Diagram files are deliberately bundled at build time. A fence can name a
// slug, but it can never turn into an arbitrary runtime file or network read.
const diagramFileModules = import.meta.glob("/mds/diagrams/*.json", {
  eager: true,
  import: "default",
});

const bundledDiagrams = new Map(
  Object.entries(diagramFileModules).map(([path, value]) => {
    const filename = path.slice(path.lastIndexOf("/") + 1);
    return [filename.replace(/\.json$/i, ""), value];
  }),
);

const TEXT_METRICS = Object.freeze({
  title: Object.freeze({ size: 25, lineHeight: 31, topInset: 31 }),
  subtitle: Object.freeze({ size: 11, lineHeight: 17, topInset: 27 }),
  label: Object.freeze({ size: 12, lineHeight: 18, topInset: 29 }),
  micro: Object.freeze({ size: 9, lineHeight: 14, topInset: 28 }),
  caption: Object.freeze({ size: 10, lineHeight: 15, topInset: 27 }),
});

const FILE_SLUG = /^[a-z0-9][a-z0-9-]*$/;

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function unavailableScene(message) {
  return sanitizeScene({
    version: SCENE_VERSION,
    name: "diagram-unavailable",
    title: "Diagram unavailable",
    description: message,
    width: 960,
    height: 220,
    frame: true,
    grid: false,
    elements: [
      {
        id: "unavailable-title",
        type: "text",
        x: 60,
        y: 54,
        width: 840,
        height: 32,
        text: "Diagram unavailable",
        textRole: "title",
        align: "left",
      },
      {
        id: "unavailable-message",
        type: "text",
        x: 60,
        y: 112,
        width: 840,
        height: 36,
        text: message,
        textRole: "caption",
        align: "left",
      },
    ],
  });
}

function resolveSceneInput(input) {
  let value = input;

  if (typeof value === "string") {
    if (!value.trim()) {
      return { error: "No diagram scene was provided." };
    }

    try {
      value = JSON.parse(value);
    } catch {
      return { error: "The inline diagram scene is not valid JSON." };
    }
  }

  if (!isRecord(value)) {
    return { error: "The diagram scene must be a JSON object." };
  }

  if (Object.prototype.hasOwnProperty.call(value, "file")) {
    const slug = typeof value.file === "string" ? value.file.trim() : "";
    if (!FILE_SLUG.test(slug)) {
      return { error: "The diagram file reference is invalid." };
    }

    const fileScene = bundledDiagrams.get(slug);
    if (!fileScene) {
      return { error: `Diagram “${slug}” is not bundled in this build.` };
    }
    if (!isRecord(fileScene) || !Array.isArray(fileScene.elements)) {
      return { error: `Diagram “${slug}” does not contain a valid scene.` };
    }
    if (
      fileScene.version !== undefined &&
      Number(fileScene.version) !== SCENE_VERSION
    ) {
      return { error: `Diagram “${slug}” uses an unsupported scene version.` };
    }

    return { scene: sanitizeScene(fileScene) };
  }

  if (value.version !== undefined && Number(value.version) !== SCENE_VERSION) {
    return { error: "The inline diagram uses an unsupported scene version." };
  }

  return { scene: parseScene(value) };
}

function textCoordinates(element) {
  const isStandaloneText = element.type === "text";
  const padding = isStandaloneText ? 0 : 12;
  const xByAlignment = {
    left: element.x + padding,
    center: element.x + element.width / 2,
    right: element.x + element.width - padding,
  };
  const textAnchor = {
    left: "start",
    center: "middle",
    right: "end",
  }[element.align];
  const metrics = TEXT_METRICS[element.textRole] || TEXT_METRICS.label;
  const scale = element.fontSize ? element.fontSize / metrics.size : 1;
  const y = element.labelPosition === "top" && !isStandaloneText
    ? element.y + metrics.topInset * scale
    : element.y + element.height / 2;

  return {
    x: xByAlignment[element.align],
    y,
    textAnchor,
    lineHeight: metrics.lineHeight * scale,
  };
}

function ElementText({ element }) {
  if (!element.text) return null;

  const lines = element.text.split("\n");
  const { x, y, textAnchor, lineHeight } = textCoordinates(element);
  const firstOffset = -((lines.length - 1) * lineHeight) / 2;

  return (
    <text
      className={`blog-diagram__text blog-diagram__text--${element.textRole}`}
      x={x}
      y={y}
      textAnchor={textAnchor}
      dominantBaseline="middle"
      style={
        element.fontSize ? { fontSize: `${element.fontSize}px` } : undefined
      }
    >
      {lines.map((line, index) => (
        <tspan
          key={`${element.id}-line-${index}`}
          x={x}
          dy={index === 0 ? firstOffset : lineHeight}
        >
          {line || "\u00a0"}
        </tspan>
      ))}
    </text>
  );
}

function ShapeElement({ element }) {
  const shapeClass = [
    "blog-diagram__shape",
    `blog-diagram__shape--${element.type}`,
    `blog-diagram__fill--${element.fill}`,
    `blog-diagram__stroke--${element.stroke}`,
  ].join(" ");
  let shape = null;

  if (element.type === "ellipse") {
    shape = (
      <ellipse
        className={shapeClass}
        cx={element.x + element.width / 2}
        cy={element.y + element.height / 2}
        rx={element.width / 2}
        ry={element.height / 2}
      />
    );
  } else if (element.type !== "text") {
    shape = (
      <rect
        className={shapeClass}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        rx={element.radius}
      />
    );
  }

  return (
    <g
      className={`blog-diagram__element blog-diagram__element--${element.type}`}
      data-element-id={element.id}
      data-locked={element.locked ? "true" : undefined}
      style={{ opacity: element.opacity }}
    >
      {shape}
      <ElementText element={element} />
    </g>
  );
}

function ConnectorElement({ element, elements, markerId }) {
  const resolved = resolveConnector(element, elements);
  const first = resolved.points[0] || resolved.start;
  const last = resolved.points[resolved.points.length - 1] || resolved.end;
  const isMostlyVertical = Math.abs(last.y - first.y) > Math.abs(last.x - first.x);
  const labelX = resolved.midpoint.x + (isMostlyVertical ? 9 : 0);
  const labelY = resolved.midpoint.y + (isMostlyVertical ? 0 : -10);

  return (
    <g
      className="blog-diagram__element blog-diagram__element--connector"
      data-element-id={element.id}
      data-locked={element.locked ? "true" : undefined}
      style={{ opacity: element.opacity }}
    >
      <path
        className={`blog-diagram__connector blog-diagram__connector--${element.stroke}`}
        d={resolved.path}
        markerStart={element.arrowStart && markerId ? `url(#${markerId})` : undefined}
        markerEnd={element.arrowEnd && markerId ? `url(#${markerId})` : undefined}
      />
      {element.text && (
        <text
          className="blog-diagram__connector-label"
          x={labelX}
          y={labelY}
          textAnchor={isMostlyVertical ? "start" : "middle"}
          dominantBaseline="middle"
        >
          {element.text}
        </text>
      )}
    </g>
  );
}

// Shared by the published renderer and the editor. Array order is intentionally
// untouched: later elements paint on top, exactly like an SVG scene graph.
function SceneElements({ scene, markerId }) {
  return (
    <g className="blog-diagram__scene" aria-hidden="true">
      {scene.elements.map((element) =>
        element.hidden ? null : element.type === "connector" ? (
          <ConnectorElement
            key={element.id}
            element={element}
            elements={scene.elements}
            markerId={markerId}
          />
        ) : (
          <ShapeElement key={element.id} element={element} />
        ),
      )}
    </g>
  );
}

// Shared canvas for the published diagram and developer editor. Optional
// children let the editor add handles in the exact authored coordinate space.
function SafeDiagramSceneSvg({ scene, className, children }) {
  const id = useDiagramIds();
  const markerId = id("blog-diagram-arrow");
  const canvasClassName = [
    "blog-diagram",
    scene.grid ? "blog-diagram--grid-on" : "blog-diagram--grid-off",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <DiagramCanvas
      className={canvasClassName}
      width={scene.width}
      height={scene.height}
      title={scene.title}
      desc={scene.description}
      frame={scene.frame}
      defs={<ArrowMarker id={markerId} />}
    >
      <SceneElements scene={scene} markerId={markerId} />
      {children}
    </DiagramCanvas>
  );
}

export function DiagramSceneSvg({ scene, className, children }) {
  return (
    <SafeDiagramSceneSvg
      scene={sanitizeScene(scene)}
      className={className}
    >
      {children}
    </SafeDiagramSceneSvg>
  );
}

export default function BlogDiagram({ source, scene, theme, className, label }) {
  const resolved = resolveSceneInput(scene ?? source);
  const safeScene = resolved.scene || unavailableScene(resolved.error);

  return (
    <DiagramShell theme={theme} label={label || safeScene.title}>
      <SafeDiagramSceneSvg scene={safeScene} className={className} />
    </DiagramShell>
  );
}
