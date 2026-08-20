"use client";

import { edgeKey, nodeMap, type AlgorithmStep, type GraphSpec } from "@/lib/graph/types";

export const GRAPH_WIDTH = 440;
export const GRAPH_HEIGHT = 260;
/** Exported so the graph editor (components/blog-editor/widgets/graph-spec-editor.tsx)
 *  places and hit-tests nodes against the exact same radius this canvas draws them at. */
export const NODE_R = 17;
/** How far a reciprocal edge (A→B alongside B→A) bows away from the straight line. */
const CURVE = 22;
/** Breathing room between a group's outermost node and its hull edge. */
const HULL_PAD = 26;

/**
 * Warm, on-brand tints for grouped nodes (union-find components, SCCs).
 * Deliberately no blues or purples - see the tutorials-showcase palette note.
 */
const GROUP_COLORS = ["#C15A2A", "#4CAF7D", "#E0A339", "#B25A3B", "#8A8F5C", "#D9694F"];

interface GraphCanvasProps {
  graph: GraphSpec;
  step?: AlgorithmStep;
  /** Called when a node is clicked, e.g. to pick a traversal start node. */
  onNodeClick?: (id: string) => void;
  /** Ring this node (the chosen source) even when no step is active. */
  markedNode?: string | null;
  height?: number;
  /**
   * Draw a translucent region behind each group in `step.groups`. Worth it
   * for SCCs, where "these nodes are one unit" is the entire lesson. Left off
   * for things like Kruskal's union-find components, whose members are
   * scattered across the canvas and would produce overlapping boxes.
   */
  groupHulls?: boolean;
  /** Prefix for the hull labels, e.g. "SCC" renders "SCC 1", "SCC 2". */
  groupLabel?: string;
}

/**
 * One SVG renderer for every graph widget. It knows nothing about which
 * algorithm is running: it just paints whatever an AlgorithmStep describes,
 * which is what keeps BFS, Dijkstra, Kruskal and Tarjan from each growing
 * their own slightly-different drawing code.
 */
export function GraphCanvas({
  graph,
  step,
  onNodeClick,
  markedNode,
  height,
  groupHulls,
  groupLabel = "Group",
}: GraphCanvasProps) {
  const nodes = nodeMap(graph);
  const directed = Boolean(graph.directed);

  const visited = new Set(step?.visited ?? []);
  const treeEdges = new Set(step?.treeEdges ?? []);
  const rejected = new Set(step?.rejectedEdges ?? []);
  const frontier = new Set(step?.frontier ?? []);

  const groupOf = new Map<string, number>();
  step?.groups?.forEach((group, i) => {
    for (const id of group) groupOf.set(id, i);
  });

  // A→B drawn on top of B→A is unreadable, so reciprocal pairs bow apart.
  const directedPairs = new Set(graph.edges.map((e) => `${e.from}->${e.to}`));

  const nodeFill = (id: string): string => {
    const g = groupOf.get(id);
    if (g !== undefined) return GROUP_COLORS[g % GROUP_COLORS.length];
    if (step?.active === id) return "var(--copper)";
    if (visited.has(id)) return "var(--signal-green)";
    if (frontier.has(id)) return "var(--copper-bg)";
    return "var(--surface-2)";
  };

  const nodeTextFill = (id: string): string => {
    const g = groupOf.get(id);
    if (g !== undefined) return "#ffffff";
    if (step?.active === id || visited.has(id)) return "#ffffff";
    return "var(--ink)";
  };

  const nodeStroke = (id: string): string => {
    if (markedNode === id) return "var(--copper-dark)";
    if (step?.active === id) return "var(--copper-dark)";
    if (groupOf.has(id)) return "transparent";
    return "var(--border-strong)";
  };

  return (
    <svg
      viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
      style={height ? { height } : undefined}
      className="w-full"
      role="img"
      aria-label="Graph diagram"
    >
      <defs>
        <marker id="graph-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--border-strong)" />
        </marker>
        <marker id="graph-arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--copper)" />
        </marker>
        <marker id="graph-arrow-tree" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--signal-green)" />
        </marker>
      </defs>

      {/* Behind everything, so nodes and edges stay fully legible on top. */}
      {groupHulls &&
        step?.groups?.map((group, i) => {
          const pts = group.map((id) => nodes.get(id)).filter((n): n is NonNullable<typeof n> => Boolean(n));
          if (pts.length === 0) return null;

          const color = GROUP_COLORS[i % GROUP_COLORS.length];
          const minX = Math.min(...pts.map((p) => p.x)) - HULL_PAD;
          const maxX = Math.max(...pts.map((p) => p.x)) + HULL_PAD;
          const minY = Math.min(...pts.map((p) => p.y)) - HULL_PAD;
          const maxY = Math.max(...pts.map((p) => p.y)) + HULL_PAD;

          return (
            <g key={`hull-${group.join("-")}`} className="transition-all duration-300">
              <rect
                x={minX}
                y={minY}
                width={maxX - minX}
                height={maxY - minY}
                rx={20}
                fill={color}
                fillOpacity={0.12}
                stroke={color}
                strokeOpacity={0.55}
                strokeWidth={1.5}
                strokeDasharray="6 4"
              />
              {/* Bottom-left, because the arrival/lowlink readouts sit above
                  each node and would collide with a top-aligned label. */}
              <text x={minX + 9} y={maxY - 7} className="text-[10px] font-bold" fill={color} opacity={0.9}>
                {groupLabel} {i + 1}
              </text>
            </g>
          );
        })}

      {graph.edges.map((e) => {
        const a = nodes.get(e.from);
        const b = nodes.get(e.to);
        if (!a || !b) return null;

        const key = edgeKey(e.from, e.to, directed);
        const isTree = treeEdges.has(key);
        const isConsidered = step?.consideredEdge === key;
        const isRejected = rejected.has(key);

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;

        const reciprocal = directed && directedPairs.has(`${e.to}->${e.from}`);

        let d: string;
        let labelX: number;
        let labelY: number;

        if (reciprocal) {
          // Bow the edge out along the perpendicular so the opposite
          // direction has its own visible lane.
          const cx = (a.x + b.x) / 2 - uy * CURVE;
          const cy = (a.y + b.y) / 2 + ux * CURVE;

          // Trim both ends toward the control point so the arrowhead meets
          // the rim along the curve rather than cutting across the circle.
          const da = Math.hypot(cx - a.x, cy - a.y) || 1;
          const db = Math.hypot(cx - b.x, cy - b.y) || 1;
          const x1 = a.x + ((cx - a.x) / da) * NODE_R;
          const y1 = a.y + ((cy - a.y) / da) * NODE_R;
          const x2 = b.x + ((cx - b.x) / db) * NODE_R;
          const y2 = b.y + ((cy - b.y) / db) * NODE_R;

          d = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
          // Quadratic Bézier midpoint at t = 0.5.
          labelX = 0.25 * x1 + 0.5 * cx + 0.25 * x2;
          labelY = 0.25 * y1 + 0.5 * cy + 0.25 * y2;
        } else {
          const x1 = a.x + ux * NODE_R;
          const y1 = a.y + uy * NODE_R;
          const x2 = b.x - ux * NODE_R;
          const y2 = b.y - uy * NODE_R;
          d = `M ${x1} ${y1} L ${x2} ${y2}`;
          labelX = (a.x + b.x) / 2;
          labelY = (a.y + b.y) / 2;
        }

        const stroke = isConsidered
          ? "var(--copper)"
          : isTree
            ? "var(--signal-green)"
            : isRejected
              ? "var(--border)"
              : "var(--border-strong)";

        const marker = directed
          ? isConsidered
            ? "url(#graph-arrow-active)"
            : isTree
              ? "url(#graph-arrow-tree)"
              : "url(#graph-arrow)"
          : undefined;

        return (
          <g key={`${e.from}-${e.to}`}>
            <path
              d={d}
              fill="none"
              stroke={stroke}
              strokeWidth={isTree || isConsidered ? 3 : 1.75}
              strokeDasharray={isConsidered ? "6 4" : isRejected ? "3 4" : undefined}
              markerEnd={marker}
              opacity={isRejected ? 0.45 : 1}
            />
            {graph.weighted && e.weight !== undefined && (
              <g>
                <circle
                  cx={labelX}
                  cy={labelY}
                  r={10}
                  fill="var(--surface-card)"
                  stroke={stroke}
                  strokeWidth={1}
                  opacity={isRejected ? 0.5 : 1}
                />
                <text
                  x={labelX}
                  y={labelY + 3.5}
                  textAnchor="middle"
                  className="text-[10px] font-bold"
                  fill={isTree || isConsidered ? stroke : "var(--ink-soft)"}
                  opacity={isRejected ? 0.5 : 1}
                >
                  {e.weight}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {graph.nodes.map((n) => (
        <g
          key={n.id}
          onClick={onNodeClick ? () => onNodeClick(n.id) : undefined}
          style={onNodeClick ? { cursor: "pointer" } : undefined}
        >
          {markedNode === n.id && (
            <circle cx={n.x} cy={n.y} r={NODE_R + 4} fill="none" stroke="var(--copper)" strokeWidth={1.5} strokeDasharray="3 3" />
          )}
          <circle
            cx={n.x}
            cy={n.y}
            r={NODE_R}
            fill={nodeFill(n.id)}
            stroke={nodeStroke(n.id)}
            strokeWidth={2}
            className="transition-all duration-300"
          />
          <text
            x={n.x}
            y={n.y + 4.5}
            textAnchor="middle"
            className="text-[13px] font-bold"
            fill={nodeTextFill(n.id)}
            style={{ pointerEvents: "none" }}
          >
            {n.id}
          </text>
          {step?.table?.[n.id] !== undefined && step.table[n.id] !== "-" && (
            <text
              x={n.x}
              y={n.y - NODE_R - 6}
              textAnchor="middle"
              className="text-[11px] font-bold"
              fill="var(--copper-dark)"
              style={{ pointerEvents: "none" }}
            >
              {step.table[n.id]}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
