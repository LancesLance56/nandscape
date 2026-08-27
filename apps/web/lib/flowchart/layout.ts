/**
 * Flowchart layout.
 *
 * React Flow places nodes wherever it is told and routes the edges itself, so
 * this file only has to answer one question: where does each box go. That is
 * still the hard part for algorithm charts, because they are not DAGs. Every
 * loop is a back edge pointing at a box above it, and a naive layered layout
 * either stacks those nodes infinitely deep or refuses to place them at all.
 *
 * So the order is: classify edges (DFS, marking edges into a node still on the
 * stack as back edges), layer the remaining DAG by longest path, then place.
 * Back edges are left to React Flow, which draws them as a rounded detour once
 * this file tells it to attach both ends to the same side.
 *
 * Groups are laid out first and then treated as a single box by the main pass,
 * which keeps the layering logic unaware that nesting exists.
 */

import {
  defaultAccent,
  looksLikeCode,
  type FlowEdge,
  type FlowNode,
  type FlowSide,
  type FlowchartSpec,
} from "./types";

/* -------------------------------------------------------------------------
 * Geometry
 * ---------------------------------------------------------------------- */

const CHAR_W = 7.15;
// Tight-ish horizontal padding. In a left-to-right chart the box width is
// multiplied by every layer in the chain, so padding that looks generous on
// one box costs a couple of hundred pixels across the diagram.
const PAD_X = 20;
const BASE_H = 46;
const LINE_H = 16;
const DECISION_H = 64;
const MIN_W = 112;
const MAX_W = 280;

/** Between one layer and the next, along the direction of flow. */
const ROW_GAP = 40;
/** Between siblings sharing a layer, across the direction of flow. */
const COL_GAP = 40;

const GROUP_HEADER = 38;
const GROUP_PAD = 13;
const GROUP_GAP = 9;

const LANE_PAD = 26;
const LANE_HEADER = 40;

const MARGIN = 20;

/** Detour corridors: how far the first one sits from the boxes, and the gap between them. */
const CORRIDOR_BASE = 24;
const CORRIDOR_STEP = 20;
/** Extra room past the outermost corridor so its arrowhead is not clipped. */
const CORRIDOR_CLEAR = 18;
/** How far a detour runs straight out from its node before it may jog sideways. */
const STUB_LEN = 14;
/** Sideways separation between two detours' stubs, per rank. Small: it only
 * has to break an exact coincidence, not be visually prominent. */
const STUB_NUDGE = 7;

/**
 * One attachment point on a node's outline, in node-local coordinates.
 *
 * Every edge end gets its own slot rather than sharing a per-side centre.
 * Two arrows leaving the same box used to start at the same pixel and run
 * together until they diverged, which reads as one arrow until you look hard.
 */
export interface HandleSlot {
  id: string;
  side: FlowSide;
  type: "source" | "target";
  x: number;
  y: number;
}

export interface PlacedNode extends FlowNode {
  /** Relative to the parent group when `parentId` is set, absolute otherwise. */
  x: number;
  y: number;
  width: number;
  height: number;
  layer: number;
  slots: HandleSlot[];
}

export interface PlacedLane {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RoutedEdge extends FlowEdge {
  /** True when this edge closes a loop, i.e. points back up the chart. */
  back: boolean;
  fromSide: FlowSide;
  toSide: FlowSide;
  /** Slot ids on the two endpoints. */
  fromHandle: string;
  toHandle: string;
  /**
   * Absolute canvas coordinates for the rendered path, in order. Computed
   * here rather than left to React Flow's own smoothstep routing: that
   * router only takes a hint about how far a path travels before its first
   * turn, not a hard separation between two parallel corridors, and two
   * loops given different hints could still cross. Explicit points make
   * "these two lines never touch" a property of the numbers instead of a
   * hope about how a heuristic behaves.
   */
  points: { x: number; y: number }[];
  /** Where to centre the label, if this edge has one. */
  labelAt: { x: number; y: number };
}

export interface FlowchartLayout {
  nodes: PlacedNode[];
  edges: RoutedEdge[];
  lanes: PlacedLane[];
  width: number;
  height: number;
}

/** Text metrics for a leaf box. Groups are sized from their children instead. */
export function measureNode(node: FlowNode): { width: number; height: number } {
  if (node.size) return node.size;

  const lines = node.text.split("\n");
  const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);
  const mono = node.mono ?? looksLikeCode(node.text);
  // The mono face is wider per character, so the same string needs a wider box.
  const base = longest * (mono ? CHAR_W + 0.5 : CHAR_W) + PAD_X * 2;

  // Diamonds waste horizontal space at the top and bottom corners, so they
  // need to be wider than a rectangle holding the same text.
  const raw = node.type === "decision" ? base * 1.3 : base;
  const width = Math.min(MAX_W, Math.max(MIN_W, Math.round(raw)));

  const baseH = node.type === "decision" ? DECISION_H : BASE_H;
  const height = baseH + (lines.length - 1) * LINE_H + (node.badge ? 4 : 0);

  return { width, height };
}

/* -------------------------------------------------------------------------
 * Edge classification
 * ---------------------------------------------------------------------- */

/**
 * Classify edges by DFS. An edge into a node that is still on the recursion
 * stack closes a cycle, so it is a back edge and must be excluded before
 * layering, or the longest-path computation never terminates.
 */
function findBackEdges(edges: FlowEdge[], startId: string): Set<number> {
  const outgoing = new Map<string, number[]>();
  edges.forEach((e, i) => {
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
    const list = outgoing.get(frame.id) ?? [];

    if (frame.edgeIdx >= list.length) {
      state.set(frame.id, "black");
      stack.pop();
      continue;
    }

    const edgeIndex = list[frame.edgeIdx++];
    const target = edges[edgeIndex].to;
    const targetState = state.get(target);

    if (targetState === "gray") {
      back.add(edgeIndex);
    } else if (targetState === undefined) {
      state.set(target, "gray");
      stack.push({ id: target, edgeIdx: 0 });
    }
  }

  // Anything unreachable from start never got visited; treating its edges as
  // forward still lands those nodes somewhere rather than dropping them.
  return back;
}

/* -------------------------------------------------------------------------
 * Groups
 * ---------------------------------------------------------------------- */

interface GroupBox {
  width: number;
  height: number;
  children: { id: string; x: number; y: number; width: number; height: number }[];
}

/**
 * Size a group from its children and place them relative to its top-left
 * corner, which is the coordinate space React Flow expects for child nodes.
 */
function layoutGroup(group: FlowNode, children: FlowNode[]): GroupBox {
  const sized = children.map((c) => ({ node: c, ...measureNode(c) }));
  const row = group.groupLayout === "row";

  const childrenW = row
    ? sized.reduce((s, c) => s + c.width, 0) + GROUP_GAP * Math.max(sized.length - 1, 0)
    : Math.max(...sized.map((c) => c.width), MIN_W);
  const contentH = row
    ? Math.max(...sized.map((c) => c.height), BASE_H)
    : sized.reduce((s, c) => s + c.height, 0) + GROUP_GAP * Math.max(sized.length - 1, 0);

  // The header strip holds the group's own label, so children start below it.
  const headerText = group.text.trim();
  const headerH = headerText ? GROUP_HEADER : GROUP_PAD;

  // The box has to be at least as wide as that one-line header needs, or the
  // label wraps onto a second line and collides with the child sitting right
  // beneath it - the header height above assumes exactly one line.
  const headerW = headerText ? headerText.length * CHAR_W + GROUP_PAD * 2 : 0;
  const contentW = Math.max(childrenW, headerW);

  const placed: GroupBox["children"] = [];
  let cursor = row ? GROUP_PAD : headerH;

  for (const c of sized) {
    if (row) {
      placed.push({
        id: c.node.id,
        x: cursor,
        y: headerH + (contentH - c.height) / 2,
        width: c.width,
        height: c.height,
      });
      cursor += c.width + GROUP_GAP;
    } else {
      placed.push({
        id: c.node.id,
        x: GROUP_PAD + (contentW - c.width) / 2,
        y: cursor,
        width: c.width,
        height: c.height,
      });
      cursor += c.height + GROUP_GAP;
    }
  }

  return {
    width: contentW + GROUP_PAD * 2,
    height: headerH + contentH + GROUP_PAD,
    children: placed,
  };
}

/* -------------------------------------------------------------------------
 * Main layout
 * ---------------------------------------------------------------------- */

/**
 * A point on a diamond's outline, near the vertex for `side`.
 *
 * A decision box narrows to a point at each vertex, so the trick used for
 * rectangles — spread the arrows along the flat side — would leave them
 * floating in the empty corner. Instead they slide along the two diagonals
 * meeting at that vertex, which are straight lines and part of the shape.
 * `u` runs -1 to 1 across the available fan; 0 is the vertex itself.
 *
 * Needed because a busy decision can carry more arrows than it has vertices:
 * merge's "both sides non-empty?" test has five, two in from the loop body,
 * one in from the setup, and two branches out.
 */
function diamondPoint(side: FlowSide, u: number, w: number, h: number): { x: number; y: number } {
  const t = u * 0.4;
  const a = Math.abs(t);
  switch (side) {
    case "top":
      return { x: w / 2 + (t * w) / 2, y: (a * h) / 2 };
    case "bottom":
      return { x: w / 2 + (t * w) / 2, y: h - (a * h) / 2 };
    case "left":
      return { x: (a * w) / 2, y: h / 2 + (t * h) / 2 };
    default:
      return { x: w - (a * w) / 2, y: h / 2 + (t * h) / 2 };
  }
}

const EMPTY: FlowchartLayout = { nodes: [], edges: [], lanes: [], width: 0, height: 0 };

export function layoutFlowchart(spec: FlowchartSpec): FlowchartLayout {
  if (!spec.nodes || spec.nodes.length === 0) return EMPTY;

  const horizontal = spec.direction === "LR";
  const byId = new Map(spec.nodes.map((n) => [n.id, n]));
  const edges = spec.edges ?? [];

  /* --- groups ------------------------------------------------------- */

  const childrenOf = new Map<string, FlowNode[]>();
  for (const n of spec.nodes) {
    if (!n.parentId) continue;
    const list = childrenOf.get(n.parentId) ?? [];
    list.push(n);
    childrenOf.set(n.parentId, list);
  }

  const groupBoxes = new Map<string, GroupBox>();
  for (const n of spec.nodes) {
    if (n.type !== "group") continue;
    groupBoxes.set(n.id, layoutGroup(n, childrenOf.get(n.id) ?? []));
  }

  const sizeOf = (n: FlowNode): { width: number; height: number } => {
    const box = groupBoxes.get(n.id);
    return box ? { width: box.width, height: box.height } : measureNode(n);
  };

  /* --- project edges onto the top level ------------------------------ */

  /** Walk up to the outermost ancestor: layering happens between top-level boxes. */
  const rootOf = (id: string): string => {
    let cur = byId.get(id);
    const seen = new Set<string>();
    while (cur?.parentId && !seen.has(cur.id)) {
      seen.add(cur.id);
      cur = byId.get(cur.parentId);
    }
    return cur?.id ?? id;
  };

  const topLevel = spec.nodes.filter((n) => !n.parentId);
  if (topLevel.length === 0) return EMPTY;

  // Self-edges after projection (both endpoints inside one group) carry no
  // layering information, so they are dropped from the layering pass only.
  const projected = edges
    .map((e) => ({ from: rootOf(e.from), to: rootOf(e.to) }))
    .filter((e) => e.from !== e.to);

  const startNode =
    topLevel.find((n) => n.type === "start") ??
    topLevel.find((n) => !projected.some((e) => e.to === n.id)) ??
    topLevel[0];

  const backProjected = findBackEdges(projected, startNode.id);
  const forward = projected.filter((_, i) => !backProjected.has(i));

  /* --- layer by longest path ------------------------------------------ */

  const layer = new Map<string, number>();
  for (const n of topLevel) layer.set(n.id, 0);

  for (let iter = 0; iter < topLevel.length + 1; iter++) {
    let changed = false;
    for (const e of forward) {
      if (!layer.has(e.from) || !layer.has(e.to)) continue;
      const candidate = layer.get(e.from)! + 1;
      if (candidate > layer.get(e.to)!) {
        layer.set(e.to, candidate);
        changed = true;
      }
    }
    if (!changed) break;
  }

  /* --- assign cross-axis slots ---------------------------------------- */

  const lanes = spec.lanes ?? [];
  const laneIndex = new Map(lanes.map((l, i) => [l.id, i]));

  const byLayer = new Map<number, FlowNode[]>();
  for (const n of topLevel) {
    const l = layer.get(n.id) ?? 0;
    const list = byLayer.get(l) ?? [];
    list.push(n);
    byLayer.set(l, list);
  }
  const layerKeys = [...byLayer.keys()].sort((a, b) => a - b);

  // `along` is the axis the chart flows down; `across` is the other one.
  const along = (n: FlowNode) => (horizontal ? sizeOf(n).width : sizeOf(n).height);
  const across = (n: FlowNode) => (horizontal ? sizeOf(n).height : sizeOf(n).width);

  const placed: PlacedNode[] = [];

  /* Lane mode: the cross-axis position is dictated by lane membership, so
     every node in a lane lines up regardless of which layer it sits in. */
  if (lanes.length > 0) {
    const laneExtent = lanes.map((l) => {
      const members = topLevel.filter((n) => n.lane === l.id);
      const widest = members.reduce((m, n) => Math.max(m, across(n)), 0);
      return Math.max(l.width ?? 0, widest + LANE_PAD * 2, 160);
    });

    const laneStart: number[] = [];
    let cursor = MARGIN;
    for (const extent of laneExtent) {
      laneStart.push(cursor);
      cursor += extent;
    }
    const crossTotal = cursor - MARGIN;

    let alongCursor = MARGIN + LANE_HEADER;
    const layerStart = new Map<number, number>();

    for (const l of layerKeys) {
      const nodes = byLayer.get(l)!;
      const extent = Math.max(...nodes.map(along));
      layerStart.set(l, alongCursor);

      // Two nodes sharing a lane *and* a layer would overlap, so they fan out
      // within the lane rather than stacking on the same point.
      const perLane = new Map<number, FlowNode[]>();
      for (const n of nodes) {
        const li = laneIndex.get(n.lane ?? "") ?? 0;
        const list = perLane.get(li) ?? [];
        list.push(n);
        perLane.set(li, list);
      }

      for (const [li, members] of perLane) {
        const start = laneStart[li] ?? MARGIN;
        const extentAcross = laneExtent[li] ?? 160;
        const used = members.reduce((s, n) => s + across(n), 0) + COL_GAP * (members.length - 1);
        let crossCursor = start + (extentAcross - used) / 2;

        for (const n of members) {
          const size = sizeOf(n);
          const a = alongCursor + (extent - along(n)) / 2;
          placed.push({
            ...n,
            x: horizontal ? a : crossCursor,
            y: horizontal ? crossCursor : a,
            width: size.width,
            height: size.height,
            layer: l,
            slots: [],
          });
          crossCursor += across(n) + COL_GAP;
        }
      }

      alongCursor += extent + ROW_GAP;
    }

    const alongTotal = alongCursor - ROW_GAP + MARGIN;
    const placedLanes: PlacedLane[] = lanes.map((l, i) => ({
      id: l.id,
      label: l.label,
      x: horizontal ? MARGIN : laneStart[i],
      y: horizontal ? laneStart[i] : MARGIN,
      width: horizontal ? alongTotal - MARGIN : laneExtent[i],
      height: horizontal ? laneExtent[i] : alongTotal - MARGIN,
    }));

    return finish(spec, placed, groupBoxes, childrenOf, edges, backProjected, projected, horizontal, {
      lanes: placedLanes,
      width: horizontal ? alongTotal : crossTotal + MARGIN * 2,
      height: horizontal ? crossTotal + MARGIN * 2 : alongTotal,
    });
  }

  /* No lanes: centre each layer against the widest one. */
  const layerExtentAcross = new Map<number, number>();
  for (const l of layerKeys) {
    const nodes = byLayer.get(l)!;
    layerExtentAcross.set(l, nodes.reduce((s, n) => s + across(n), 0) + COL_GAP * (nodes.length - 1));
  }
  const crossTotal = Math.max(...layerExtentAcross.values(), MIN_W);

  let alongCursor = MARGIN;
  for (const l of layerKeys) {
    const nodes = byLayer.get(l)!;
    const extent = Math.max(...nodes.map(along));
    let crossCursor = MARGIN + (crossTotal - layerExtentAcross.get(l)!) / 2;

    for (const n of nodes) {
      const size = sizeOf(n);
      const a = alongCursor + (extent - along(n)) / 2;
      placed.push({
        ...n,
        x: horizontal ? a : crossCursor,
        y: horizontal ? crossCursor : a,
        width: size.width,
        height: size.height,
        layer: l,
        slots: [],
      });
      crossCursor += across(n) + COL_GAP;
    }

    alongCursor += extent + ROW_GAP;
  }

  const alongTotal = alongCursor - ROW_GAP + MARGIN;

  return finish(spec, placed, groupBoxes, childrenOf, edges, backProjected, projected, horizontal, {
    lanes: [],
    width: horizontal ? alongTotal : crossTotal + MARGIN * 2,
    height: horizontal ? crossTotal + MARGIN * 2 : alongTotal,
  });
}

/**
 * Adds group children (in parent-relative coordinates), applies any manual
 * position overrides, and picks an attachment side for every edge.
 */
function finish(
  spec: FlowchartSpec,
  placed: PlacedNode[],
  groupBoxes: Map<string, GroupBox>,
  childrenOf: Map<string, FlowNode[]>,
  edges: FlowEdge[],
  backProjected: Set<number>,
  projected: { from: string; to: string }[],
  horizontal: boolean,
  frame: { lanes: PlacedLane[]; width: number; height: number },
): FlowchartLayout {
  const out = [...placed];

  // Children come after their parent: React Flow requires a parent to be
  // declared before any node that names it.
  for (const [groupId, box] of groupBoxes) {
    const kids = childrenOf.get(groupId) ?? [];
    for (const child of kids) {
      const spot = box.children.find((c) => c.id === child.id);
      if (!spot) continue;
      out.push({
        ...child,
        x: spot.x,
        y: spot.y,
        width: spot.width,
        height: spot.height,
        // A child sits at its group's depth in the flow, not at zero. Routing
        // measures how many layers an edge spans to decide whether it needs a
        // detour corridor, so a child left at layer 0 makes every edge
        // touching it look like a long jump across the whole chart.
        layer: placed.find((n) => n.id === groupId)?.layer ?? 0,
        slots: [],
      });
    }
  }

  // A manual position wins over everything the layout just computed. That is
  // the whole contract of the editor's drag-to-place: what you dragged is
  // what ships.
  for (const n of out) {
    if (n.position) {
      n.x = n.position.x;
      n.y = n.position.y;
    }
  }

  /* --- edge sides ----------------------------------------------------- */

  // Back edges are re-derived per original edge: `projected` dropped the
  // within-group ones, so indices do not line up with `edges`.
  const backPairs = new Set<string>();
  projected.forEach((p, i) => {
    if (backProjected.has(i)) backPairs.add(`${p.from}->${p.to}`);
  });

  const byId = new Map(spec.nodes.map((n) => [n.id, n]));
  const rootOf = (id: string): string => {
    let cur = byId.get(id);
    const seen = new Set<string>();
    while (cur?.parentId && !seen.has(cur.id)) {
      seen.add(cur.id);
      cur = byId.get(cur.parentId);
    }
    return cur?.id ?? id;
  };

  const positionOf = new Map(out.map((n) => [n.id, n]));

  /** Absolute centre of a node, following the parent chain out of any group. */
  const centre = (id: string): { x: number; y: number } => {
    const n = positionOf.get(id);
    if (!n) return { x: 0, y: 0 };
    let x = n.x;
    let y = n.y;
    let p = n.parentId;
    const guard = new Set<string>();
    while (p && !guard.has(p)) {
      guard.add(p);
      const parent = positionOf.get(p);
      if (!parent) break;
      x += parent.x;
      y += parent.y;
      p = parent.parentId;
    }
    return { x: x + n.width / 2, y: y + n.height / 2 };
  };

  // Named by role rather than compass point, so the same logic serves both
  // directions: "ahead" is where the chart flows, the flanks are either side.
  const AHEAD: FlowSide = horizontal ? "right" : "bottom";
  const BEHIND: FlowSide = horizontal ? "left" : "top";
  const FLANK_POS: FlowSide = horizontal ? "bottom" : "right";
  const FLANK_NEG: FlowSide = horizontal ? "top" : "left";

  /** Position along the axis that runs across the flow. */
  const cross = (id: string) => (horizontal ? centre(id).y : centre(id).x);
  /** Position along the direction the chart flows. */
  const flow = (id: string) => (horizontal ? centre(id).x : centre(id).y);

  const routed: RoutedEdge[] = edges.map((e) => {
    const back = e.kind === "loop" || backPairs.has(`${rootOf(e.from)}->${rootOf(e.to)}`);

    let fromSide: FlowSide;
    let toSide: FlowSide;

    if (back) {
      // Both ends on the flank turns the loop into a rounded detour around
      // the outside of the chart instead of a line back through it.
      fromSide = FLANK_POS;
      toSide = FLANK_POS;
    } else {
      const a = positionOf.get(e.from);
      const b = positionOf.get(e.to);
      // Siblings, either two boxes sharing a layer or two children of the same
      // group. A group stacks its children across the flow rather than along
      // it, so an arrow between them is a short hop sideways: routing it
      // "onward" would send it out around the box it is pointing at.
      const sameParent = Boolean(a?.parentId) && a?.parentId === b?.parentId;
      const sameLayer = Boolean(a && b && ((a.layer === b.layer && !a.parentId && !b.parentId) || sameParent));

      if (sameLayer) {
        // A sideways hop within one layer should leave and enter sideways.
        const ascending = cross(e.from) < cross(e.to);
        fromSide = ascending ? FLANK_POS : FLANK_NEG;
        toSide = ascending ? FLANK_NEG : FLANK_POS;
      } else {
        fromSide = AHEAD;
        toSide = BEHIND;
      }
    }

    return {
      ...e,
      back,
      fromSide: e.fromSide ?? fromSide,
      toSide: e.toSide ?? toSide,
      fromHandle: "",
      toHandle: "",
      points: [],
      labelAt: { x: 0, y: 0 },
    };
  });

  /* --- corridors -------------------------------------------------------- */

  const span = (e: RoutedEdge) => {
    const a = positionOf.get(e.from);
    const b = positionOf.get(e.to);
    return a && b ? Math.abs(a.layer - b.layer) : 0;
  };

  // Two kinds of edge cannot travel between the boxes without running over
  // something: a loop going back the way it came, and a forward edge that
  // skips past whole layers. Both get sent around the outside instead, on
  // opposite flanks, which is exactly how these charts are drawn by hand.
  //
  // Within a flank they are nested by span, shortest hugging the boxes and
  // longest furthest out - each at its own fixed distance from the node band,
  // which is what actually keeps them from ever touching. How far out each
  // one sits is recorded in `corridorDepth` and turned into real coordinates
  // once every node's final position is known, in the point-building pass.
  const corridorDepth = new Map<RoutedEdge, number>();
  // Depth alone separates the *horizontal* run of each detour, but two
  // detours can still leave their (different) source nodes at nearly the
  // same coordinate on the other axis - two boxes of slightly different
  // width, stacked in the same column, routinely land their exit points
  // within a pixel of each other. Rank gives each one, on top of its own
  // depth, a small deterministic sideways nudge for the stub nearest each
  // node, so that coincidence can no longer make two verticals coincide too.
  const corridorRank = new Map<RoutedEdge, number>();
  const assignCorridor = (group: RoutedEdge[], side: FlowSide): number => {
    if (group.length === 0) return 0;
    [...group]
      .sort((a, b) => span(a) - span(b))
      .forEach((e, i) => {
        e.fromSide = side;
        e.toSide = side;
        corridorDepth.set(e, CORRIDOR_BASE + i * CORRIDOR_STEP);
        corridorRank.set(e, i);
      });
    return CORRIDOR_BASE + (group.length - 1) * CORRIDOR_STEP + CORRIDOR_CLEAR;
  };

  const loops = routed.filter((e) => e.back);
  const skips = routed.filter((e) => !e.back && span(e) > 1);

  const posDepth = assignCorridor(loops, FLANK_POS);
  const negDepth = assignCorridor(skips, FLANK_NEG);

  const detours = new Set<RoutedEdge>([...loops, ...skips]);

  /* --- decision fan-out ------------------------------------------------- */

  // A diamond has vertices, not flat sides, so two arrows leaving "the bottom"
  // both start at the same single point. Branches are therefore pushed onto
  // different vertices: the straightest continuation carries on ahead and the
  // rest peel off sideways. Both flanks are already spoken for by the
  // corridors above, so those sides are claimed before any branch looks.
  // Claims are per side *and* per direction. An arrow arriving at a vertex and
  // an arrow leaving it are not competing for the same thing: they point
  // opposite ways, and the fan below already separates them along the
  // diamond's edge. Treating them as one claim used to push a branch onto the
  // wrong flank and send it back across the chart to reach a target sitting
  // right beside it.
  const claimed = new Set<string>();
  const claim = (nodeId: string, role: "out" | "in", preferred: FlowSide[]): FlowSide => {
    const key = (s: FlowSide) => `${nodeId}|${role}|${s}`;
    const chosen = preferred.find((s) => !claimed.has(key(s))) ?? preferred[0];
    claimed.add(key(chosen));
    return chosen;
  };

  const isDecision = (id: string) => positionOf.get(id)?.type === "decision";

  for (const e of [...loops, ...skips]) {
    if (isDecision(e.from)) claim(e.from, "out", [e.fromSide]);
    if (isDecision(e.to)) claim(e.to, "in", [e.toSide]);
  }

  const forwardOuts = new Map<string, RoutedEdge[]>();
  for (const e of routed) {
    if (e.back || span(e) > 1 || !isDecision(e.from)) continue;
    const list = forwardOuts.get(e.from) ?? [];
    list.push(e);
    forwardOuts.set(e.from, list);
  }

  for (const [nodeId, list] of forwardOuts) {
    if (list.length < 2) continue;
    const here = cross(nodeId);
    // Straightest first: whichever target sits most directly ahead keeps the
    // main vertex, and the others are pushed out to the flanks.
    const ordered = [...list].sort(
      (a, b) => Math.abs(cross(a.to) - here) - Math.abs(cross(b.to) - here),
    );
    ordered.forEach((e, i) => {
      if (i === 0) {
        e.fromSide = claim(nodeId, "out", [AHEAD, FLANK_NEG, FLANK_POS]);
        return;
      }
      // Leave by the flank the target actually lies toward. Picking the other
      // one makes the arrow set off away from where it is going.
      const leans: FlowSide[] = cross(e.to) < here ? [FLANK_NEG, FLANK_POS] : [FLANK_POS, FLANK_NEG];
      e.fromSide = claim(nodeId, "out", [...leans, AHEAD]);
    });
  }

  /* --- room for the corridors ------------------------------------------ */

  // The detours run outside the boxes, so the drawing is bigger than the boxes
  // are. Without this the canvas would fit itself to the nodes and clip every
  // loop, and every long edge, straight off the edge.
  if (negDepth > 0) {
    for (const n of out) {
      if (n.parentId) continue;
      if (horizontal) n.y += negDepth;
      else n.x += negDepth;
    }
    for (const lane of frame.lanes) {
      if (horizontal) lane.y += negDepth;
      else lane.x += negDepth;
    }
  }

  /* --- handle slots ----------------------------------------------------- */

  interface EdgeEnd {
    edge: RoutedEdge;
    end: "from" | "to";
    side: FlowSide;
  }

  const bySide = new Map<string, EdgeEnd[]>();
  const record = (nodeId: string, end: EdgeEnd) => {
    const key = `${nodeId}|${end.side}`;
    const list = bySide.get(key) ?? [];
    list.push(end);
    bySide.set(key, list);
  };

  for (const e of routed) {
    if (positionOf.has(e.from)) record(e.from, { edge: e, end: "from", side: e.fromSide });
    if (positionOf.has(e.to)) record(e.to, { edge: e, end: "to", side: e.toSide });
  }

  const slotsFor = new Map<string, HandleSlot[]>();

  for (const [key, ends] of bySide) {
    const nodeId = key.slice(0, key.lastIndexOf("|"));
    const side = key.slice(key.lastIndexOf("|") + 1) as FlowSide;
    const node = positionOf.get(nodeId)!;
    const alongWidth = side === "top" || side === "bottom";
    const extent = alongWidth ? node.width : node.height;

    // Order the ends by where their opposite endpoint sits, so the arrows fan
    // out without crossing over each other on the way.
    const ordered = [...ends].sort((a, b) => {
      const other = (x: EdgeEnd) => (x.end === "from" ? x.edge.to : x.edge.from);
      const pos = (id: string) => (alongWidth ? centre(id).x : centre(id).y);
      return pos(other(a)) - pos(other(b));
    });

    const list = slotsFor.get(nodeId) ?? [];
    const n = ordered.length;

    ordered.forEach((endRef, i) => {
      const id = `${endRef.end === "from" ? "s" : "t"}-${side}-${i}`;

      // A detour meets its box off-centre, a little way along in the direction
      // it travelled, rather than dead in the middle of the side. Two boxes in
      // neighbouring layers can easily share a centre line, and when they do a
      // loop leaving one and a skip arriving at the other are drawn on top of
      // each other for the whole of that final approach.
      const lead = (() => {
        // Only meaningful when this side is spread along the direction of
        // travel, which is exactly when the side is one of the two flanks.
        if (!detours.has(endRef.edge) || n !== 1 || alongWidth !== horizontal) return 0.5;
        const other = endRef.end === "from" ? endRef.edge.to : endRef.edge.from;
        const self = endRef.end === "from" ? endRef.edge.from : endRef.edge.to;
        return flow(other) >= flow(self) ? 0.66 : 0.34;
      })();

      const point =
        node.type === "decision"
          ? diamondPoint(side, n === 1 ? 0 : (2 * i) / (n - 1) - 1, node.width, node.height)
          : (() => {
              const t = n === 1 ? lead : (i + 1) / (n + 1);
              const along = t * extent;
              return {
                x: alongWidth ? along : side === "left" ? 0 : node.width,
                y: alongWidth ? (side === "top" ? 0 : node.height) : along,
              };
            })();

      list.push({
        id,
        side,
        type: endRef.end === "from" ? "source" : "target",
        x: point.x,
        y: point.y,
      });

      if (endRef.end === "from") endRef.edge.fromHandle = id;
      else endRef.edge.toHandle = id;
    });
    slotsFor.set(nodeId, list);
  }

  for (const n of out) n.slots = slotsFor.get(n.id) ?? [];

  /* --- explicit edge paths ----------------------------------------------- */

  // Every node is at its final position and every slot is placed, so each
  // edge's exact endpoints in canvas coordinates are now knowable. This is
  // where "the path never overlaps another one" actually gets guaranteed:
  // detours travel to a fixed line at a fixed distance from the node band,
  // one distance per edge, so two of them are parallel lines that never meet.
  const isVerticalSide = (side: FlowSide) => side === "top" || side === "bottom";

  /** Absolute position of one endpoint's attachment slot. */
  const slotPoint = (nodeId: string, handleId: string): { x: number; y: number } => {
    const n = positionOf.get(nodeId);
    if (!n) return { x: 0, y: 0 };
    const origin = { x: centre(nodeId).x - n.width / 2, y: centre(nodeId).y - n.height / 2 };
    const slot = n.slots.find((s) => s.id === handleId);
    if (!slot) return centre(nodeId);
    return { x: origin.x + slot.x, y: origin.y + slot.y };
  };

  type Pt = { x: number; y: number };
  type Seg = { a: Pt; b: Pt };

  const straight = (p0: Pt, p1: Pt) => ({
    points: [p0, p1],
    labelAt: { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 },
  });
  const bent = (p0: Pt, m0: Pt, m1: Pt, p1: Pt) => ({
    points: [p0, m0, m1, p1],
    labelAt: { x: (m0.x + m1.x) / 2, y: (m0.y + m1.y) / 2 },
  });

  const segsOf = (points: Pt[]): Seg[] => {
    const out: Seg[] = [];
    for (let i = 0; i < points.length - 1; i++) out.push({ a: points[i], b: points[i + 1] });
    return out;
  };

  /** Length two axis-aligned segments run exactly coincident, not merely crossing. */
  const coincidentLength = (s1: Seg, s2: Seg): number => {
    const horiz = (s: Seg) => Math.abs(s.a.y - s.b.y) < 0.5;
    const vert = (s: Seg) => Math.abs(s.a.x - s.b.x) < 0.5;
    if (horiz(s1) && horiz(s2) && Math.abs(s1.a.y - s2.a.y) < 2) {
      const lo1 = Math.min(s1.a.x, s1.b.x);
      const hi1 = Math.max(s1.a.x, s1.b.x);
      const lo2 = Math.min(s2.a.x, s2.b.x);
      const hi2 = Math.max(s2.a.x, s2.b.x);
      return Math.max(0, Math.min(hi1, hi2) - Math.max(lo1, lo2));
    }
    if (vert(s1) && vert(s2) && Math.abs(s1.a.x - s2.a.x) < 2) {
      const lo1 = Math.min(s1.a.y, s1.b.y);
      const hi1 = Math.max(s1.a.y, s1.b.y);
      const lo2 = Math.min(s2.a.y, s2.b.y);
      const hi2 = Math.max(s2.a.y, s2.b.y);
      return Math.max(0, Math.min(hi1, hi2) - Math.max(lo1, lo2));
    }
    return 0;
  };

  /**
   * The staple shape for one detour: node, out-and-over in one short
   * diagonal move, straight to the shared corridor line, across, and the
   * mirror image back in.
   *
   * The nudge is folded into that very first move rather than added after a
   * separate straight stub. A separate stub sounds tidier, but it is then a
   * segment collision resolution cannot touch - it is anchored at the node's
   * true attach point on one end and does not depend on `nudge` at all - so
   * a coincidence landing there could never be nudged away. Folding it in
   * costs a very slight diagonal exactly when, and only when, a nudge is
   * actually in effect; at nudge 0, the common case, it is still a clean
   * orthogonal line.
   */
  const buildDetour = (p0: Pt, p1: Pt, side: FlowSide, cross0: number, nudge: number): Pt[] => {
    const sign = side === FLANK_POS ? 1 : -1;
    if (isVerticalSide(side)) {
      const s0 = { x: p0.x + nudge, y: p0.y + sign * STUB_LEN };
      const s1 = { x: p1.x + nudge, y: p1.y + sign * STUB_LEN };
      return [p0, s0, { x: s0.x, y: cross0 }, { x: s1.x, y: cross0 }, s1, p1];
    }
    const s0 = { x: p0.x + sign * STUB_LEN, y: p0.y + nudge };
    const s1 = { x: p1.x + sign * STUB_LEN, y: p1.y + nudge };
    return [p0, s0, { x: cross0, y: s0.y }, { x: cross0, y: s1.y }, s1, p1];
  };

  // The node band's extent on the cross axis, measured after every shift -
  // this is what a detour's fixed distance is measured from.
  const topLevelOut = out.filter((n) => !n.parentId);
  const bandMin = horizontal
    ? Math.min(...topLevelOut.map((n) => n.y))
    : Math.min(...topLevelOut.map((n) => n.x));
  const bandMax = horizontal
    ? Math.max(...topLevelOut.map((n) => n.y + n.height))
    : Math.max(...topLevelOut.map((n) => n.x + n.width));

  // Segments of every detour placed so far, so each new one can be checked
  // against all of them - not just the ones sharing its own flank. Rank
  // separates loops from other loops and skips from other skips, but two
  // *different* nodes' own widths can still, by pure coincidence, place an
  // unrelated pair of stubs within a pixel of each other.
  const placedDetourSegs: Seg[] = [];

  for (const e of routed) {
    const p0 = slotPoint(e.from, e.fromHandle);
    const p1 = slotPoint(e.to, e.toHandle);
    const depth = corridorDepth.get(e);

    if (depth !== undefined) {
      // A detour: a short straight stub out from each node (respecting its
      // tangent), a small sideways jog so the stub cannot coincide with
      // another detour's, then straight to the shared corridor line, across,
      // and the mirror image back in. The jog starts at this edge's rank
      // within its own flank and grows, verified rather than assumed, until
      // the whole path is clear of every detour already placed.
      const cross0 = e.fromSide === FLANK_POS ? bandMax + depth : bandMin - depth;
      const rank = corridorRank.get(e) ?? 0;
      const sign = e.fromSide === FLANK_POS ? 1 : -1;

      let nudge = rank * STUB_NUDGE * sign;
      let points = buildDetour(p0, p1, e.fromSide, cross0, nudge);

      for (let attempt = 0; attempt < 12; attempt++) {
        const segs = segsOf(points);
        const collides = segs.some((s) => placedDetourSegs.some((o) => coincidentLength(s, o) > 4));
        if (!collides) break;
        nudge += STUB_NUDGE * sign;
        points = buildDetour(p0, p1, e.fromSide, cross0, nudge);
      }

      placedDetourSegs.push(...segsOf(points));
      e.points = points;
      e.labelAt = { x: (points[2].x + points[3].x) / 2, y: (points[2].y + points[3].y) / 2 };
      continue;
    }

    const v0 = isVerticalSide(e.fromSide);
    const v1 = isVerticalSide(e.toSide);
    let built: { points: Pt[]; labelAt: Pt };

    if (v0 === v1) {
      // Both stubs leave along the same axis: bend through the shared
      // midline on the other axis, or go straight if already aligned.
      if (v0) {
        built =
          Math.abs(p0.x - p1.x) < 2
            ? straight(p0, p1)
            : bent(p0, { x: p0.x, y: (p0.y + p1.y) / 2 }, { x: p1.x, y: (p0.y + p1.y) / 2 }, p1);
      } else {
        built =
          Math.abs(p0.y - p1.y) < 2
            ? straight(p0, p1)
            : bent(p0, { x: (p0.x + p1.x) / 2, y: p0.y }, { x: (p0.x + p1.x) / 2, y: p1.y }, p1);
      }
    } else {
      // One stub vertical, one horizontal: a single corner where they meet
      // connects them with exactly one bend. The corner has to share the
      // vertical-tangent point's x (so that first leg is vertical) and the
      // horizontal-tangent point's y (so the second leg is horizontal).
      const corner = v0 ? { x: p0.x, y: p1.y } : { x: p1.x, y: p0.y };
      built = { points: [p0, corner, p1], labelAt: corner };
    }

    e.points = built.points;
    e.labelAt = built.labelAt;
  }

  // Manual positions can push boxes past the computed frame, so the canvas
  // size is the union of the two rather than the layout's own guess.
  let width = frame.width + (horizontal ? 0 : negDepth + posDepth);
  let height = frame.height + (horizontal ? negDepth + posDepth : 0);
  for (const n of out) {
    if (n.parentId) continue;
    width = Math.max(width, n.x + n.width + MARGIN + (horizontal ? 0 : posDepth));
    height = Math.max(height, n.y + n.height + MARGIN + (horizontal ? posDepth : 0));
  }

  return { nodes: out, edges: routed, lanes: frame.lanes, width, height };
}

/** Node types in use, for the auto-derived legend. */
export function usedNodeTypes(spec: FlowchartSpec): string[] {
  const seen = new Set<string>();
  for (const n of spec.nodes) {
    if (n.type === "start" || n.type === "end") seen.add("terminal");
    else seen.add(n.type);
  }
  return [...seen];
}

export { defaultAccent };
