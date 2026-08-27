/**
 * Flowchart model.
 *
 * The renderer is React Flow, so this file describes *what* a chart contains
 * and leaves every question of pixels and routing to layout.ts and the canvas.
 * A spec is plain JSON on purpose: tutorial content stores one of these in a
 * content block, the admin editor round-trips it, and neither has to know that
 * React Flow exists.
 *
 * Three things separate this from a generic node/edge graph, and all three
 * exist because algorithm charts need them:
 *
 *  - `group` nodes are containers. A group holds child nodes and draws a
 *    labelled border around them, which is how a chart says "these three
 *    boxes are one stage" without inventing a second diagram.
 *  - `lanes` pin nodes to vertical columns, so a chart can show *where* each
 *    step runs (caller vs. callee, client vs. server) rather than only in
 *    what order.
 *  - `walkthrough` records an ordered path through the chart with a caption
 *    per step, which turns a static diagram into a replayable trace.
 */

export type FlowNodeType = "start" | "end" | "process" | "decision" | "io" | "group";

/**
 * Named colours rather than raw hex, so a chart written today still matches
 * the palette after a theme change. Resolved to CSS variables in the canvas.
 */
export type FlowAccent = "neutral" | "copper" | "green" | "coral" | "blue" | "violet" | "amber";

export type FlowSide = "top" | "right" | "bottom" | "left";

export type FlowEdgeKind = "solid" | "dashed" | "loop";

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  /** Box label. Newlines are honoured. */
  text: string;
  /** Shown when the node is selected. The "why", not a restatement of the box. */
  note?: string;
  /** Small corner badge, e.g. a stage number. */
  badge?: string;
  accent?: FlowAccent;
  /** Force the mono face on or off. Auto-detected from the text when absent. */
  mono?: boolean;
  /** Container membership. Must name a `group` node. */
  parentId?: string;
  /** Lane membership. Ignored unless the spec declares lanes. */
  lane?: string;
  /** How a group stacks its children. Ignored on non-group nodes. */
  groupLayout?: "row" | "column";
  /** Manual placement, in flow units. Absent means "let the layout decide". */
  position?: { x: number; y: number };
  /** Manual size. Absent means "measure the text". */
  size?: { width: number; height: number };
}

export interface FlowEdge {
  /** Stable identity for walkthrough steps. Generated from endpoints when absent. */
  id?: string;
  from: string;
  to: string;
  /** Required in practice on decision outputs: "yes" / "no". */
  label?: string;
  kind?: FlowEdgeKind;
  accent?: FlowAccent;
  /** Marching-ants dashes. Off by default; reserve it for the one edge that matters. */
  animated?: boolean;
  /** Shown in the note panel when the edge is selected. */
  note?: string;
  /** Override the auto-chosen attachment points. */
  fromSide?: FlowSide;
  toSide?: FlowSide;
}

export interface FlowLane {
  id: string;
  label: string;
  /** Lane width in flow units. Defaults to the widest node it holds. */
  width?: number;
}

export interface FlowLegendItem {
  label: string;
  /** What to draw as the swatch. Defaults to a process box. */
  kind?: "node" | "edge" | "badge";
  shape?: FlowNodeType;
  accent?: FlowAccent;
  /** Badge text, when kind is "badge". */
  text?: string;
}

/** One frame of a replayable path through the chart. */
export interface FlowStep {
  /** Node highlighted at this step. */
  node?: string;
  /** Edge highlighted at this step, by edge id or "from->to". */
  edge?: string;
  caption: string;
}

/**
 * Every interactive behaviour, individually switchable. Defaults live in
 * `resolveInteractive` rather than here so that a spec written with no
 * `interactive` block still gets the sensible reading experience.
 */
export interface FlowchartInteractive {
  /** Click a node to read its note. */
  notes?: boolean;
  /** Play/step through `walkthrough`. Ignored when the spec has no steps. */
  walkthrough?: boolean;
  /** Selecting a node dims everything not adjacent to it. */
  focus?: boolean;
  /** Let the reader drag boxes around. */
  draggable?: boolean;
  /** Scroll-to-zoom and pan, plus the zoom control cluster. */
  zoom?: boolean;
  minimap?: boolean;
  fullscreen?: boolean;
  /** Download the chart as a PNG. */
  download?: boolean;
  legend?: boolean;
}

export interface FlowchartSpec {
  title?: string;
  subtitle?: string;
  /** Layout direction. "TB" is top-to-bottom, "LR" is left-to-right. */
  direction?: "TB" | "LR";
  /** Canvas height in px. The layout is scrollable/zoomable inside it. */
  height?: number;
  lanes?: FlowLane[];
  nodes: FlowNode[];
  edges: FlowEdge[];
  /** Custom legend. Auto-derived from the nodes in use when absent. */
  legend?: FlowLegendItem[];
  walkthrough?: FlowStep[];
  interactive?: FlowchartInteractive;
}

/* -------------------------------------------------------------------------
 * Defaults
 * ---------------------------------------------------------------------- */

/**
 * Notes, legend, zoom and fullscreen are on by default because they cost the
 * reader nothing until used. Dragging is off: on a teaching diagram the
 * layout carries meaning, and a reader who nudges a box has quietly broken
 * it. The maker turns it on.
 */
export function resolveInteractive(spec: FlowchartSpec): Required<FlowchartInteractive> {
  const i = spec.interactive ?? {};
  const hasSteps = (spec.walkthrough?.length ?? 0) > 0;
  return {
    notes: i.notes ?? true,
    walkthrough: (i.walkthrough ?? true) && hasSteps,
    focus: i.focus ?? false,
    draggable: i.draggable ?? false,
    zoom: i.zoom ?? true,
    minimap: i.minimap ?? false,
    fullscreen: i.fullscreen ?? true,
    download: i.download ?? false,
    legend: i.legend ?? true,
  };
}

export function edgeKey(edge: FlowEdge): string {
  return edge.id ?? `${edge.from}->${edge.to}${edge.label ? `:${edge.label}` : ""}`;
}

/** Default accent per node type, used when a node does not name one. */
export function defaultAccent(type: FlowNodeType): FlowAccent {
  switch (type) {
    case "start":
    case "end":
      return "green";
    case "decision":
      return "copper";
    case "io":
      return "blue";
    case "group":
      return "neutral";
    default:
      return "neutral";
  }
}

/**
 * Text that is code gets the mono face. Guessing from punctuation is crude,
 * but a flowchart box holding `i = i + 1` looks wrong in the prose face and
 * asking every chart to say so explicitly is worse.
 */
export function looksLikeCode(text: string): boolean {
  return /[(){}[\]<>=+*/]|\ba\[|\.\w+\(/.test(text);
}

/* -------------------------------------------------------------------------
 * Validation
 * ---------------------------------------------------------------------- */

/** Structural problems worth surfacing in the editor rather than silently drawing. */
export function validateFlowchart(spec: FlowchartSpec): string[] {
  const issues: string[] = [];

  if (!Array.isArray(spec.nodes) || spec.nodes.length === 0) return ["The chart is empty."];
  const edges = Array.isArray(spec.edges) ? spec.edges : [];

  const ids = new Set(spec.nodes.map((n) => n.id));
  const byId = new Map(spec.nodes.map((n) => [n.id, n]));

  const dupes = spec.nodes.map((n) => n.id).filter((id, i, arr) => arr.indexOf(id) !== i);
  if (dupes.length > 0) issues.push(`Duplicate node id: ${[...new Set(dupes)].join(", ")}.`);

  if (!spec.nodes.some((n) => n.type === "start")) issues.push("No start node.");
  if (!spec.nodes.some((n) => n.type === "end")) issues.push("No end node.");

  for (const e of edges) {
    if (!ids.has(e.from)) issues.push(`Edge from unknown node "${e.from}".`);
    if (!ids.has(e.to)) issues.push(`Edge to unknown node "${e.to}".`);
  }

  // A group that is not a group, or a parent chain that loops, both render as
  // nothing at all in React Flow rather than as an obvious mistake.
  for (const n of spec.nodes) {
    if (!n.parentId) continue;
    const parent = byId.get(n.parentId);
    if (!parent) {
      issues.push(`"${n.text}" names a missing parent "${n.parentId}".`);
    } else if (parent.type !== "group") {
      issues.push(`"${n.text}" is inside "${parent.text}", which is not a group.`);
    }
  }
  for (const n of spec.nodes) {
    const seen = new Set<string>([n.id]);
    let cur = n.parentId;
    while (cur) {
      if (seen.has(cur)) {
        issues.push(`Group nesting for "${n.text}" is circular.`);
        break;
      }
      seen.add(cur);
      cur = byId.get(cur)?.parentId;
    }
  }

  for (const n of spec.nodes.filter((x) => x.type === "group")) {
    if (!spec.nodes.some((c) => c.parentId === n.id)) issues.push(`Group "${n.text}" is empty.`);
  }

  if (spec.lanes) {
    const laneIds = new Set(spec.lanes.map((l) => l.id));
    for (const n of spec.nodes) {
      if (n.lane && !laneIds.has(n.lane)) issues.push(`"${n.text}" is in unknown lane "${n.lane}".`);
    }
  }

  // A decision with one exit is nearly always a mistake, and it is the most
  // common one when hand-authoring these.
  for (const n of spec.nodes.filter((x) => x.type === "decision")) {
    const outs = edges.filter((e) => e.from === n.id);
    if (outs.length < 2) issues.push(`Decision "${n.text}" has ${outs.length} exit(s); it needs at least two.`);
    else if (outs.some((o) => !o.label)) issues.push(`Decision "${n.text}" has unlabelled branches.`);
  }

  const keys = edges.map(edgeKey);
  for (const step of spec.walkthrough ?? []) {
    if (step.node && !ids.has(step.node)) issues.push(`Walkthrough step points at unknown node "${step.node}".`);
    if (step.edge && !keys.includes(step.edge)) issues.push(`Walkthrough step points at unknown edge "${step.edge}".`);
  }

  // Reachability, ignoring group containers: a group is scenery, its children
  // are the things that need to be connected.
  const real = spec.nodes.filter((n) => n.type !== "group");
  const start = real.find((n) => n.type === "start") ?? real[0];
  if (start) {
    const reachable = new Set<string>([start.id]);
    const queue = [start.id];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const e of edges) {
        if (e.from === cur && !reachable.has(e.to)) {
          reachable.add(e.to);
          queue.push(e.to);
        }
      }
    }
    const orphans = real.filter((n) => !reachable.has(n.id));
    if (orphans.length > 0) {
      issues.push(`Unreachable from start: ${orphans.map((o) => o.text.replace(/\n/g, " ")).join(", ")}.`);
    }
  }

  return issues;
}

export function isFlowchartSpec(value: unknown): value is FlowchartSpec {
  if (typeof value !== "object" || value === null) return false;
  const v = value as FlowchartSpec;
  return Array.isArray(v.nodes) && Array.isArray(v.edges);
}
