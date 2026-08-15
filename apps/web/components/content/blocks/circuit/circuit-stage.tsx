"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ReactFlow, Background, BackgroundVariant, type NodeTypes, type EdgeTypes } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { SignalState } from "@nandscape/engine";
import { evaluateLiveCircuit } from "@/lib/editor/live-simulate";
import { scopeToBlockDefinition } from "@/lib/editor/scope-block";
import { PreviewGateNode } from "./preview-gate-node";
import { PreviewIoNode } from "./preview-io-node";
import { PreviewSubcircuitNode } from "./preview-subcircuit-node";
import { PreviewBusInputNode, PreviewBusOutputNode } from "./preview-bus-nodes";
import { PreviewWireEdge } from "./preview-wire-edge";
import type {
  EditorNode,
  EditorEdge,
  IoNodeData,
  SubcircuitNodeData,
  BusInputNodeData,
  BusOutputNodeData,
} from "@/types/editor";
import type { SubcircuitBlockDefinition } from "@/types/subcircuit-block";
import type { CircuitScope } from "@/types/scope";

const nodeTypes: NodeTypes = {
  gate: PreviewGateNode,
  "io-input": PreviewIoNode,
  "io-output": PreviewIoNode,
  subcircuit: PreviewSubcircuitNode,
  "bus-input": PreviewBusInputNode,
  "bus-output": PreviewBusOutputNode,
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
  scopes,
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
  /** The project's other tabs. A subcircuit can point at a sibling tab
   *  instead of a library block, and those are deliberately NOT copied into
   *  `blocks` at save time (they'd be duplicating data the project already
   *  stores - see resolveBlockClosure's skipCollecting), so without this
   *  every tab-backed block on the canvas resolves to nothing and renders
   *  as an empty "Missing block". Owners never noticed: their own editing
   *  session resolves tabs from the scopes store (see scope-block.ts's
   *  createScopeAwareResolver), which a reader doesn't have. */
  scopes?: CircuitScope[];
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

  // Both sources in one lookup: sibling tabs presented as blocks, plus the
  // snapshotted library blocks. Scope ids (`scope_*`) and block ids
  // (`block_*`) come from separate id spaces, so the two can't collide.
  const blocksById = useMemo(() => {
    const map = new Map<string, SubcircuitBlockDefinition>();
    for (const scope of scopes ?? []) map.set(scope.id, scopeToBlockDefinition(scope));
    for (const block of blocks ?? []) map.set(block.id, block);
    return map;
  }, [blocks, scopes]);

  // Staying undefined when there's nothing to resolve is deliberate: it lets
  // live-simulate fall back to the local block library, which is what the
  // blog-embed path (no blocks/scopes passed at all) relies on.
  const resolveExtra = useMemo(
    () => (blocksById.size > 0 ? (id: string) => blocksById.get(id) : undefined),
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

  const toggleLane = useCallback((nodeId: string, lane: number) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId || n.data.kind !== "bus-input") return n;
        const data = n.data as BusInputNodeData;
        const values = data.values.slice();
        values[lane] = values[lane] === SignalState.HIGH ? SignalState.LOW : SignalState.HIGH;
        return { ...n, data: { ...data, values } };
      }),
    );
  }, []);

  const incomingEdgeByTarget = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of edges) map.set(e.target, e.id);
    return map;
  }, [edges]);

  // A Bus Output has one incoming edge per lane, so the single-edge-per-node
  // map above can't serve it - key by handle as well.
  const incomingEdgeByTargetHandle = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of edges) map.set(`${e.target}::${e.targetHandle ?? "in-0"}`, e.id);
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
        if (n.data.kind === "subcircuit") {
          // PreviewSubcircuitNode can't look this up itself the way the
          // editor's node does - it has no session stores to read.
          const circuitId = (n.data as SubcircuitNodeData).circuitId;
          return { ...n, data: { ...n.data, block: blocksById.get(circuitId) } };
        }
        if (n.data.kind === "bus-input") {
          return { ...n, data: { ...n.data, onToggleLane: (lane: number) => toggleLane(n.id, lane) } };
        }
        if (n.data.kind === "bus-output") {
          const laneSignals = (n.data as BusOutputNodeData).names.map((_, i) => {
            const edgeId = incomingEdgeByTargetHandle.get(`${n.id}::in-${i}`);
            return (edgeId ? edgeSignals[edgeId] : undefined) ?? SignalState.FLOAT;
          });
          return { ...n, data: { ...n.data, laneSignals } };
        }
        return n;
      }),
    [
      nodes,
      edgeSignals,
      incomingEdgeByTarget,
      incomingEdgeByTargetHandle,
      toggleInput,
      toggleLane,
      blocksById,
    ],
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
