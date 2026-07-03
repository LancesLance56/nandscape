"use client";

import type React from "react";
import { useCallback, useRef } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  type OnConnect,
  type OnSelectionChangeFunc,
  type ReactFlowProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useEditorStore } from "@/store/editor-store";
import { usePreferencesStore } from "@/store/preferences-store";
import { useCommandDispatch } from "@/hooks/use-command";
import { nodeTypes, createGateNode, createIoNode } from "@/components/editor/nodes/node-registry";
import { edgeTypes } from "@/components/editor/edges/edge-registry";
import { CanvasControls } from "./canvas-controls";
import { createConnectEdgeCommand } from "@/lib/commands/commands/connect-edge.command";
import { createMoveNodesCommand, type NodeMove } from "@/lib/commands/commands/move-nodes.command";
import { createAddNodeCommand } from "@/lib/commands/commands/add-node.command";
import { PALETTE_DRAG_MIME, type PaletteEntry } from "@/components/editor/sidebar/palette-item";
import type { EditorNode } from "@/types/editor";
import { useContextMenuTrigger } from "@/components/editor/context-menu/use-context-menu";

export function CircuitCanvas() {
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const onNodesChange = useEditorStore((s) => s.onNodesChange);
  const onEdgesChange = useEditorStore((s) => s.onEdgesChange);
  const setSelection = useEditorStore((s) => s.setSelection);

  const showGrid = usePreferencesStore((s) => s.showGrid);
  const gridSize = usePreferencesStore((s) => s.gridSize);
  const snapToGrid = usePreferencesStore((s) => s.snapToGrid);

  const dispatch = useCommandDispatch();
  const openContextMenu = useContextMenuTrigger();
  const dragOrigin = useRef<Map<string, { x: number; y: number }>>(new Map());
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleConnect: OnConnect = useCallback(
    (connection) => {
      dispatch(createConnectEdgeCommand(connection));
    },
    [dispatch],
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

        return {
          nodeId: n.id,
          from,
          to: n.position,
        };
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
      if (!raw || !wrapperRef.current) return;

      const entry = JSON.parse(raw) as PaletteEntry;
      const bounds = wrapperRef.current.getBoundingClientRect();
      const position = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };

      let node: EditorNode | null = null;
      if (entry.kind === "gate" && entry.gateType !== undefined) {
        node = createGateNode(position, entry.gateType);
      } else if (entry.kind === "input" || entry.kind === "output") {
        node = createIoNode(position, entry.kind, entry.kind === "input" ? "A" : "OUT");
      }

      if (node) dispatch(createAddNodeCommand(node));
    },
    [dispatch],
  );

  const handlePaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      openContextMenu({ x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY, targetId: null });
    },
    [openContextMenu],
  );

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: EditorNode) => {
      event.preventDefault();
      openContextMenu({ x: event.clientX, y: event.clientY, targetId: node.id });
    },
    [openContextMenu],
  );

  return (
    <div ref={wrapperRef} className="relative h-full w-full" onDragOver={handleDragOver} onDrop={handleDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onSelectionChange={handleSelectionChange}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        onPaneContextMenu={handlePaneContextMenu}
        onNodeContextMenu={handleNodeContextMenu}
        snapToGrid={snapToGrid}
        snapGrid={[gridSize, gridSize]}
        minZoom={0.15}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
      >
        {showGrid && (
          <Background variant={BackgroundVariant.Dots} gap={gridSize} size={1} color="var(--border-strong)" />
        )}
        <CanvasControls />
      </ReactFlow>
    </div>
  );
}
