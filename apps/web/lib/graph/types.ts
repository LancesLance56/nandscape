/**
 * Shared vocabulary for every graph teaching widget (explorer, traversal,
 * shortest path, MST, SCC). Coordinates live in the same space the canvas
 * renders into (see GRAPH_VIEWBOX in graph-canvas.tsx), so a tutorial author
 * places nodes directly rather than relying on an auto-layout that could
 * reshuffle a carefully drawn example between renders.
 */

export interface GraphNode {
  id: string;
  x: number;
  y: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  weight?: number;
}

export interface GraphSpec {
  nodes: GraphNode[];
  edges: GraphEdge[];
  directed?: boolean;
  weighted?: boolean;
}

/** Stable key for an edge, direction-insensitive for undirected graphs. */
export function edgeKey(from: string, to: string, directed: boolean): string {
  if (directed) return `${from}->${to}`;
  return from < to ? `${from}--${to}` : `${to}--${from}`;
}

/**
 * One frame of an algorithm run. Every widget renders the same shape, so the
 * canvas and the step player stay algorithm-agnostic and each algorithm only
 * has to describe *what it did*, not how to draw it.
 */
export interface AlgorithmStep {
  /** Plain-language narration of this single frame. */
  caption: string;
  /** Nodes finished with (drawn solid). */
  visited: string[];
  /** The node being processed right now (drawn highlighted). */
  active: string | null;
  /** Queue / stack / candidate set contents, in order. */
  frontier: string[];
  /** Edges committed to the result (traversal tree, MST, shortest path tree). */
  treeEdges: string[];
  /** Edge under consideration this frame (drawn dashed + highlighted). */
  consideredEdge: string | null;
  /** Edge examined and rejected (drawn faded/struck). */
  rejectedEdges: string[];
  /** Per-node numeric readout: Dijkstra distances, Tarjan disc/low, etc. */
  table?: Record<string, string>;
  /** Groups of nodes to tint as one unit (union-find components, SCCs). */
  groups?: string[][];
}

export function nodeMap(graph: GraphSpec): Map<string, GraphNode> {
  return new Map(graph.nodes.map((n) => [n.id, n]));
}

/** Adjacency list. Undirected graphs get both directions inserted. */
export function adjacency(graph: GraphSpec): Map<string, { to: string; weight: number }[]> {
  const adj = new Map<string, { to: string; weight: number }[]>();
  for (const n of graph.nodes) adj.set(n.id, []);

  for (const e of graph.edges) {
    const w = e.weight ?? 1;
    adj.get(e.from)?.push({ to: e.to, weight: w });
    if (!graph.directed) adj.get(e.to)?.push({ to: e.from, weight: w });
  }

  // Neighbours in a stable alphabetical order - a traversal demo that visits
  // nodes in a different order on every reload teaches nothing.
  for (const list of adj.values()) list.sort((a, b) => a.to.localeCompare(b.to));
  return adj;
}

export function formatList(items: string[]): string {
  if (items.length === 0) return "nothing";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
