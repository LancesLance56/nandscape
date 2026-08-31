"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Background,
  BackgroundVariant,
  BaseEdge,
  ConnectionMode,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  useReactFlow,
  useStore,
  useUpdateNodeInternals,
  type Connection,
  type Edge,
  type EdgeProps,
  type EdgeTypes,
  type NodeChange,
  type NodeHandle,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { cn } from "@/lib/cn";
import { layoutFlowchart, type PlacedNode } from "@/lib/flowchart/layout";
import {
  defaultAccent,
  edgeKey,
  looksLikeCode,
  type FlowAccent,
  type FlowSide,
  type FlowchartInteractive,
  type FlowchartSpec,
} from "@/lib/flowchart/types";
import {
  ACCENT,
  FLOW_NODE_TYPES,
  rendererFor,
  type FlowNodeData,
  type FlowchartNode,
} from "./flowchart-nodes";

/* -------------------------------------------------------------------------
 * Lanes
 * ---------------------------------------------------------------------- */

/**
 * A swim lane is scenery: a labelled column sitting behind the boxes. It is a
 * React Flow node purely so it pans and zooms with everything else, which is
 * why it opts out of every pointer interaction.
 */
function LaneNode({ data }: NodeProps<FlowchartNode>) {
  return (
    <div className="pointer-events-none h-full w-full rounded-xl border border-dashed border-border-strong/70 bg-surface-2/30">
      <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate">
        {data.spec.text}
      </div>
    </div>
  );
}

const NODE_TYPES: NodeTypes = { ...FLOW_NODE_TYPES, lane: LaneNode };

/* -------------------------------------------------------------------------
 * Edges
 * ---------------------------------------------------------------------- */

/**
 * Turns an explicit polyline into an SVG path with rounded interior corners.
 *
 * Deliberately not React Flow's own routing: `layoutFlowchart` already
 * decided the exact points this edge should pass through - detours travel to
 * a fixed line at a fixed distance from the node band, which is what keeps
 * two of them from ever running together - so this just draws that decision
 * rather than asking a heuristic to approximate it.
 */
function roundedPath(points: { x: number; y: number }[], radius = 10): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;
  }

  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const next = points[i + 1];
    const d1 = Math.hypot(cur.x - prev.x, cur.y - prev.y);
    const d2 = Math.hypot(next.x - cur.x, next.y - cur.y);
    const r = Math.min(radius, d1 / 2, d2 / 2);

    if (r < 0.5 || d1 < 0.5 || d2 < 0.5) {
      d += ` L${cur.x},${cur.y}`;
      continue;
    }

    const into = { x: cur.x - ((cur.x - prev.x) / d1) * r, y: cur.y - ((cur.y - prev.y) / d1) * r };
    const out = { x: cur.x + ((next.x - cur.x) / d2) * r, y: cur.y + ((next.y - cur.y) / d2) * r };
    d += ` L${into.x},${into.y} Q${cur.x},${cur.y} ${out.x},${out.y}`;
  }

  const last = points[points.length - 1];
  d += ` L${last.x},${last.y}`;
  return d;
}

interface FlowPathData extends Record<string, unknown> {
  points: { x: number; y: number }[];
  labelAt: { x: number; y: number };
}

function FlowPathEdge({
  id,
  data,
  style,
  markerStart,
  markerEnd,
  label,
  labelStyle,
  labelShowBg,
  labelBgStyle,
  labelBgPadding,
  labelBgBorderRadius,
  interactionWidth,
}: EdgeProps<Edge<FlowPathData>>) {
  const points = data?.points ?? [];
  const labelAt = data?.labelAt ?? { x: 0, y: 0 };

  return (
    <BaseEdge
      id={id}
      path={roundedPath(points)}
      labelX={labelAt.x}
      labelY={labelAt.y}
      label={label}
      labelStyle={labelStyle}
      labelShowBg={labelShowBg}
      labelBgStyle={labelBgStyle}
      labelBgPadding={labelBgPadding}
      labelBgBorderRadius={labelBgBorderRadius}
      style={style}
      markerStart={markerStart}
      markerEnd={markerEnd}
      interactionWidth={interactionWidth}
    />
  );
}

const EDGE_TYPES: EdgeTypes = { flowpath: FlowPathEdge };

/**
 * Below this, 11px box labels stop being readable.
 *
 * A left-to-right chart of a long algorithm is intrinsically wide — eleven
 * boxes in a chain is eleven box widths — so fitting one into an article
 * column can demand a zoom that renders the text as grey mush. When that
 * happens it is better to open at a legible size, anchored at the start, and
 * let the reader follow the flow rightwards. That is the reading order the
 * chart is drawn in anyway.
 */
const MIN_READABLE_ZOOM = 0.62;

/** Height one overlay strip occupies, for keeping the drawing clear of it. */
const OVERLAY_STRIP = 34;

function ViewportFit({
  width,
  height,
  insets,
  onFitChange,
  follow,
  token,
}: {
  width: number;
  height: number;
  /** Space taken by the overlay strips, which the drawing should avoid. */
  insets: { top: number; bottom: number };
  /** Reports whether the whole chart is on screen, so panning can be switched off. */
  onFitChange: (fits: boolean) => void;
  /**
   * Refit every time the drawing changes shape.
   *
   * Right for a reading widget, where the spec never changes and the only
   * shape changes are a direction flip or a resize. Wrong for an editor: the
   * layout's bounding box moves on every keystroke and every pixel of a drag,
   * so following it would yank the canvas out from under whoever is working
   * in it. Editors pass false and refit on demand via `token` instead.
   */
  follow: boolean;
  /** Bump to force a refit. The only way to refit when `follow` is false. */
  token: number;
}) {
  const { setViewport } = useReactFlow();
  const viewWidth = useStore((s) => s.width);
  const viewHeight = useStore((s) => s.height);
  // What the last fit was triggered by. In follow mode this is ignored; in
  // manual mode a run is skipped unless one of these actually moved, which is
  // what stops an edit from re-centring the canvas.
  const lastRun = useRef<string | null>(null);

  useEffect(() => {
    if (!viewWidth || !viewHeight || width <= 0 || height <= 0) return;

    const trigger = `${viewWidth}x${viewHeight}#${token}`;
    if (!follow && lastRun.current === trigger) return;
    lastRun.current = trigger;

    const pad = 16;
    // The strips the controls and legend occupy. Centring in the full box
    // would tuck the top of the drawing under the buttons.
    const insetTop = insets.top;
    const insetBottom = insets.bottom;
    const usableHeight = Math.max(viewHeight - insetTop - insetBottom, 40);

    // Deliberately not React Flow's own fitView: that measures the nodes, and
    // the loop and skip corridors run outside them. Fitting to the nodes would
    // crop every detour off the edge of the canvas.
    const fitted = Math.min((viewWidth - pad * 2) / width, (usableHeight - pad * 2) / height, 1.1);
    const zoom = Math.max(fitted, MIN_READABLE_ZOOM);

    setViewport({
      x: Math.max(pad, (viewWidth - width * zoom) / 2),
      y: insetTop + Math.max(pad, (usableHeight - height * zoom) / 2),
      zoom,
    });

    // The clamp above is the only reason a chart is ever bigger than its
    // frame: if the honest fit was legible, everything is on screen and
    // there is nothing to pan to.
    onFitChange(fitted >= MIN_READABLE_ZOOM);
  }, [viewWidth, viewHeight, width, height, insets.top, insets.bottom, setViewport, onFitChange, follow, token]);

  return null;
}

/**
 * Re-reads every node's handles after the chart changes shape.
 *
 * Swapping one chart for another on a live canvas leaves React Flow holding
 * handle bounds it measured from the *previous* chart's DOM, so edges whose
 * attachment points only exist in the new one cannot be placed. Telling it
 * to look again is exactly what `useUpdateNodeInternals` is for, and it is
 * cheaper and less destructive than remounting the canvas - which would
 * throw away the viewport, and would fire on every keystroke in the editor.
 */
function SyncNodeInternals({ signature }: { signature: string }) {
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    // Each entry is "nodeId:slot,slot"; the whole string is the dependency
    // so a change in any node's slots re-syncs, but only the ids are sent.
    const ids = signature
      .split("|")
      .filter(Boolean)
      .map((entry) => entry.slice(0, entry.indexOf(":")))
      .filter(Boolean);
    if (ids.length > 0) updateNodeInternals(ids);
  }, [signature, updateNodeInternals]);

  return null;
}

const POSITION_FOR: Record<FlowSide, Position> = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
};

/**
 * Handle positions, computed rather than measured.
 *
 * React Flow will not draw an edge until both endpoints have handle bounds,
 * and it normally gets those by reading the DOM after the node mounts. That
 * is the right default for nodes sized by their content, but here the layout
 * already knows every box's exact size and has already decided where each
 * arrow should attach. Supplying the slots means edges are correct on the
 * first frame instead of appearing after a measurement pass, and the diagram
 * no longer depends on a ResizeObserver having fired.
 *
 * The four centre handles come along as a fallback so a node with no edges is
 * still considered initialised by React Flow.
 */
function handlesFor(node: PlacedNode): NodeHandle[] {
  const centres: NodeHandle[] = (["top", "right", "bottom", "left"] as FlowSide[]).flatMap((side) => {
    const x = side === "left" ? 0 : side === "right" ? node.width : node.width / 2;
    const y = side === "top" ? 0 : side === "bottom" ? node.height : node.height / 2;
    return [
      { id: `s-${side}`, type: "source" as const, position: POSITION_FOR[side], x, y, width: 1, height: 1 },
      { id: `t-${side}`, type: "target" as const, position: POSITION_FOR[side], x, y, width: 1, height: 1 },
    ];
  });

  const assigned: NodeHandle[] = node.slots.map((slot) => ({
    id: slot.id,
    type: slot.type,
    position: POSITION_FOR[slot.side],
    x: slot.x,
    y: slot.y,
    width: 1,
    height: 1,
  }));

  return [...centres, ...assigned];
}

/* -------------------------------------------------------------------------
 * Canvas
 * ---------------------------------------------------------------------- */

export interface FlowchartCanvasProps {
  spec: FlowchartSpec;
  interactive: Required<FlowchartInteractive>;
  /** Omit to size the box from the chart itself. */
  height?: number;
  selectedId?: string | null;
  onSelectNode?: (id: string | null) => void;
  /** Ids to fade out. Empty means "show everything at full strength". */
  dimmed?: ReadonlySet<string>;
  /** The current walkthrough node/edge. */
  activeNodes?: ReadonlySet<string>;
  activeEdges?: ReadonlySet<string>;
  visitedNodes?: ReadonlySet<string>;
  /**
   * Called continuously while a box is dragged, not just when it is dropped.
   *
   * React Flow will not move a node it does not own, and this canvas hands it
   * a `nodes` array derived from the layout on every render. So the position
   * has to make the round trip through the spec: the change is written here,
   * the layout re-runs, and the box arrives back under the cursor with its
   * arrows re-routed to match. Doing it per frame rather than on drop is what
   * makes that round trip look like a drag instead of a jump.
   */
  onNodeMove?: (id: string, position: { x: number; y: number }) => void;
  /** Drag from a box's port to another box. Enables the connect ports. */
  onConnectNodes?: (from: string, to: string) => void;
  /** Backspace/Delete on the current selection. */
  onDelete?: (nodeIds: string[], edgeIds: string[]) => void;
  /** Double-click a box, for rename-in-place. */
  onNodeDoubleClick?: (id: string) => void;
  selectedEdgeId?: string | null;
  onSelectEdge?: (id: string | null) => void;
  /** The box currently being renamed in place, if any. */
  editingNodeId?: string | null;
  onEditingText?: (id: string, text: string) => void;
  onEditingDone?: () => void;
  /** Refit whenever the drawing changes shape. Off for editors - see ViewportFit. */
  autoFit?: boolean;
  /** Bump to refit on demand. Only route to a fit when `autoFit` is false. */
  fitToken?: number;
  /** Pan and zoom even when the whole chart already fits. */
  freeMove?: boolean;
  /** Dot grid behind the drawing. Reads as a workspace, so: editors only. */
  showGrid?: boolean;
  /**
   * Fill the parent instead of taking a computed pixel height.
   *
   * A chart in an article sizes itself to its own drawing, because the space
   * around it belongs to the prose. A chart in a full-window editor is the
   * opposite: the canvas is the room, and the drawing sits inside it.
   */
  fill?: boolean;
  /**
   * Floated over the drawing rather than stacked above it. A chart is mostly
   * empty space around its own shape, so controls and a legend sit in that
   * space for free - where a row of their own would have pushed the diagram
   * down and shrunk it.
   */
  overlayTop?: ReactNode;
  overlayBottom?: ReactNode;
  className?: string;
}

const EMPTY_SET: ReadonlySet<string> = new Set();
const ORIGIN = { x: 0, y: 0 };

export function FlowchartCanvas({
  spec,
  interactive,
  height,
  selectedId = null,
  onSelectNode,
  dimmed = EMPTY_SET,
  activeNodes = EMPTY_SET,
  activeEdges = EMPTY_SET,
  visitedNodes = EMPTY_SET,
  onNodeMove,
  onConnectNodes,
  onDelete,
  onNodeDoubleClick,
  selectedEdgeId = null,
  onSelectEdge,
  editingNodeId = null,
  onEditingText,
  onEditingDone,
  autoFit = true,
  fitToken = 0,
  freeMove = false,
  showGrid = false,
  fill = false,
  overlayTop,
  overlayBottom,
  className,
}: FlowchartCanvasProps) {
  const layout = useMemo(() => layoutFlowchart(spec), [spec]);

  // Only top-level boxes are shifted to make room for the corridors.
  const topLevel = useMemo(
    () => new Set(layout.nodes.filter((n) => !n.parentId).map((n) => n.id)),
    [layout],
  );

  // A chart that is entirely on screen has nowhere to pan to, and letting it
  // drift under the cursor just feels broken. Panning and zooming switch on
  // only once the drawing is genuinely too big for its frame.
  const [fitsInView, setFitsInView] = useState(true);
  const canMove = freeMove || (interactive.zoom && !fitsInView);

  // Who owns the wheel. A canvas that fills its container is the page, so it
  // takes the scroll; a canvas sitting in an article is a widget the reader is
  // scrolling *past*, and swallowing that gesture is maddening on a phone
  // where every scroll starts on top of something. An editor in an article
  // therefore pans by dragging but never by scrolling.
  const ownsScroll = fill ? canMove : interactive.zoom && !fitsInView;

  // While a connection is being dragged, every box has to become a drop
  // target across its whole face. The rest of the time that same element
  // would sit on top of the box and swallow clicks, so it is switched on
  // through this class rather than mounted and unmounted.
  const [connecting, setConnecting] = useState(false);
  const editable = Boolean(onConnectNodes);

  // Changes whenever any node's set of attachment points changes, which is
  // precisely when React Flow's measured handle bounds have gone stale.
  const handleSignature = useMemo(
    () => layout.nodes.map((n) => `${n.id}:${n.slots.map((s) => s.id).join(",")}`).join("|"),
    [layout],
  );

  // A left-to-right chart is wide and short, so a fixed box height would leave
  // a band of empty canvas above and below it. Sizing from the layout keeps
  // the frame close to the drawing whatever shape the chart turns out to be.
  // The extra allowance is for the two overlay strips: without it the legend
  // and the controls would sit on top of the drawing instead of beside it.
  // Even so the widget is shorter than it was, because those strips replaced
  // two full-width rows.
  const boxHeight =
    height ??
    Math.round(Math.min(540, Math.max(268, layout.height * MIN_READABLE_ZOOM + 104)));

  const nodes = useMemo<FlowchartNode[]>(() => {
    const lanes: FlowchartNode[] = layout.lanes.map((lane) => ({
      id: `__lane-${lane.id}`,
      type: "lane",
      position: { x: lane.x, y: lane.y },
      // Explicit dimensions rather than style alone: React Flow keeps a node
      // `visibility: hidden` until it has measured it. The layout already knows
      // every size, so handing them over skips the measurement pass entirely.
      width: lane.width,
      height: lane.height,
      draggable: false,
      selectable: false,
      focusable: false,
      zIndex: -2,
      data: {
        spec: { id: lane.id, type: "group" as const, text: lane.label },
        accent: "neutral" as FlowAccent,
        mono: false,
        slots: [],
        dimmed: false,
        active: false,
        visited: false,
        clickable: false,
      },
    }));

    const boxes: FlowchartNode[] = layout.nodes.map((n) => {
      const accent = n.accent ?? defaultAccent(n.type);
      const isGroup = n.type === "group";
      const data: FlowNodeData = {
        spec: n,
        accent,
        mono: n.mono ?? looksLikeCode(n.text),
        slots: n.slots,
        dimmed: dimmed.has(n.id),
        active: activeNodes.has(n.id),
        visited: visitedNodes.has(n.id),
        clickable: Boolean(onSelectNode) && !isGroup,
        connectable: editable,
        editing: editingNodeId === n.id,
        onTextChange: onEditingText,
        onTextDone: onEditingDone,
      };

      return {
        id: n.id,
        type: rendererFor(n.type),
        position: { x: n.x, y: n.y },
        width: n.width,
        height: n.height,
        handles: handlesFor(n),
        selected: selectedId === n.id,
        draggable: interactive.draggable,
        // A group must never intercept a click meant for a box inside it.
        selectable: !isGroup,
        ...(n.parentId ? { parentId: n.parentId, extent: "parent" as const } : {}),
        zIndex: isGroup ? -1 : 0,
        data,
      };
    });

    return [...lanes, ...boxes];
  }, [
    layout,
    dimmed,
    activeNodes,
    visitedNodes,
    selectedId,
    interactive.draggable,
    onSelectNode,
    editable,
    editingNodeId,
    onEditingText,
    onEditingDone,
  ]);

  const edges = useMemo<Edge<FlowPathData>[]>(
    () =>
      layout.edges.map((e) => {
        const key = edgeKey(e);
        const isActive = activeEdges.has(key);
        const accent: FlowAccent = e.accent ?? (e.back ? "copper" : "neutral");
        const colors = ACCENT[accent];
        // A back edge is the loop, and saying so in the drawing saves the
        // reader from tracing where the line lands.
        const stroke = isActive ? "var(--copper)" : e.back ? colors.line : "var(--border-strong)";
        const faded = dimmed.has(e.from) || dimmed.has(e.to);

        const isSelected = selectedEdgeId === key;

        return {
          id: key,
          source: e.from,
          target: e.to,
          selected: isSelected,
          selectable: Boolean(onSelectEdge),
          // A 1.7px line is not a click target. Widening only the invisible
          // interaction band keeps the drawing unchanged while making an
          // arrow something you can actually hit.
          interactionWidth: onSelectEdge ? 18 : 0,
          // Still needed so React Flow considers this edge drawable at all -
          // it will not render an edge whose nodes are not "initialised" -
          // but the actual path comes from `data.points`, computed by the
          // layout, not from these handles' positions.
          sourceHandle: e.fromHandle || `s-${e.fromSide}`,
          targetHandle: e.toHandle || `t-${e.toSide}`,
          type: "flowpath",
          data: { points: e.points, labelAt: e.labelAt },
          animated: e.animated ?? isActive,
          label: e.label,
          labelShowBg: Boolean(e.label),
          labelBgPadding: [6, 3] as [number, number],
          labelBgBorderRadius: 4,
          labelStyle: {
            fill: isActive ? "var(--copper-dark)" : e.back ? colors.text : "var(--slate)",
            fontSize: 10,
            fontWeight: 700,
          },
          labelBgStyle: { fill: "var(--surface-card)", stroke: "var(--border)", strokeWidth: 0.8 },
          style: {
            stroke: isSelected ? "var(--ink)" : stroke,
            strokeWidth: isSelected ? 2.8 : isActive ? 2.6 : e.back ? 1.9 : 1.7,
            strokeDasharray: e.kind === "dashed" || (e.back && e.kind !== "solid") ? "5 4" : undefined,
            opacity: faded ? 0.18 : 1,
            transition: "opacity 200ms, stroke 200ms",
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 16,
            height: 16,
            color: isSelected ? "var(--ink)" : stroke,
          },
          zIndex: isSelected || isActive ? 5 : 1,
        };
      }),
    [layout, activeEdges, dimmed, selectedEdgeId, onSelectEdge],
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: FlowchartNode) => {
      if (node.type === "lane") return;
      onSelectEdge?.(null);
      if (!onSelectNode || node.type === "group") return;
      onSelectNode(node.id === selectedId ? null : node.id);
    },
    [onSelectNode, onSelectEdge, selectedId],
  );

  /**
   * The one thing that makes dragging work at all.
   *
   * React Flow only applies a position change itself when it owns the node
   * array (`defaultNodes`). This canvas passes `nodes`, so without an
   * `onNodesChange` the library computes the drag, emits the change, and
   * drops it on the floor: the box never moves and `onNodeDragStop` reports
   * the position the box started at. Forwarding position changes into the
   * spec is what closes that loop.
   */
  const handleNodesChange = useCallback(
    (changes: NodeChange<FlowchartNode>[]) => {
      if (!onNodeMove) return;
      for (const change of changes) {
        if (change.type !== "position" || !change.position) continue;

        // Back out of the layout's frame into the spec's. The layout pushes
        // every top-level box over to leave room for the corridors that run
        // outside the drawing, so what React Flow reports is that far from
        // the number a spec stores; writing it back untranslated moved a box
        // by the corridor depth every single time it was picked up. A box
        // inside a group is positioned relative to its parent and is never
        // pushed, so it is already in the right frame.
        const shift = topLevel.has(change.id) ? layout.offset : ORIGIN;
        onNodeMove(change.id, {
          x: Math.round(change.position.x - shift.x),
          y: Math.round(change.position.y - shift.y),
        });
      }
    },
    [onNodeMove, layout.offset, topLevel],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target || connection.source === connection.target) return;
      onConnectNodes?.(connection.source, connection.target);
    },
    [onConnectNodes],
  );

  /**
   * React Flow's combined delete callback rather than the per-kind pair.
   *
   * Deleting a box also deletes the arrows touching it, and the two separate
   * callbacks would report those as two events - which the editor would
   * record as two undo steps for one press of Delete.
   */
  const handleDelete = useCallback(
    ({ nodes: deletedNodes, edges: deletedEdges }: { nodes: FlowchartNode[]; edges: Edge[] }) => {
      const nodeIds = deletedNodes.filter((n) => n.type !== "lane").map((n) => n.id);
      const edgeIds = deletedEdges.map((e) => e.id);
      if (nodeIds.length > 0 || edgeIds.length > 0) onDelete?.(nodeIds, edgeIds);
    },
    [onDelete],
  );

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-surface-2/25",
        !fill && "rounded-xl border border-border",
        fill && "h-full w-full",
        connecting && "fc-connecting",
        className,
      )}
      style={fill ? undefined : { height: boxHeight }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={handleNodesChange}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={(_, node) => {
          if (node.type !== "lane") onNodeDoubleClick?.(node.id);
        }}
        onEdgeClick={(_, edge) => {
          onSelectNode?.(null);
          onSelectEdge?.(edge.id === selectedEdgeId ? null : edge.id);
        }}
        onPaneClick={() => {
          onSelectNode?.(null);
          onSelectEdge?.(null);
        }}
        onConnect={handleConnect}
        onConnectStart={() => setConnecting(true)}
        onConnectEnd={() => setConnecting(false)}
        onDelete={handleDelete}
        nodesDraggable={interactive.draggable}
        nodesConnectable={editable}
        // Loose: a port is whichever end the drag needs it to be, so an
        // arrow can be pulled from any side of a box to any side of another
        // without the author having to know which ports are sources.
        connectionMode={ConnectionMode.Loose}
        connectionRadius={26}
        connectionLineStyle={{ stroke: "var(--copper)", strokeWidth: 2, strokeDasharray: "4 3" }}
        // React Flow already ignores these keys while a text field has focus,
        // so this does not fight the inspector.
        deleteKeyCode={onDelete ? ["Backspace", "Delete"] : null}
        elementsSelectable={Boolean(onSelectNode)}
        minZoom={0.2}
        maxZoom={2.5}
        zoomOnScroll={ownsScroll}
        zoomOnPinch={canMove}
        // Double-click means "rename this box" wherever editing is on, so it
        // cannot also mean "zoom in".
        zoomOnDoubleClick={!editable && canMove}
        panOnDrag={canMove}
        selectionOnDrag={false}
        preventScrolling={ownsScroll}
        proOptions={{ hideAttribution: true }}
        attributionPosition="bottom-left"
        // React Flow drops an edge it cannot place and says nothing, which is
        // a miserable thing to debug: the chart would quietly have fewer
        // arrows than the spec does. Surfacing it turns that into a visible
        // error rather than a silently wrong diagram.
        onError={(code, message) => {
          if (process.env.NODE_ENV !== "production") {
            console.error(`[flowchart] React Flow ${code}: ${message}`);
          }
        }}
      >
        <ViewportFit
          width={layout.width}
          height={layout.height}
          insets={{ top: overlayTop ? OVERLAY_STRIP : 0, bottom: overlayBottom ? OVERLAY_STRIP : 0 }}
          onFitChange={setFitsInView}
          follow={autoFit}
          token={fitToken}
        />
        <SyncNodeInternals signature={handleSignature} />

        {showGrid && (
          <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="var(--border-strong)" />
        )}

        {/* pointer-events only on the controls themselves, so the empty parts
            of these strips never swallow a drag meant for the canvas. */}
        {overlayTop && (
          <Panel position="top-left" className="!m-2 !pointer-events-none">
            <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">{overlayTop}</div>
          </Panel>
        )}
        {overlayBottom && (
          <Panel position="bottom-left" className="!m-2 !pointer-events-none">
            <div className="pointer-events-auto">{overlayBottom}</div>
          </Panel>
        )}
        {interactive.minimap && (
          <MiniMap
            pannable
            zoomable
            position="top-right"
            className="!bg-surface-2"
            maskColor="rgba(0,0,0,0.06)"
            nodeColor={(n) => {
              const data = n.data as FlowNodeData | undefined;
              return data ? ACCENT[data.accent].line : "var(--border-strong)";
            }}
          />
        )}
      </ReactFlow>
    </div>
  );
}

/** Refits the view whenever the chart changes shape, e.g. after a direction flip. */
export function useRefitOnChange(dep: unknown) {
  const { fitView } = useReactFlow();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = window.setTimeout(() => fitView({ padding: 0.12, maxZoom: 1.1, duration: 260 }), 30);
    return () => window.clearTimeout(id);
  }, [dep, fitView]);
}
