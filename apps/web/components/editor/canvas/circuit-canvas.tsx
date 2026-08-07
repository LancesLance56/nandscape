"use client";

import type React from "react";
import {useCallback, useEffect, useRef} from "react";
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
import {useEngineSimulation} from "@/hooks/use-engine-simulation";
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

export function CircuitCanvas() {
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const onNodesChange = useEditorStore((s) => s.onNodesChange);
  const onEdgesChange = useEditorStore((s) => s.onEdgesChange);
  const setSelection = useEditorStore((s) => s.setSelection);

  const lastLoadedAt = useEditorStore((s) => s.lastLoadedAt);
  const { screenToFlowPosition, fitView } = useReactFlow();

  const showGrid = usePreferencesStore((s) => s.showGrid);
  const snapGridSize = usePreferencesStore((s) => s.snapGridSize);
  const visualGridSize = usePreferencesStore((s) => s.visualGridSize);
  const snapToGrid = usePreferencesStore((s) => s.snapToGrid);

  const isDrafting = useWireDraftStore((s) => s.draft !== null);

  const dispatch = useCommandDispatch();
  const openContextMenu = useContextMenuTrigger();
  const toFlowPosition = useScreenToFlowPosition();
  const dragOrigin = useRef<Map<string, { x: number; y: number }>>(new Map());

  useLiveSimulation();
  useEngineSimulation();

  useEffect(() => {
    if (lastLoadedAt === 0) return;
    fitView({ duration: 250, padding: 0.25 });
  }, [lastLoadedAt, fitView]);

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
        deleteKeyCode={null}
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
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1.4}          // was ~1
            className="opacity-70"  // was implicit 100%,  dots were tuned for the old lighter surface
            color="var(--border-strong)"
          />
        )}
        <WireDraftOverlay/>
        <CanvasControls/>
      </ReactFlow>
    </div>
  );
}
