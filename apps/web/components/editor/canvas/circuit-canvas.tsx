"use client";

import type React from "react";
import {useCallback, useRef} from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  useReactFlow,
  type OnSelectionChangeFunc, ReactFlowProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {useEditorStore} from "@/store/editor-store";
import {usePreferencesStore} from "@/store/preferences-store";
import {useWireDraftStore} from "@/store/wire-draft-store";
import {useCommandDispatch} from "@/hooks/use-command";
import {useLiveSimulation} from "@/hooks/use-live-simulation";
import {useScreenToFlowPosition} from "@/hooks/use-flow-position";
import {nodeTypes, createGateNode, createIoNode, createSubcircuitNode} from "@/components/editor/nodes/node-registry";
import {edgeTypes} from "@/components/editor/edges/edge-registry";
import {CanvasControls} from "./canvas-controls";
import {WireDraftOverlay} from "./wire-draft-overlay";
import {createMoveNodesCommand, type NodeMove} from "@/lib/commands/commands/move-nodes.command";
import {createAddNodeCommand} from "@/lib/commands/commands/add-node.command";
import {PALETTE_DRAG_MIME, type PaletteEntry} from "@/components/editor/sidebar/palette-item";
import type {EditorNode, EditorEdge} from "@/types/editor";
import {useContextMenuTrigger} from "@/components/editor/context-menu/use-context-menu";
import {snapPoint} from "@/lib/editor/edge-path";

/**
 * The only file that talks to @xyflow/react directly for graph rendering.
 *
 * Wiring is click-click ONLY. React Flow's own handle-drag connection
 * feature is disabled entirely via `nodesConnectable={false}` below, so
 * dragging from a handle does nothing — there's no more "drag out a
 * bezier line" path to fall into by accident:
 *   - Clicking a handle (nodes/node-handle.tsx + hooks/use-handle-click.ts)
 *     starts a draft, or finishes one already in progress.
 *   - Clicking empty canvas while a draft is active (onPaneClick below)
 *     adds a bend point.
 *   - Double-clicking an existing wire while a draft is active taps/branches
 *     onto it (see edges/wire-edge.tsx).
 */
export function CircuitCanvas() {
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const onNodesChange = useEditorStore((s) => s.onNodesChange);
  const onEdgesChange = useEditorStore((s) => s.onEdgesChange);
  const setSelection = useEditorStore((s) => s.setSelection);

  const showGrid = usePreferencesStore((s) => s.showGrid);
  const snapGridSize = usePreferencesStore((s) => s.snapGridSize);
  const visualGridSize = usePreferencesStore((s) => s.visualGridSize);
  const snapToGrid = usePreferencesStore((s) => s.snapToGrid);

  const isDrafting = useWireDraftStore((s) => s.draft !== null);

  const dispatch = useCommandDispatch();
  const openContextMenu = useContextMenuTrigger();
  // Still used for node-drop placement below — unrelated to wire drafting.
  const {screenToFlowPosition} = useReactFlow();
  // Used for everything wire-draft related — see hooks/use-flow-position.ts
  // for why this is deliberately NOT React Flow's own screenToFlowPosition.
  const toFlowPosition = useScreenToFlowPosition();
  const dragOrigin = useRef<Map<string, { x: number; y: number }>>(new Map());

  useLiveSimulation();

  const handlePaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (!useWireDraftStore.getState().draft) return;
      const raw = toFlowPosition({x: event.clientX, y: event.clientY});
      useWireDraftStore.getState().addWaypoint(snapPoint(raw, snapGridSize, snapToGrid));
    },
    [toFlowPosition, snapGridSize, snapToGrid],
  );

  const handleSelectionChange: OnSelectionChangeFunc = useCallback(
    ({nodes: selectedNodes, edges: selectedEdges}) => {
      setSelection({
        nodeIds: selectedNodes.map((n) => n.id),
        edgeIds: selectedEdges.map((e) => e.id),
      });
    },
    [setSelection],
  );

  const handleNodeDragStart: NonNullable<ReactFlowProps["onNodeDragStart"]> = useCallback(
    (_event, _node, draggedNodes) => {
      for (const n of draggedNodes) {
        dragOrigin.current.set(n.id, n.position);
      }
    },
    [],
  );

  const handleNodeDragStop: NonNullable<ReactFlowProps["onNodeDragStop"]> = useCallback(
    (_event, _node, draggedNodes) => {
      const moves: NodeMove[] = draggedNodes
        .map((n) => {
          const from = dragOrigin.current.get(n.id);
          if (!from) return null;
          if (from.x === n.position.x && from.y === n.position.y) return null;
          return {nodeId: n.id, from, to: n.position};
        })
        .filter((m): m is NodeMove => m !== null);

      dragOrigin.current.clear();

      if (moves.length) {
        dispatch(createMoveNodesCommand(moves));
      }
    },
    [dispatch],
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData(PALETTE_DRAG_MIME);
      if (!raw) return;

      const entry = JSON.parse(raw) as PaletteEntry;
      const position = screenToFlowPosition({x: event.clientX, y: event.clientY});

      let node: EditorNode | null = null;
      if (entry.kind === "gate" && entry.gateType !== undefined) {
        node = createGateNode(position, entry.gateType);
      } else if (entry.kind === "input" || entry.kind === "output") {
        node = createIoNode(position, entry.kind, entry.kind === "input" ? "A" : "OUT");
      } else if (entry.kind === "subcircuit" && entry.blockId) {
        node = createSubcircuitNode(position, entry.blockId);
      }

      if (node) dispatch(createAddNodeCommand(node));
    },
    [dispatch, screenToFlowPosition],
  );

  const handlePaneMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!useWireDraftStore.getState().draft) return;
      const raw = toFlowPosition({x: event.clientX, y: event.clientY});
      useWireDraftStore.getState().updateCursor(snapPoint(raw, snapGridSize, snapToGrid));
    },
    [toFlowPosition, snapGridSize, snapToGrid],
  );

  const handlePaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      if (useWireDraftStore.getState().draft) {
        useWireDraftStore.getState().cancel();
        return;
      }
      openContextMenu({
        x: (event as MouseEvent).clientX,
        y: (event as MouseEvent).clientY,
        targetId: null,
        targetType: "pane"
      });
    },
    [openContextMenu],
  );

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: EditorNode) => {
      event.preventDefault();
      if (useWireDraftStore.getState().draft) {
        useWireDraftStore.getState().cancel();
        return;
      }
      openContextMenu({x: event.clientX, y: event.clientY, targetId: node.id, targetType: "node"});
    },
    [openContextMenu],
  );

  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: EditorEdge) => {
      event.preventDefault();
      if (useWireDraftStore.getState().draft) {
        useWireDraftStore.getState().cancel();
        return;
      }
      openContextMenu({x: event.clientX, y: event.clientY, targetId: edge.id, targetType: "edge"});
    },
    [openContextMenu],
  );

  return (
    <div
      className={`relative h-full w-full ${isDrafting ? "cursor-crosshair" : ""}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseMove={handlePaneMouseMove}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onPaneClick={handlePaneClick}
        onSelectionChange={handleSelectionChange}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        onPaneContextMenu={handlePaneContextMenu}
        onNodeContextMenu={handleNodeContextMenu}
        onEdgeContextMenu={handleEdgeContextMenu}
        panOnDrag={!isDrafting}
        nodesDraggable={!isDrafting}
        nodesConnectable={false}
        snapToGrid={snapToGrid}
        snapGrid={[snapGridSize, snapGridSize]}
        minZoom={0.15}
        maxZoom={2.5}
        proOptions={{hideAttribution: true}}
      >
        {showGrid && (
          <Background variant={BackgroundVariant.Dots} gap={visualGridSize} size={1.5} className="transition-colors"/>
        )}
        <WireDraftOverlay/>
        <CanvasControls/>
      </ReactFlow>
    </div>
  );
}