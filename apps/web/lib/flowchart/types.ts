/**
 * Flowchart model and layout.
 *
 * Algorithm flowcharts are not DAGs: every loop is a back edge pointing at a
 * box above it, and a naive layered layout either stacks those nodes
 * infinitely deep or refuses to place them at all. So the layout classifies
 * edges first (DFS, marking edges into a node still on the stack as back
 * edges), lays out the remaining DAG by longest path, and routes the back
 * edges around the side afterwards.
 */

export type FlowNodeType = "start" | "end" | "process" | "decision" | "io";

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  text: string;
  /** Shown when the node is selected. The "why", not a restatement of the box. */
  note?: string;
}

export interface FlowEdge {
  from: string;
  to: string;
  /** Required in practice on decision outputs: "yes" / "no". */
  label?: string;
}

export interface FlowchartSpec {
  title?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

/* -------------------------------------------------------------------------
 * Geometry
 * ---------------------------------------------------------------------- */

export const NODE_H = 46;
export const DECISION_H = 62;
const CHAR_W = 6.9;
const PAD_X = 30;
export const MIN_NODE_W = 96;
export const MAX_NODE_W = 260;
const ROW_GAP = 44;
const COL_GAP = 34;

export function nodeWidth(node: FlowNode): number {
  const longest = node.text.split("\n").reduce((m, l) => Math.max(m, l.length), 0);
  const base = longest * CHAR_W + PAD_X * 2;
  // Diamonds waste horizontal space at the top and bottom corners, so they
  // need to be wider than a rectangle holding the same text.
  const w = node.type === "decision" ? base * 1.35 : base;
  return Math.min(MAX_NODE_W, Math.max(MIN_NODE_W, Math.round(w)));
}

export function nodeHeight(node: FlowNode): number {
  const lines = node.text.split("\n").length;
  const base = node.type === "decision" ? DECISION_H : NODE_H;
  return base + (lines - 1) * 15;
}

export interface PlacedNode extends FlowNode {
  x: number;
  y: number;
  w: number;
  h: number;
  layer: number;
}

export interface RoutedEdge extends FlowEdge {
  /** True when this edge points back up the chart, i.e. it closes a loop. */
  back: boolean;
  /** Polyline points to draw. */
  points: { x: number; y: number }[];
  labelAt?: { x: number; y: number };
}

export interface FlowchartLayout {
  nodes: PlacedNode[];
  edges: RoutedEdge[];
  width: number;
  height: number;
}

/* -------------------------------------------------------------------------
 * Layout
 * ---------------------------------------------------------------------- */

/**
 * Classify edges by DFS. An edge into a node that is still on the recursion
 * stack closes a cycle, so it is a back edge and must be excluded before
 * layering, or the longest-path computation never terminates.
 */
function findBackEdges(spec: FlowchartSpec, startId: string): Set<number> {
  const outgoing = new Map<string, number[]>();
  spec.edges.forEach((e, i) => {
    const list = outgoing.get(e.from) ?? [];
    list.push(i);
    outgoing.set(e.from, list);
  });

  const back = new Set<number>();
  const state = new Map<string, "gray" | "black">();

  // Iterative DFS: these charts are small, but an explicit stack keeps the
  // "still on the stack" test exact rather than relying on call depth.
  const stack: { id: string; edgeIdx: number }[] = [{ id: startId, edgeIdx: 0 }];
  state.set(startId, "gray");

  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    const edges = outgoing.get(frame.id) ?? [];

    if (frame.edgeIdx >= edges.length) {
      state.set(frame.id, "black");
      stack.pop();
      continue;
    }

    const edgeIndex = edges[frame.edgeIdx++];
    const target = spec.edges[edgeIndex].to;
    const targetState = state.get(target);

    if (targetState === "gray") {
      back.add(edgeIndex);
    } else if (targetState === undefined) {
      state.set(target, "gray");
      stack.push({ id: target, edgeIdx: 0 });
    }
  }

  // Anything unreachable from start never got visited; treat its edges as
  // forward so it still lands somewhere rather than vanishing.
  return back;
}

export function layoutFlowchart(spec: FlowchartSpec): FlowchartLayout {
  if (spec.nodes.length === 0) return { nodes: [], edges: [], width: 0, height: 0 };

  const startNode = spec.nodes.find((n) => n.type === "start") ?? spec.nodes[0];
  const backEdges = findBackEdges(spec, startNode.id);
  const forward = spec.edges.map((e, i) => ({ e, i })).filter(({ i }) => !backEdges.has(i));

  // Longest-path layering over the forward (acyclic) edges.
  const layer = new Map<string, number>();
  for (const n of spec.nodes) layer.set(n.id, 0);
  layer.set(startNode.id, 0);

  for (let iter = 0; iter < spec.nodes.length + 1; iter++) {
    let changed = false;
    for (const { e } of forward) {
      const candidate = (layer.get(e.from) ?? 0) + 1;
      if (candidate > (layer.get(e.to) ?? 0)) {
        layer.set(e.to, candidate);
        changed = true;
      }
    }
    if (!changed) break;
  }

  // Group by layer, preserving declaration order within each.
  const byLayer = new Map<number, FlowNode[]>();
  for (const n of spec.nodes) {
    const l = layer.get(n.id) ?? 0;
    const list = byLayer.get(l) ?? [];
    list.push(n);
    byLayer.set(l, list);
  }

  const layers = [...byLayer.keys()].sort((a, b) => a - b);
  const rowWidth = new Map<number, number>();
  for (const l of layers) {
    const nodes = byLayer.get(l)!;
    rowWidth.set(l, nodes.reduce((sum, n) => sum + nodeWidth(n), 0) + COL_GAP * (nodes.length - 1));
  }
  const contentWidth = Math.max(...rowWidth.values(), MIN_NODE_W);
  // Room on the right for loop edges to run vertically without crossing boxes.
  const backLane = backEdges.size > 0 ? 54 : 12;

  const placed: PlacedNode[] = [];
  let y = 16;
  const rowY = new Map<number, number>();

  for (const l of layers) {
    const nodes = byLayer.get(l)!;
    const rowH = Math.max(...nodes.map(nodeHeight));
    rowY.set(l, y);

    let x = (contentWidth - rowWidth.get(l)!) / 2 + 16;
    for (const n of nodes) {
      const w = nodeWidth(n);
      const h = nodeHeight(n);
      placed.push({ ...n, x, y: y + (rowH - h) / 2, w, h, layer: l });
      x += w + COL_GAP;
    }
    y += rowH + ROW_GAP;
  }

  const byId = new Map(placed.map((n) => [n.id, n]));
  const width = contentWidth + 32 + backLane;
  const height = y - ROW_GAP + 16;

  const routed: RoutedEdge[] = spec.edges.map((e, i) => {
    const from = byId.get(e.from);
    const to = byId.get(e.to);
    const back = backEdges.has(i);

    if (!from || !to) {
      return { ...e, back, points: [] };
    }

    if (!back) {
      // Forward edge: leave the bottom, enter the top. When the two boxes are
      // not vertically aligned, bend through the midpoint so the line stays
      // orthogonal rather than cutting diagonally across other rows.
      const x1 = from.x + from.w / 2;
      const y1 = from.y + from.h;
      const x2 = to.x + to.w / 2;
      const y2 = to.y;

      if (Math.abs(x1 - x2) < 2) {
        return { ...e, back, points: [{ x: x1, y: y1 }, { x: x2, y: y2 }], labelAt: { x: x1 + 8, y: (y1 + y2) / 2 } };
      }
      const midY = (y1 + y2) / 2;
      return {
        ...e,
        back,
        points: [
          { x: x1, y: y1 },
          { x: x1, y: midY },
          { x: x2, y: midY },
          { x: x2, y: y2 },
        ],
        labelAt: { x: (x1 + x2) / 2, y: midY - 6 },
      };
    }

    // Back edge: exit right, run up the reserved lane, re-enter from the right.
    const laneX = contentWidth + 32 + backLane / 2;
    const x1 = from.x + from.w;
    const y1 = from.y + from.h / 2;
    const x2 = to.x + to.w;
    const y2 = to.y + to.h / 2;

    return {
      ...e,
      back,
      points: [
        { x: x1, y: y1 },
        { x: laneX, y: y1 },
        { x: laneX, y: y2 },
        { x: x2, y: y2 },
      ],
      labelAt: { x: laneX - 4, y: (y1 + y2) / 2 },
    };
  });

  return { nodes: placed, edges: routed, width, height };
}

/** Structural problems worth surfacing in the maker rather than silently drawing. */
export function validateFlowchart(spec: FlowchartSpec): string[] {
  const issues: string[] = [];
  const ids = new Set(spec.nodes.map((n) => n.id));

  if (spec.nodes.length === 0) return ["The chart is empty."];
  if (!spec.nodes.some((n) => n.type === "start")) issues.push("No start node.");
  if (!spec.nodes.some((n) => n.type === "end")) issues.push("No end node.");

  const dupes = spec.nodes.map((n) => n.id).filter((id, i, arr) => arr.indexOf(id) !== i);
  if (dupes.length > 0) issues.push(`Duplicate node id: ${[...new Set(dupes)].join(", ")}.`);

  for (const e of spec.edges) {
    if (!ids.has(e.from)) issues.push(`Edge from unknown node "${e.from}".`);
    if (!ids.has(e.to)) issues.push(`Edge to unknown node "${e.to}".`);
  }

  // A decision with one exit is nearly always a mistake, and it is the most
  // common one when hand-authoring these.
  for (const n of spec.nodes.filter((x) => x.type === "decision")) {
    const outs = spec.edges.filter((e) => e.from === n.id);
    if (outs.length < 2) issues.push(`Decision "${n.text}" has ${outs.length} exit(s); it needs at least two.`);
    if (outs.length >= 2 && outs.some((o) => !o.label)) {
      issues.push(`Decision "${n.text}" has unlabelled branches.`);
    }
  }

  const reachable = new Set<string>();
  const start = spec.nodes.find((n) => n.type === "start") ?? spec.nodes[0];
  const queue = [start.id];
  reachable.add(start.id);
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const e of spec.edges.filter((x) => x.from === cur)) {
      if (!reachable.has(e.to)) {
        reachable.add(e.to);
        queue.push(e.to);
      }
    }
  }
  const orphans = spec.nodes.filter((n) => !reachable.has(n.id));
  if (orphans.length > 0) issues.push(`Unreachable from start: ${orphans.map((o) => o.text).join(", ")}.`);

  return issues;
}
