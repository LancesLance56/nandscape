"use client";

import { useEffect, useMemo } from "react";
import {
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStore,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

/**
 * Shared React Flow renderer for the recursion pictures - the backtracking
 * search tree and the dynamic-programming / sorting call tree. Both used to be
 * an SVG inside a horizontally-scrolling box; here they pan and zoom live
 * instead, so a wide tree is explored by dragging rather than by hunting for a
 * scrollbar. The two callers keep their own colour logic and hand this a
 * fully-styled, already-placed node list - this file knows nothing about
 * statuses, pruning or cache hits.
 */

export interface RfTreeNode {
  id: string;
  parentId: string | null;
  /** Centre, in layout units on the x axis (scaled here) and pixels on y. */
  x: number;
  y: number;
  /** Box width in pixels. Height is uniform (`nodeHeight`). */
  width: number;
  label: string;
  /** A second line inside the box, e.g. a returned value (`= 5`). */
  sublabel?: string;
  fill: string;
  stroke: string;
  text: string;
  dash?: string;
  strokeWidth: number;
  opacity: number;
  /** Dashed outer ring - the call tree's "this work repeats" marker. */
  ring?: boolean;
  /** Diagonal strike-through - the search tree's "rejected before exploring". */
  slash?: boolean;
  /** Style of the edge coming down from this node's parent. */
  edgeStroke: string;
  edgeWidth: number;
  edgeDash?: string;
  edgeOpacity: number;
}

interface TreeNodeData extends Record<string, unknown> {
  node: RfTreeNode;
  nodeHeight: number;
}

function TreeNodeView({ data }: NodeProps<Node<TreeNodeData>>) {
  const { node, nodeHeight } = data;
  return (
    <div
      className="relative flex flex-col items-center justify-center rounded-lg text-center"
      style={{
        width: node.width,
        height: nodeHeight,
        background: node.fill,
        border: `${node.strokeWidth}px ${node.dash ? "dashed" : "solid"} ${node.stroke}`,
        color: node.text,
        opacity: node.opacity,
      }}
    >
      {node.ring && (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-1 rounded-[11px] border border-dashed"
          style={{ borderColor: "var(--signal-coral)", opacity: 0.8 }}
        />
      )}
      <span className="px-1 text-[11px] font-bold leading-none">{node.label}</span>
      {node.sublabel && (
        <span className="text-[10px] font-semibold leading-none tabular-nums">{node.sublabel}</span>
      )}
      {node.slash && (
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0"
          width="100%"
          height="100%"
          preserveAspectRatio="none"
        >
          <line x1="10%" y1="82%" x2="90%" y2="18%" stroke="var(--signal-coral)" strokeWidth={1.4} opacity={0.75} />
        </svg>
      )}
      {/* Handles are required for edges to attach; kept invisible and inert. */}
      <Handle type="target" position={Position.Top} style={HANDLE_STYLE} isConnectable={false} />
      <Handle type="source" position={Position.Bottom} style={HANDLE_STYLE} isConnectable={false} />
    </div>
  );
}

const HANDLE_STYLE = { opacity: 0, width: 1, height: 1, minWidth: 1, minHeight: 1, border: "none", background: "transparent", pointerEvents: "none" as const };

const NODE_TYPES = { tree: TreeNodeView };

/** Recentres the viewport on the active node, but only when it has actually
 *  gone off screen - otherwise every frame nudges the view and the tree
 *  appears to drift on its own. */
function FollowActive({ cx, cy, zoom }: { cx: number | null; cy: number | null; zoom: number }) {
  const { setCenter } = useReactFlow();
  const tx = useStore((s) => s.transform[0]);
  const ty = useStore((s) => s.transform[1]);
  const k = useStore((s) => s.transform[2]);
  const width = useStore((s) => s.width);
  const height = useStore((s) => s.height);

  useEffect(() => {
    if (cx === null || cy === null || !width || !height) return;
    const screenX = cx * k + tx;
    const screenY = cy * k + ty;
    const pad = 48;
    const offscreen =
      screenX < pad || screenX > width - pad || screenY < pad || screenY > height - pad;
    if (offscreen) setCenter(cx, cy, { duration: 320, zoom: k || zoom });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- transform reads are a snapshot, not deps
  }, [cx, cy]);

  return null;
}

interface RfTreeProps {
  nodes: RfTreeNode[];
  /** The layout-space width the callers place nodes in (TREE_WIDTH etc.). */
  layoutWidth: number;
  /** Pixel width the tree is drawn at, before pan/zoom. */
  renderWidth: number;
  /** Pixel height of the drawn tree. */
  renderHeight: number;
  nodeHeight: number;
  activeId: string | null;
  maxHeight: number;
  ariaLabel: string;
}

function RfTreeInner({
  nodes,
  layoutWidth,
  renderWidth,
  renderHeight,
  nodeHeight,
  activeId,
  maxHeight,
  ariaLabel,
}: RfTreeProps) {
  const sx = (x: number) => (x * renderWidth) / layoutWidth;

  // Pan / zoom (and the scroll capture that comes with it) switch on only when
  // the tree is genuinely bigger than its frame. A small tree that already
  // fits has nowhere to pan, and trapping the page scroll over it would just
  // feel broken.
  const canMove = renderWidth > 520 || renderHeight > maxHeight - 16;

  const rfNodes = useMemo<Node<TreeNodeData>[]>(
    () =>
      nodes.map((n) => ({
        id: n.id,
        type: "tree",
        position: { x: sx(n.x) - n.width / 2, y: n.y - nodeHeight / 2 },
        width: n.width,
        height: nodeHeight,
        draggable: false,
        selectable: false,
        connectable: false,
        focusable: false,
        data: { node: n, nodeHeight },
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sx is derived from the sizing props below
    [nodes, renderWidth, layoutWidth, nodeHeight],
  );

  const byId = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes]);
  const rfEdges = useMemo<Edge[]>(
    () =>
      nodes
        .filter((n) => n.parentId && byId.has(n.parentId))
        .map((n) => ({
          id: `e-${n.id}`,
          source: n.parentId as string,
          target: n.id,
          type: "straight",
          style: {
            stroke: n.edgeStroke,
            strokeWidth: n.edgeWidth,
            strokeDasharray: n.edgeDash,
            opacity: n.edgeOpacity,
          },
        })),
    [nodes, byId],
  );

  const active = activeId ? nodes.find((n) => n.id === activeId) ?? null : null;

  return (
    <div
      className="not-prose relative overflow-hidden rounded-lg border border-border bg-surface-2/30"
      style={{ height: maxHeight }}
    >
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.16, maxZoom: 1.15 }}
        minZoom={0.2}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={canMove}
        zoomOnScroll={canMove}
        zoomOnPinch={canMove}
        zoomOnDoubleClick={false}
        panOnScroll={false}
        preventScrolling={canMove}
        proOptions={{ hideAttribution: true }}
        aria-label={ariaLabel}
      >
        {canMove && <Controls showInteractive={false} position="bottom-right" />}
        <FollowActive
          cx={active ? sx(active.x) : null}
          cy={active ? active.y : null}
          zoom={1}
        />
      </ReactFlow>
    </div>
  );
}

export function RfTree(props: RfTreeProps) {
  return (
    <ReactFlowProvider>
      <RfTreeInner {...props} />
    </ReactFlowProvider>
  );
}
