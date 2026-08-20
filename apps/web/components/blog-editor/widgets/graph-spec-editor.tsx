"use client";

import { useId, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, fieldInputClass } from "@/components/blog-editor/fields/field";
import { GRAPH_HEIGHT, GRAPH_WIDTH, NODE_R } from "@/components/content/blocks/interactive/graph/graph-canvas";
import { edgeKey, type GraphEdge, type GraphNode, type GraphSpec } from "@/lib/graph/types";

/**
 * Point-and-click authoring for a GraphSpec, shared by every widget that
 * takes `data.graph`. Before this, placing a node meant guessing pixel
 * coordinates in a hand-written script and reloading to see if they
 * clipped the canvas edge - see the Dijkstra tutorial's node-E incident,
 * where a node placed exactly at the viewBox width got its right edge cut
 * off. Clicking a point on the same canvas the reader will see cannot
 * produce that class of bug.
 */

type Mode = "node" | "edge" | "move" | "erase";

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: "node", label: "Add node", hint: "Click empty canvas to place a node." },
  { id: "edge", label: "Draw edge", hint: "Drag from one node to another to connect them." },
  { id: "move", label: "Move", hint: "Drag a node to reposition it. Click one to rename or delete it." },
  { id: "erase", label: "Erase", hint: "Click a node or edge to delete it." },
];

function clampX(x: number): number {
  return Math.min(GRAPH_WIDTH - NODE_R, Math.max(NODE_R, x));
}
function clampY(y: number): number {
  return Math.min(GRAPH_HEIGHT - NODE_R, Math.max(NODE_R, y));
}

/** Next free id in A, B, ... Z, AA, AB, ... order. */
function nextNodeId(existing: Set<string>): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const ch of letters) if (!existing.has(ch)) return ch;
  for (const a of letters) for (const b of letters) if (!existing.has(a + b)) return a + b;
  return `N${existing.size}`;
}

function toSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const loc = pt.matrixTransform(ctm.inverse());
  return { x: loc.x, y: loc.y };
}

function nodeAt(nodes: GraphNode[], x: number, y: number): GraphNode | null {
  // Last-drawn (last in the array) wins on overlap, matching what the eye sees.
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    if (Math.hypot(n.x - x, n.y - y) <= NODE_R) return n;
  }
  return null;
}

type DragState =
  | { kind: "move"; id: string; moved: boolean }
  | { kind: "edge"; from: string; x: number; y: number }
  | null;

export interface GraphSpecEditorProps {
  graph: GraphSpec;
  onChange: (graph: GraphSpec) => void;
  /** Hidden for widgets that only ever run on undirected, unweighted graphs. */
  showDirectedToggle?: boolean;
  showWeightedToggle?: boolean;
}

export function GraphSpecEditor({
  graph,
  onChange,
  showDirectedToggle = true,
  showWeightedToggle = true,
}: GraphSpecEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const arrowId = useId();
  const [mode, setMode] = useState<Mode>("node");
  const [drag, setDrag] = useState<DragState>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedEdgeIndex, setSelectedEdgeIndex] = useState<number | null>(null);
  const [nodeIdDraft, setNodeIdDraft] = useState("");

  const directed = graph.directed === true;
  const weighted = graph.weighted === true;

  const setNodes = (nodes: GraphNode[]) => onChange({ ...graph, nodes });
  const setEdges = (edges: GraphEdge[]) => onChange({ ...graph, edges });

  const addNode = (x: number, y: number) => {
    const id = nextNodeId(new Set(graph.nodes.map((n) => n.id)));
    setNodes([...graph.nodes, { id, x: clampX(x), y: clampY(y) }]);
  };

  const removeNode = (id: string) => {
    // One onChange, not two: setNodes and setEdges each spread the same
    // `graph` closure, so calling them back to back had the second call's
    // spread silently overwrite the first call's update with the
    // pre-deletion node list.
    onChange({
      ...graph,
      nodes: graph.nodes.filter((n) => n.id !== id),
      edges: graph.edges.filter((e) => e.from !== id && e.to !== id),
    });
    if (selectedNode === id) setSelectedNode(null);
  };

  const addEdge = (from: string, to: string) => {
    if (from === to) return;
    const exists = graph.edges.some(
      (e) => (e.from === from && e.to === to) || (!directed && e.from === to && e.to === from),
    );
    if (exists) return;
    setEdges([...graph.edges, { from, to, weight: weighted ? 1 : undefined }]);
  };

  const removeEdgeAt = (index: number) => {
    setEdges(graph.edges.filter((_, i) => i !== index));
    if (selectedEdgeIndex === index) setSelectedEdgeIndex(null);
  };

  const selectNode = (id: string) => {
    setSelectedNode(id);
    setSelectedEdgeIndex(null);
    setNodeIdDraft(id);
  };

  const commitRename = () => {
    const next = nodeIdDraft.trim();
    if (!selectedNode || !next || next === selectedNode) return;
    if (graph.nodes.some((n) => n.id === next)) return; // ids must stay unique, silently ignore a clash
    // One onChange call for the same reason as removeNode above.
    onChange({
      ...graph,
      nodes: graph.nodes.map((n) => (n.id === selectedNode ? { ...n, id: next } : n)),
      edges: graph.edges.map((e) => ({
        ...e,
        from: e.from === selectedNode ? next : e.from,
        to: e.to === selectedNode ? next : e.to,
      })),
    });
    setSelectedNode(next);
  };

  const handlePointerDownCanvas = (e: ReactPointerEvent<SVGSVGElement>) => {
    // Only fires when the background itself was hit, not a node or edge -
    // those stop propagation in their own handlers below.
    if (mode !== "node") return;
    const svg = svgRef.current;
    if (!svg) return;
    const { x, y } = toSvgPoint(svg, e.clientX, e.clientY);
    addNode(x, y);
  };

  const handlePointerDownNode = (e: ReactPointerEvent<SVGGElement>, node: GraphNode) => {
    e.stopPropagation();
    if (mode === "erase") {
      removeNode(node.id);
      return;
    }
    if (mode === "move") {
      (e.target as Element).setPointerCapture(e.pointerId);
      setDrag({ kind: "move", id: node.id, moved: false });
      return;
    }
    if (mode === "edge") {
      (e.target as Element).setPointerCapture(e.pointerId);
      setDrag({ kind: "edge", from: node.id, x: node.x, y: node.y });
      return;
    }
    // "node" mode: clicking an existing node selects it rather than
    // stacking a duplicate on top, since that is almost never what a click
    // there means.
    selectNode(node.id);
  };

  const handlePointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const svg = svgRef.current;
    if (!svg) return;
    const { x, y } = toSvgPoint(svg, e.clientX, e.clientY);

    if (drag.kind === "move") {
      setNodes(graph.nodes.map((n) => (n.id === drag.id ? { ...n, x: clampX(x), y: clampY(y) } : n)));
      if (!drag.moved) setDrag({ ...drag, moved: true });
      return;
    }
    setDrag({ ...drag, x, y });
  };

  const handlePointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    if (drag.kind === "move" && !drag.moved) {
      // A click with no movement in Move mode is a select, not a no-op drag.
      selectNode(drag.id);
    }
    if (drag.kind === "edge") {
      const svg = svgRef.current;
      if (svg) {
        const { x, y } = toSvgPoint(svg, e.clientX, e.clientY);
        const target = nodeAt(graph.nodes, x, y);
        if (target) addEdge(drag.from, target.id);
      }
    }
    setDrag(null);
  };

  const handleEdgeClick = (index: number) => {
    if (mode === "erase") {
      removeEdgeAt(index);
      return;
    }
    setSelectedEdgeIndex(index);
    setSelectedNode(null);
  };

  const activeMode = MODES.find((m) => m.id === mode) ?? MODES[0];
  const selectedEdge = selectedEdgeIndex !== null ? graph.edges[selectedEdgeIndex] : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1">
          {MODES.map((m) => (
            <Button
              key={m.id}
              type="button"
              variant={mode === m.id ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setMode(m.id);
                setDrag(null);
              }}
            >
              {m.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate">
          {showDirectedToggle && (
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={directed}
                onChange={(e) => onChange({ ...graph, directed: e.target.checked || undefined })}
              />
              Directed
            </label>
          )}
          {showWeightedToggle && (
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={weighted}
                onChange={(e) => {
                  const nextWeighted = e.target.checked;
                  onChange({
                    ...graph,
                    weighted: nextWeighted || undefined,
                    edges: graph.edges.map((edge) => ({
                      ...edge,
                      weight: nextWeighted ? (edge.weight ?? 1) : undefined,
                    })),
                  });
                }}
              />
              Weighted
            </label>
          )}
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
        className="w-full touch-none rounded-lg border border-border-strong bg-surface-2/40"
        style={{ cursor: mode === "node" ? "copy" : mode === "erase" ? "not-allowed" : "default" }}
        onPointerDown={handlePointerDownCanvas}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <defs>
          <marker id={arrowId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--border-strong)" />
          </marker>
        </defs>

        {graph.edges.map((edge, i) => {
          const a = graph.nodes.find((n) => n.id === edge.from);
          const b = graph.nodes.find((n) => n.id === edge.to);
          if (!a || !b) return null;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          const ux = dx / len;
          const uy = dy / len;
          const x1 = a.x + ux * NODE_R;
          const y1 = a.y + uy * NODE_R;
          const x2 = b.x - ux * NODE_R;
          const y2 = b.y - uy * NODE_R;
          const midX = (a.x + b.x) / 2;
          const midY = (a.y + b.y) / 2;
          const selected = selectedEdgeIndex === i;

          return (
            <g key={`${edgeKey(edge.from, edge.to, directed)}-${i}`}>
              {/* Wide, invisible hit target - the visible stroke is too thin to click reliably. */}
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="transparent"
                strokeWidth={14}
                style={{ cursor: mode === "erase" ? "not-allowed" : "pointer" }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => handleEdgeClick(i)}
              />
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={selected ? "var(--copper)" : "var(--border-strong)"}
                strokeWidth={selected ? 2.5 : 1.75}
                markerEnd={directed ? `url(#${arrowId})` : undefined}
              />
              {weighted && edge.weight !== undefined && (
                <>
                  <circle cx={midX} cy={midY} r={10} fill="var(--surface-card)" stroke="var(--border-strong)" strokeWidth={1} />
                  <text x={midX} y={midY + 3.5} textAnchor="middle" className="text-[10px] font-bold" fill="var(--ink-soft)">
                    {edge.weight}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {drag?.kind === "edge" &&
          (() => {
            const from = graph.nodes.find((n) => n.id === drag.from);
            if (!from) return null;
            return (
              <line
                x1={from.x}
                y1={from.y}
                x2={drag.x}
                y2={drag.y}
                stroke="var(--copper)"
                strokeWidth={2}
                strokeDasharray="5 4"
              />
            );
          })()}

        {graph.nodes.map((n) => {
          const selected = selectedNode === n.id;
          return (
            <g
              key={n.id}
              onPointerDown={(e) => handlePointerDownNode(e, n)}
              style={{ cursor: mode === "erase" ? "not-allowed" : mode === "node" ? "default" : "grab" }}
            >
              <circle
                cx={n.x}
                cy={n.y}
                r={NODE_R}
                fill={selected ? "var(--copper)" : "var(--surface-card)"}
                stroke={selected ? "var(--copper-dark)" : "var(--border-strong)"}
                strokeWidth={selected ? 2.4 : 1.5}
              />
              <text
                x={n.x}
                y={n.y + 4}
                textAnchor="middle"
                className="select-none text-[11px] font-bold"
                fill={selected ? "var(--copper-ink)" : "var(--ink)"}
              >
                {n.id}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="text-[11px] text-slate">{activeMode.hint}</p>

      {selectedNode && (
        <div className="flex items-end gap-2 rounded-lg border border-border-strong p-2.5">
          <Field label="Node name">
            <input
              className={fieldInputClass}
              value={nodeIdDraft}
              onChange={(e) => setNodeIdDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
            />
          </Field>
          <Button type="button" variant="destructive" size="sm" onClick={() => removeNode(selectedNode)}>
            Delete node
          </Button>
        </div>
      )}

      {selectedEdge && selectedEdgeIndex !== null && (
        <div className="flex items-end gap-2 rounded-lg border border-border-strong p-2.5">
          <span className="pb-2 text-xs font-semibold text-ink-soft">
            {selectedEdge.from} {directed ? "→" : "–"} {selectedEdge.to}
          </span>
          {weighted && (
            <Field label="Weight">
              <input
                type="number"
                className={fieldInputClass}
                value={selectedEdge.weight ?? 1}
                onChange={(e) =>
                  setEdges(
                    graph.edges.map((edge, i) =>
                      i === selectedEdgeIndex ? { ...edge, weight: Number(e.target.value) || 0 } : edge,
                    ),
                  )
                }
              />
            </Field>
          )}
          <Button type="button" variant="destructive" size="sm" onClick={() => removeEdgeAt(selectedEdgeIndex)}>
            Delete edge
          </Button>
        </div>
      )}
    </div>
  );
}
