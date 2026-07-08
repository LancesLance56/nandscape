"use client";

import type React from "react";
import { useCallback, useRef } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  useReactFlow,
  type OnConnect,
  type OnSelectionChangeFunc,
  type ReactFlowProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useEditorStore } from "@/store/editor-store";
import { usePreferencesStore } from "@/store/preferences-store";
import { useWireDraftStore } from "@/store/wire-draft-store";
import { useCommandDispatch } from "@/hooks/use-command";
import { useLiveSimulation } from "@/hooks/use-live-simulation";
import { nodeTypes, createGateNode, createIoNode } from "@/components/editor/nodes/node-registry";
import { edgeTypes } from "@/components/editor/edges/edge-registry";
import { CanvasControls } from "./canvas-controls";
import { WireDraftOverlay } from "./wire-draft-overlay";
import { createConnectEdgeCommand } from "@/lib/commands/commands/connect-edge.command";
import { createMoveNodesCommand, type NodeMove } from "@/lib/commands/commands/move-nodes.command";
import { createAddNodeCommand } from "@/lib/commands/commands/add-node.command";
import { PALETTE_DRAG_MIME, type PaletteEntry } from "@/components/editor/sidebar/palette-item";
import type { EditorNode, EditorEdge } from "@/types/editor";
import { useContextMenuTrigger } from "@/components/editor/context-menu/use-context-menu";

/** A pointer that moved less than this counts as a click, not a drag. */
const CLICK_THRESHOLD_PX = 6;
/** Elements a "click on empty canvas" must NOT have landed on. */
const NON_BACKGROUND_SELECTOR = ".react-flow__node, .react-flow__handle, .react-flow__edge, .react-flow__controls, .react-flow__panel";

interface PendingHandle {
  nodeId: string;
  handleId: string | null;
  handleType: "source" | "target";
  clientX: number;
  clientY: number;
}

/**
 * The only file that talks to @xyflow/react directly for graph rendering.
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
  const { screenToFlowPosition } = useReactFlow();
  const dragOrigin = useRef<Map<string, { x: number; y: number }>>(new Map());
  const pendingStart = useRef<PendingHandle | null>(null);
  const didConnect = useRef(false);
  const canvasPointerDown = useRef<{ x: number; y: number; onBackground: boolean } | null>(null);

  useLiveSimulation();

  const handleConnect: OnConnect = useCallback(
    (connection) => {
      didConnect.current = true;
      if (useWireDraftStore.getState().draft) return; // a real drag mid-draft is unexpected input; ignore rather than double-create
      dispatch(createConnectEdgeCommand(connection));
    },
    [dispatch],
  );

  const handleConnectStart: NonNullable<ReactFlowProps["onConnectStart"]> = useCallback((event, params) => {
    didConnect.current = false;
    const point = "touches" in event ? event.touches[0] : event;
    pendingStart.current = {
      nodeId: params.nodeId ?? "",
      handleId: params.handleId ?? null,
      handleType: (params.handleType ?? "source") as "source" | "target",
      clientX: point.clientX,
      clientY: point.clientY,
    };
  }, []);

  const handleConnectEnd: NonNullable<ReactFlowProps["onConnectEnd"]> = useCallback(
    (event) => {
      const start = pendingStart.current;
      pendingStart.current = null;
      if (didConnect.current || !start) return;

      const point = "changedTouches" in event ? event.changedTouches[0] : event;
      const distance = Math.hypot(point.clientX - start.clientX, point.clientY - start.clientY);
      if (distance > CLICK_THRESHOLD_PX) return; // a drag that ended over empty space — treat as an abort, same as before

      const flowPoint = screenToFlowPosition({ x: point.clientX, y: point.clientY });
      const draft = useWireDraftStore.getState().draft;

      if (!draft) {
        useWireDraftStore.getState().start(start.nodeId, start.handleId, start.handleType, flowPoint);
        return;
      }

      const compatible = draft.sourceHandleType !== start.handleType && draft.sourceNodeId !== start.nodeId;
      if (!compatible) return; // e.g. clicked another output while drafting from an output — ignore, keep drafting

      const sourceIsDraft = draft.sourceHandleType === "source";
      dispatch(
        createConnectEdgeCommand(
          {
            source: sourceIsDraft ? draft.sourceNodeId : start.nodeId,
            sourceHandle: sourceIsDraft ? draft.sourceHandleId : start.handleId,
            target: sourceIsDraft ? start.nodeId : draft.sourceNodeId,
            targetHandle: sourceIsDraft ? start.handleId : draft.sourceHandleId,
          },
          draft.waypoints,
        ),
      );
      useWireDraftStore.getState().clear();
    },
    [dispatch, screenToFlowPosition],
  );

  const handleSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }) => {
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
          return { nodeId: n.id, from, to: n.position };
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
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

      let node: EditorNode | null = null;
      if (entry.kind === "gate" && entry.gateType !== undefined) {
        node = createGateNode(position, entry.gateType);
      } else if (entry.kind === "input" || entry.kind === "output") {
        node = createIoNode(position, entry.kind, entry.kind === "input" ? "A" : "OUT");
      }

      if (node) dispatch(createAddNodeCommand(node));
    },
    [dispatch, screenToFlowPosition],
  );

  const handleWrapperPointerDown = useCallback((event: React.PointerEvent) => {
    const target = event.target as HTMLElement;
    canvasPointerDown.current = {
      x: event.clientX,
      y: event.clientY,
      onBackground: !target.closest(NON_BACKGROUND_SELECTOR),
    };
  }, []);

  const handleWrapperPointerUp = useCallback(
    (event: React.PointerEvent) => {
      const down = canvasPointerDown.current;
      canvasPointerDown.current = null;
      if (!down || !down.onBackground) return;
      if (!useWireDraftStore.getState().draft) return;

      const distance = Math.hypot(event.clientX - down.x, event.clientY - down.y);
      if (distance > CLICK_THRESHOLD_PX) return;

      useWireDraftStore.getState().addWaypoint(screenToFlowPosition({ x: event.clientX, y: event.clientY }));
    },
    [screenToFlowPosition],
  );

  const handlePaneMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!useWireDraftStore.getState().draft) return;
      useWireDraftStore.getState().updateCursor(screenToFlowPosition({ x: event.clientX, y: event.clientY }));
    },
    [screenToFlowPosition],
  );

  const handlePaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      if (useWireDraftStore.getState().draft) {
        useWireDraftStore.getState().cancel();
        return;
      }
      openContextMenu({ x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY, targetId: null, targetType: "pane" });
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
      openContextMenu({ x: event.clientX, y: event.clientY, targetId: node.id, targetType: "node" });
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
      openContextMenu({ x: event.clientX, y: event.clientY, targetId: edge.id, targetType: "edge" });
    },
    [openContextMenu],
  );

  return (
    <div
      className={`relative h-full w-full ${isDrafting ? "cursor-crosshair" : ""}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseMove={handlePaneMouseMove}
      onPointerDown={handleWrapperPointerDown}
      onPointerUp={handleWrapperPointerUp}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onConnectStart={handleConnectStart}
        onConnectEnd={handleConnectEnd}
        onSelectionChange={handleSelectionChange}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        onPaneContextMenu={handlePaneContextMenu}
        onNodeContextMenu={handleNodeContextMenu}
        onEdgeContextMenu={handleEdgeContextMenu}
        panOnDrag={!isDrafting}
        nodesDraggable={!isDrafting}
        snapToGrid={snapToGrid}
        snapGrid={[snapGridSize, snapGridSize]}
        minZoom={0.15}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
        colorMode="system"
      >
        {showGrid && (
          <Background variant={BackgroundVariant.Dots} gap={visualGridSize} size={1.5} color="var(--slate)" />
        )}
        <WireDraftOverlay />
        <CanvasControls />
      </ReactFlow>
    </div>
  );
}
