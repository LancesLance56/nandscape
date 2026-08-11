"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ReactFlow, Background, BackgroundVariant, type NodeTypes, type EdgeTypes } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { SignalState } from "@nandscape/engine";
import { evaluateLiveCircuit } from "@/lib/editor/live-simulate";
import { PreviewGateNode } from "./preview-gate-node";
import { PreviewIoNode } from "./preview-io-node";
import { PreviewWireEdge } from "./preview-wire-edge";
import type { EditorNode, EditorEdge, IoNodeData } from "@/types/editor";
import type { SubcircuitBlockDefinition } from "@/types/subcircuit-block";

const nodeTypes: NodeTypes = {
  gate: PreviewGateNode,
  "io-input": PreviewIoNode,
  "io-output": PreviewIoNode,
};

const edgeTypes: EdgeTypes = {
  wire: PreviewWireEdge,
};

/**
 * Read-only, interactive (inputs toggleable) circuit renderer. Shared by the
 * blog embed widget, project embed pages, and public/unlisted project views,
 * must be rendered inside a ReactFlowProvider.
 */
export function CircuitStage({
  nodes: initialNodes,
  edges,
  blocks,
  allowScrollZoom = false,
  pannable = true,
  showBackground = true,
  fitPadding = 0.3,
}: {
  nodes: EditorNode[];
  edges: EditorEdge[];
  /** A project's (or imported file's) embedded custom-block snapshot, if
   *  any - resolved ahead of the viewer's own local block library so a
   *  public/unlisted project or embed renders its subcircuits correctly
   *  for anyone, without writing those blocks into the viewer's persisted
   *  "My Blocks" (see subcircuit-blocks-store's hydrateFromSnapshot for
   *  the mutating equivalent used by the actual editor). */
  blocks?: SubcircuitBlockDefinition[];
  allowScrollZoom?: boolean;
  pannable?: boolean;
  showBackground?: boolean;
  fitPadding?: number;
}) {
  const [nodes, setNodes] = useState<EditorNode[]>(initialNodes);
  const [edgeSignals, setEdgeSignals] = useState<Record<string, SignalState>>({});

  // Reset to the source's starting values whenever a fresh set of nodes is
  // handed in (e.g. the modal opening with its own CircuitStage instance).
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes]);

  const blocksById = useMemo(
    () => (blocks && blocks.length > 0 ? new Map(blocks.map((b) => [b.id, b])) : undefined),
    [blocks],
  );
  const resolveExtra = useMemo(
    () => (blocksById ? (id: string) => blocksById.get(id) : undefined),
    [blocksById],
  );

  useEffect(() => {
    setEdgeSignals((prev) => evaluateLiveCircuit(nodes, edges, prev, 0, resolveExtra));
  }, [nodes, edges, resolveExtra]);

  const toggleInput = useCallback((nodeId: string) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId || n.data.kind !== "input") return n;
        const data = n.data as IoNodeData;
        const next = data.value === SignalState.HIGH ? SignalState.LOW : SignalState.HIGH;
        return { ...n, data: { ...n.data, value: next } };
      }),
    );
  }, []);

  const incomingEdgeByTarget = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of edges) map.set(e.target, e.id);
    return map;
  }, [edges]);

  const renderNodes = useMemo(
    () =>
      nodes.map((n) => {
        if (n.data.kind === "input") {
          return { ...n, data: { ...n.data, onToggle: () => toggleInput(n.id) } };
        }
        if (n.data.kind === "output") {
          const edgeId = incomingEdgeByTarget.get(n.id);
          return { ...n, data: { ...n.data, value: edgeId ? edgeSignals[edgeId] : undefined } };
        }
        return n;
      }),
    [nodes, edgeSignals, incomingEdgeByTarget, toggleInput],
  );

  const renderEdges = useMemo(
    () => edges.map((e) => ({ ...e, data: { ...e.data, signal: edgeSignals[e.id] } })),
    [edges, edgeSignals],
  );

  return (
    <ReactFlow
      nodes={renderNodes}
      edges={renderEdges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnScroll={false}
      zoomOnScroll={allowScrollZoom}
      zoomOnPinch={pannable}
      panOnDrag={pannable}
      zoomOnDoubleClick={false}
      fitView
      fitViewOptions={{ padding: fitPadding }}
      minZoom={0.3}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
    >
      {showBackground && (
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} className="opacity-60" color="var(--border-strong)" />
      )}
    </ReactFlow>
  );
}
