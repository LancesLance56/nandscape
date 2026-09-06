/**
 * The one-way door out of the old chart format.
 *
 * A `FlowchartSpec` says what a diagram *means* and leaves every coordinate to
 * an auto-layout engine. A `Doc` says where everything *is*. Converting between
 * them is therefore a one-time act: run the old engine once, write down what it
 * decided, and never run it again. From that moment the diagram is a drawing -
 * someone can nudge one box without eleven others rearranging themselves, and
 * it will look the same next year as it does today.
 *
 * Everything the old format could express survives the trip: notes, badges,
 * accents, edge labels, dashed loops, groups, swim lanes and the recorded
 * walkthrough. The only thing that does not is the ability to re-run the
 * layout, which is the point.
 */

import {
  DEFAULT_LINE_STYLE,
  DEFAULT_SHAPE_STYLE,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  newId,
  type Doc,
  type Line,
  type Page,
  type Point,
  type Shape,
  type WalkStep,
} from "./model";
import { portsFor } from "./symbols";
import { layoutFlowchart } from "@/lib/flowchart/layout";
import {
  edgeKey,
  type FlowAccent,
  type FlowNodeType,
  type FlowchartSpec,
} from "@/lib/flowchart/types";

/* -------------------------------------------------------------------------
 * Palettes
 * ---------------------------------------------------------------------- */

/**
 * The old format's named accents, resolved to ink.
 *
 * Literals rather than CSS variables because these end up in saved JSON and in
 * exported SVG, where `var(--copper)` resolves to nothing. The values are the
 * site's own tokens - see globals.css - so a converted diagram still matches
 * the page it sits on.
 */
const ACCENT_INK: Record<FlowAccent, { fill: string; stroke: string; text: string }> = {
  neutral: { fill: "#ffffff", stroke: "#252525", text: "#252525" },
  copper: { fill: "#e0efe2", stroke: "#2b8341", text: "#1f6b33" },
  green: { fill: "#dff3e7", stroke: "#1ca463", text: "#0f7e4a" },
  coral: { fill: "#fbe3dd", stroke: "#e1543b", text: "#b33f2a" },
  blue: { fill: "#e2ecfb", stroke: "#2f6fd0", text: "#24559f" },
  violet: { fill: "#f7e2ec", stroke: "#c24a7c", text: "#98325c" },
  amber: { fill: "#faf0d4", stroke: "#b8860b", text: "#7a5a07" },
};

/** The old node vocabulary, mapped onto the symbol catalogue. */
const SYMBOL_FOR: Record<FlowNodeType, string> = {
  start: "terminator",
  end: "terminator",
  process: "process",
  decision: "decision",
  io: "data",
  group: "container-box",
};

/** Same default the old renderer used when a node named no accent. */
function accentOf(type: FlowNodeType, accent?: FlowAccent): FlowAccent {
  if (accent) return accent;
  if (type === "start" || type === "end") return "copper";
  if (type === "decision") return "amber";
  return "neutral";
}

/* -------------------------------------------------------------------------
 * Conversion
 * ---------------------------------------------------------------------- */

const MARGIN = 48;

/** Which of a shape's sixteen connection points a routed path arrives at. */
function nearestPort(shape: Shape, at: Point): number {
  const local = portsFor(shape.symbol, shape.width, shape.height);
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < local.length; i++) {
    const d = Math.hypot(shape.x + local[i].x - at.x, shape.y + local[i].y - at.y);
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  }
  return best;
}

export function docFromSpec(spec: FlowchartSpec): Doc {
  const layout = layoutFlowchart(spec);

  // The layout works from its own origin; the page gets a margin so the
  // drawing is not flush against the paper's edge.
  const dx = MARGIN;
  const dy = MARGIN;

  const byId = new Map(layout.nodes.map((n) => [n.id, n]));

  /** Absolute position, following the parent chain out of any group. */
  const absolute = (id: string): Point => {
    let node = byId.get(id);
    let x = 0;
    let y = 0;
    const guard = new Set<string>();
    while (node && !guard.has(node.id)) {
      guard.add(node.id);
      x += node.x;
      y += node.y;
      node = node.parentId ? byId.get(node.parentId) : undefined;
    }
    return { x: x + dx, y: y + dy };
  };

  let z = 1;
  const elements: (Shape | Line)[] = [];

  /* --- swim lanes, behind everything ---------------------------------- */

  for (const lane of layout.lanes) {
    elements.push({
      id: newId("s"),
      kind: "shape",
      symbol: "swimlane-v",
      x: lane.x + dx,
      y: lane.y + dy,
      width: lane.width,
      height: lane.height,
      rotation: 0,
      text: lane.label,
      style: {
        ...DEFAULT_SHAPE_STYLE,
        fill: "transparent",
        stroke: "#cfcfcf",
        textColor: "#7d7d7d",
        dash: "5 4",
        align: "left",
        valign: "top",
        fontSize: 11,
        bold: true,
      },
      z: z++,
    });
  }

  /* --- boxes ----------------------------------------------------------- */

  // Groups first, so a container never lands on top of what it contains.
  const ordered = [...layout.nodes].sort((a, b) => Number(b.type === "group") - Number(a.type === "group"));

  const shapes = new Map<string, Shape>();
  for (const node of ordered) {
    const at = absolute(node.id);
    const isGroup = node.type === "group";
    const ink = ACCENT_INK[accentOf(node.type, node.accent)];
    const shape: Shape = {
      id: node.id,
      kind: "shape",
      symbol: SYMBOL_FOR[node.type] ?? "process",
      x: Math.round(at.x),
      y: Math.round(at.y),
      width: Math.round(node.width),
      height: Math.round(node.height),
      rotation: 0,
      text: node.text,
      style: {
        ...DEFAULT_SHAPE_STYLE,
        fill: isGroup ? "transparent" : ink.fill,
        stroke: isGroup ? "#cfcfcf" : ink.stroke,
        textColor: isGroup ? "#7d7d7d" : ink.text,
        // A terminator is a pill, which is the corner radius doing the work.
        radius: node.type === "start" || node.type === "end" ? Math.round(node.height / 2) : 8,
        dash: isGroup ? "5 4" : "",
        align: isGroup ? "left" : "center",
        valign: isGroup ? "top" : "middle",
        bold: isGroup,
        fontSize: isGroup ? 11 : 12,
        fontFamily: node.mono ? "Courier New" : "Inter",
      },
      z: isGroup ? 0 : z++,
      ...(node.note ? { note: node.note } : {}),
      ...(node.badge ? { badge: node.badge } : {}),
    };
    shapes.set(node.id, shape);
    elements.push(shape);
  }

  /* --- arrows ---------------------------------------------------------- */

  // Edge id by old key, so walkthrough steps naming an edge still resolve.
  const lineIdByKey = new Map<string, string>();

  for (const edge of layout.edges) {
    const points = edge.points.map((p) => ({ x: Math.round(p.x + dx), y: Math.round(p.y + dy) }));
    if (points.length < 2) continue;

    const source = shapes.get(edge.from);
    const target = shapes.get(edge.to);
    const ink = ACCENT_INK[edge.accent ?? (edge.back ? "copper" : "neutral")];
    const id = newId("l");
    lineIdByKey.set(edgeKey(edge), id);

    const line: Line = {
      id,
      kind: "line",
      // The path is already a right-angled polyline with the corners the
      // router chose. Keeping it as one, filleted, is the closest match to
      // how it used to be drawn.
      lineKind: "rounded",
      from: source
        ? { kind: "shape", shapeId: source.id, port: nearestPort(source, points[0]) }
        : { kind: "free", ...points[0] },
      to: target
        ? { kind: "shape", shapeId: target.id, port: nearestPort(target, points[points.length - 1]) }
        : { kind: "free", ...points[points.length - 1] },
      // Everything between the two ends becomes a bend the reader can now move.
      waypoints: points.slice(1, -1),
      style: {
        ...DEFAULT_LINE_STYLE,
        stroke: edge.back ? ink.stroke : "#545454",
        strokeWidth: edge.back ? 1.6 : 1.4,
        dash: edge.kind === "dashed" || (edge.back && edge.kind !== "solid") ? "5 4" : "",
        textColor: "#545454",
        fontSize: 10,
        radius: 8,
      },
      label: edge.label ?? "",
      z: z++,
      ...(edge.note ? { note: edge.note } : {}),
    };
    elements.push(line);
  }

  /* --- walkthrough ----------------------------------------------------- */

  const walkthrough: WalkStep[] = (spec.walkthrough ?? []).map((step) => ({
    id: newId("w"),
    target: step.node ?? (step.edge ? lineIdByKey.get(step.edge) ?? resolveEdgeTarget(step.edge, lineIdByKey) : undefined),
    caption: step.caption,
  }));

  const page: Page = {
    id: newId("p"),
    name: "Page 1",
    width: Math.max(PAGE_WIDTH, Math.round(layout.width + MARGIN * 2)),
    height: Math.max(PAGE_HEIGHT, Math.round(layout.height + MARGIN * 2)),
    background: "#ffffff",
    elements,
    ...(walkthrough.length > 0 ? { walkthrough } : {}),
  };

  return { title: spec.title ?? "Diagram", pages: [page] };
}

/**
 * A walkthrough step may name an edge by its explicit id rather than by the
 * "from->to" key the layout uses, so both spellings have to resolve.
 */
function resolveEdgeTarget(ref: string, byKey: Map<string, string>): string | undefined {
  if (byKey.has(ref)) return byKey.get(ref);
  for (const [key, id] of byKey) if (key.endsWith(`->${ref}`) || key.startsWith(`${ref}->`)) return id;
  return undefined;
}

/* -------------------------------------------------------------------------
 * Reading either shape
 * ---------------------------------------------------------------------- */

export function isLegacySpec(value: unknown): value is FlowchartSpec {
  if (!value || typeof value !== "object") return false;
  const v = value as FlowchartSpec;
  return Array.isArray(v.nodes) && Array.isArray(v.edges) && !("pages" in v);
}

/**
 * Accept whatever a record holds and hand back a drawing.
 *
 * Every reading surface goes through this, so a diagram still stored in the
 * old shape renders correctly today and converts itself the next time anyone
 * saves it. Nothing has to be migrated before the site works; the migration
 * is about making the old format stop being load-bearing, not about avoiding
 * a crash.
 */
export function toDoc(value: unknown): Doc | null {
  if (!value || typeof value !== "object") return null;
  if ("pages" in (value as Doc) && Array.isArray((value as Doc).pages)) return value as Doc;
  if (isLegacySpec(value)) return docFromSpec(value);
  return null;
}
