import { create } from "zustand";
import type { Connection } from "@xyflow/react";
import { applyNodeChanges, applyEdgeChanges } from "@xyflow/react";
import type { NodeChange, EdgeChange } from "@xyflow/react";

import type { EditorNode, EditorEdge, Selection } from "@/types/editor";
import { EMPTY_SELECTION } from "@/types/editor";

/**
 * editor-store.ts
 * ---------------------------------------------------------------------------
 * The ONLY store that owns circuit structure (nodes + edges + selection).
 * This is deliberately "dumb": it exposes low-level graph primitives
 * (addNode, removeNodes, connect, ...) but no domain logic about what a
 * valid connection is, what happens on delete, etc. That logic lives in
 * lib/commands/* so it can be undo/redo-aware and shared between the
 * toolbar, context menu, and keyboard shortcuts.
 *
 * React Flow's onNodesChange/onEdgesChange handlers are wired straight to
 * this store (see canvas/circuit-canvas.tsx) for drag/resize/select
 * interactions that don't need their own Command — those are considered
 * transient view state, not undoable structural edits. Structural edits
 * (add/remove/connect) always go through commands.
 */

export interface EditorState {
  nodes: EditorNode[];
  edges: EditorEdge[];
  selection: Selection;

  activeCircuitId: string | null;

  // --- React Flow wiring ------------------------------------------------
  onNodesChange: (changes: NodeChange<EditorNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<EditorEdge>[]) => void;

  // --- Graph primitives (called by commands, not UI directly) -----------
  setNodes: (nodes: EditorNode[]) => void;
  setEdges: (edges: EditorEdge[]) => void;
  addNode: (node: EditorNode) => void;
  addNodes: (nodes: EditorNode[]) => void;
  removeNodes: (nodeIds: string[]) => void;
  updateNodeData: (nodeId: string, patch: Record<string, unknown>) => void;
  moveNode: (nodeId: string, position: { x: number; y: number }) => void;

  addEdge: (edge: EditorEdge) => void;
  removeEdges: (edgeIds: string[]) => void;
  updateEdgeData: (edgeId: string, patch: Record<string, unknown>) => void;
  connect: (connection: Connection, waypoints?: { x: number; y: number }[]) => EditorEdge;

  // --- Selection ----------------------------------------------------------
  setSelection: (selection: Selection) => void;
  clearSelection: () => void;
  selectAll: () => void;

  setActiveCircuit: (circuitId: string | null) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  nodes: [],
  edges: [],
  selection: EMPTY_SELECTION,
  activeCircuitId: null,

  onNodesChange: (changes) => {
    set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) }));
  },
  onEdgesChange: (changes) => {
    set((state) => ({ edges: applyEdgeChanges(changes, state.edges) }));
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),
  addNodes: (nodes) => set((state) => ({ nodes: [...state.nodes, ...nodes] })),

  removeNodes: (nodeIds) => {
    const idSet = new Set(nodeIds);
    set((state) => ({
      nodes: state.nodes.filter((n) => !idSet.has(n.id)),
      // A node's wires are structurally invalid without it — cascade delete.
      edges: state.edges.filter((e) => !idSet.has(e.source) && !idSet.has(e.target)),
    }));
  },

  updateNodeData: (nodeId, patch) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n,
      ),
    }));
  },

  moveNode: (nodeId, position) => {
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === nodeId ? { ...n, position } : n)),
    }));
  },

  addEdge: (edge) => set((state) => ({ edges: [...state.edges, edge] })),

  removeEdges: (edgeIds) => {
    const idSet = new Set(edgeIds);
    set((state) => ({ edges: state.edges.filter((e) => !idSet.has(e.id)) }));
  },

  updateEdgeData: (edgeId, patch) => {
    set((state) => ({
      edges: state.edges.map((e) => (e.id === edgeId ? { ...e, data: { ...e.data, ...patch } } : e)),
    }));
  },

  connect: (connection, waypoints) => {
    const edge: EditorEdge = {
      id: `edge_${connection.source}:${connection.sourceHandle ?? "o"}-${connection.target}:${connection.targetHandle ?? "i"}_${crypto.randomUUID().slice(0, 8)}`,
      source: connection.source!,
      target: connection.target!,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      type: "wire",
      data: waypoints && waypoints.length > 0 ? { waypoints } : {},
    };
    get().addEdge(edge);
    return edge;
  },

  setSelection: (selection) => set({ selection }),
  clearSelection: () => set({ selection: EMPTY_SELECTION }),
  selectAll: () => {
    const { nodes, edges } = get();
    set({ selection: { nodeIds: nodes.map((n) => n.id), edgeIds: edges.map((e) => e.id) } });
  },

  setActiveCircuit: (circuitId) => set({ activeCircuitId: circuitId }),
}));
