"use client";

import {
  BaseEdge,
  ViewportPortal,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  type EdgeProps,
} from "@xyflow/react";
import { SignalState } from "@nandscape/engine";
import { useLiveSignalsStore } from "@/store/live-signals-store";
import { useSimulationStore } from "@/store/simulation-store";
import { usePreferencesStore } from "@/store/preferences-store";
import { useEditorStore } from "@/store/editor-store";
import {
  useWireDraftStore,
  type WireDraft,
} from "@/store/wire-draft-store";
import { useCommandDispatch } from "@/hooks/use-command";
import { useScreenToFlowPosition } from "@/hooks/use-flow-position";
import { createConnectEdgeCommand } from "@/lib/commands/commands/connect-edge.command";
import {
  buildOrthogonalPath,
  nearestSegmentIndex,
  type Point, snapPoint,
} from "@/lib/editor/edge-path";
import type { EditorEdge, Waypoint } from "@/types/editor";
import { createAddEdgeWaypointCommand } from "@/lib/commands/commands/add-edge-waypoint.command";
import React, {memo, useRef} from "react";

// Screen pixels of pointer movement before a waypoint pointerdown counts as
// a drag rather than click jitter (see startDragWaypoint).
const WAYPOINT_DRAG_THRESHOLD = 3;

const SIGNAL_STROKE: Record<SignalState, string> = {
  [SignalState.HIGH]: "var(--signal-green)",
  [SignalState.LOW]: "var(--signal-coral)",
  [SignalState.FLOAT]: "var(--border-strong)",
  [SignalState.UNKNOWN]: "var(--signal-unknown)",
};

function WireEdgeImpl({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps<EditorEdge>) {
  const routing = usePreferencesStore((s) => s.edgeRouting);
  const edgeMinLength = usePreferencesStore((s) => s.edgeMinLength);
  const edgeCornerRadius = usePreferencesStore((s) => s.edgeCornerRadius);
  const snapToGrid = usePreferencesStore((s) => s.snapToGrid);
  const snapGridSize = usePreferencesStore((s) => s.snapGridSize);

  const engineStatus = useSimulationStore((s) => s.status);
  const engineSignal = useSimulationStore((s) => s.signalByEdgeId[id]);
  const previewSignal = useLiveSignalsStore((s) => s.edgeSignals[id]);
  const engineActive = engineStatus === "running";
  const signal = engineActive && engineSignal !== undefined ? engineSignal : previewSignal;

  // A bus edge (BusMerge.bus-out -> BusSplit.bus-in) stands for several
  // parallel single-bit nets, not one,  neither compile-circuit.ts nor
  // live-simulate.ts ever compute a signal for it (see bus-utils.ts /
  // expandBusEdges), so it's drawn as a fixed neutral bundle instead of
  // being colored from a signal that doesn't exist.
  const isBus = data?.isBus === true;

  const updateEdgeData = useEditorStore((s) => s.updateEdgeData);
  const dragIndexRef = useRef<number | null>(null);
  const draggedWaypointRef = useRef(false);

  const dispatch = useCommandDispatch();
  const screenToFlowPosition = useScreenToFlowPosition();

  const waypoints = data?.waypoints ?? [];
  const hasWaypoints = waypoints.length > 0;

  const allPoints: Point[] = [
    { x: sourceX, y: sourceY },
    ...waypoints,
    { x: targetX, y: targetY },
  ];

  const pathArgs = {
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  };

  const [autoPath] =
    routing === "smoothstep"
      ? getSmoothStepPath({
          ...pathArgs,
          borderRadius: edgeCornerRadius,
          offset: edgeMinLength,
        })
      : routing === "straight"
        ? getStraightPath(pathArgs)
        : getBezierPath(pathArgs);

  const edgePath = hasWaypoints
    ? buildOrthogonalPath(allPoints, edgeCornerRadius)
    : autoPath;

  const BUS_STROKE = "#818cf8"; // Tailwind indigo-400, matches the bus node accent color

  const stroke = isBus
    ? BUS_STROKE
    : signal !== undefined
      ? SIGNAL_STROKE[signal]
      : SIGNAL_STROKE[SignalState.FLOAT];

  const signalWidth = isBus
    ? 5
    : signal === SignalState.HIGH
      ? 2.5
      : signal === SignalState.FLOAT
        ? 1.5
        : 2;

  const signalGlow =
    !isBus && signal === SignalState.HIGH
      ? `drop-shadow(0 0 4px ${stroke})
         drop-shadow(0 0 8px ${stroke})`
      : undefined;

  /**
   * Finds the junction-tagged waypoint at `point` on `edge`, assigning it a
   * fresh junctionId first if it's never been tapped before (or inserting a
   * brand new waypoint there if `point` isn't one of the edge's existing
   * waypoints at all - tapDraftOntoEdge's tap point is wherever the user
   * double-clicked along the path, not necessarily an existing dot).
   *
   * Only correct when `edge` is THIS component's own edge (id === the
   * enclosing WireEdgeImpl's `id`) - both call sites satisfy that, so
   * `allPoints`/`nearestSegmentIndex` below always describe the same wire
   * `edge` refers to. Shared by both tap directions (tapDraftOntoEdge and
   * startTapDraft) so a branch is a real synced junction - one shared point
   * every attached wire moves with - no matter which end you drew it from,
   * instead of two coordinates that happen to match once and drift apart
   * the moment either wire is edited.
   */
  const ensureJunctionWaypoint = (edge: EditorEdge, point: Point): string => {
    const currentWaypoints = edge.data?.waypoints ?? [];
    const existingIndex = currentWaypoints.findIndex((w) => w.x === point.x && w.y === point.y);

    if (existingIndex !== -1) {
      const existing = currentWaypoints[existingIndex];
      if (existing.junctionId) return existing.junctionId;

      const junctionId = `junction_${crypto.randomUUID().slice(0, 8)}`;
      const next = currentWaypoints.slice();
      next[existingIndex] = { ...existing, junctionId };
      useEditorStore.getState().updateEdgeData(edge.id, { waypoints: next });
      return junctionId;
    }

    const junctionId = `junction_${crypto.randomUUID().slice(0, 8)}`;
    const insertIndex = nearestSegmentIndex(allPoints, point);
    const next = currentWaypoints.slice();
    next.splice(insertIndex, 0, { ...point, junctionId });
    useEditorStore.getState().updateEdgeData(edge.id, { waypoints: next });
    return junctionId;
  };

  const tapDraftOntoEdge = (
    draft: WireDraft,
    tappedEdge: EditorEdge,
    tapPoint: Point,
  ) => {
    const virtualEndpoints = [
      {
        nodeId: tappedEdge.source,
        handleId: tappedEdge.sourceHandle ?? null,
        handleType: "source" as const,
      },
      {
        nodeId: tappedEdge.target,
        handleId: tappedEdge.targetHandle ?? null,
        handleType: "target" as const,
      },
    ];

    const match = virtualEndpoints.find(
      (ep) =>
        ep.handleType !== draft.sourceHandleType &&
        ep.nodeId !== draft.sourceNodeId,
    );

    if (!match) return;

    const junctionId = ensureJunctionWaypoint(tappedEdge, tapPoint);
    const taggedTapPoint: Waypoint = { ...tapPoint, junctionId };

    const sourceIsDraft =
      draft.sourceHandleType === "source";

    const waypointsForNewEdge = sourceIsDraft
      ? [...draft.waypoints, taggedTapPoint]
      : [taggedTapPoint, ...draft.waypoints];

    dispatch(
      createConnectEdgeCommand(
        {
          source: sourceIsDraft
            ? draft.sourceNodeId
            : match.nodeId,
          sourceHandle: sourceIsDraft
            ? draft.sourceHandleId
            : match.handleId,
          target: sourceIsDraft
            ? match.nodeId
            : draft.sourceNodeId,
          targetHandle: sourceIsDraft
            ? match.handleId
            : draft.sourceHandleId,
        },
        waypointsForNewEdge,
      ),
    );

    useWireDraftStore.getState().clear();
  };

  /**
   * The other direction of tapDraftOntoEdge: instead of tapping an existing
   * wire to *finish* a draft you already started from a real handle, this
   * starts one from a waypoint dot the wire already has (see the double-click
   * handler below - that's what creates the dot in the first place). A tap
   * point carries exactly the signal its wire's true source pin drives, so
   * the new draft's virtual source is always that pin, never the wire's
   * target - "reading" a wire never lets you drive it from the other end.
   *
   * Deliberately only handles "no draft active yet". If a draft IS active,
   * double-clicking anywhere along a wire (handleDoubleClick, via
   * tapDraftOntoEdge) already taps it to complete the connection - adding a
   * second path to the same outcome here would just be duplicate logic for
   * no new capability.
   */
  const startTapDraft = (edge: EditorEdge, point: Point) => {
    if (edge.data?.isBus) return;
    if (useWireDraftStore.getState().draft) return;

    const junctionId = ensureJunctionWaypoint(edge, point);
    useWireDraftStore.getState().start(edge.source, edge.sourceHandle ?? null, "source", point, 4);
    useWireDraftStore.getState().addWaypoint({ ...point, junctionId });
  };

  const handleWaypointClick = (point: Point) => (event: React.MouseEvent) => {
    event.stopPropagation();
    // A plain click at the end of a drag also fires a click event, this
    // tells the two apart so releasing a drag doesn't also spawn a draft.
    if (draggedWaypointRef.current) {
      draggedWaypointRef.current = false;
      return;
    }
    const edge = useEditorStore.getState().edges.find((e) => e.id === id);
    if (edge) startTapDraft(edge, point);
  };

  const handleDoubleClick = (
    event: React.MouseEvent,
  ) => {
    event.stopPropagation();

    const raw = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    const point = snapPoint(raw, snapGridSize, snapToGrid);

    const draft =
      useWireDraftStore.getState().draft;

    if (draft) {
      const tappedEdge =
        useEditorStore
          .getState()
          .edges.find((e) => e.id === id);

      if (tappedEdge) {
        tapDraftOntoEdge(
          draft,
          tappedEdge,
          point,
        );
      }

      return;
    }

    const index = nearestSegmentIndex(
      allPoints,
      point,
    );

    dispatch(
      createAddEdgeWaypointCommand(
        id,
        index,
        point,
      ),
    );

    // The dots below (and the click-to-start-a-wire gesture on them) only
    // render while this edge is selected - without this, a dot created on
    // a wire the user hadn't already clicked once would be invisible and
    // unusable right after creation.
    useEditorStore.getState().setSelection({
      nodeIds: [],
      edgeIds: [id],
    });
  };

  const startDragWaypoint =
    (index: number) =>
    (event: React.PointerEvent) => {
      event.stopPropagation();

      dragIndexRef.current = index;
      draggedWaypointRef.current = false;
      const startX = event.clientX;
      const startY = event.clientY;

      const handleMove = (
        moveEvent: PointerEvent,
      ) => {
        if (dragIndexRef.current === null)
          return;

        // Real pointer devices almost always report a pixel or two of jitter
        // between down and up even on an intended click, don't count that as
        // a drag - it would silently eat the click-to-start-a-wire gesture
        // below (see handleWaypointClick) since every "click" would look
        // like a drag that just ended.
        if (!draggedWaypointRef.current) {
          const dx = moveEvent.clientX - startX;
          const dy = moveEvent.clientY - startY;
          if (Math.hypot(dx, dy) < WAYPOINT_DRAG_THRESHOLD) return;
          draggedWaypointRef.current = true;
        }

        const raw =
          screenToFlowPosition({
            x: moveEvent.clientX,
            y: moveEvent.clientY,
          });
        const point = snapPoint(raw, snapGridSize, snapToGrid);
        const current = waypoints[dragIndexRef.current];

        // A junction-tagged point is shared with other edges - route the
        // move through moveJunction so all of them follow, instead of only
        // ever updating this one edge's own copy of the coordinates.
        if (current?.junctionId) {
          useEditorStore.getState().moveJunction(
            current.junctionId,
            point,
          );
        } else {
          const next = [...waypoints];
          next[dragIndexRef.current] = point;

          updateEdgeData(id, {
            waypoints: next,
          });
        }
      };

      const handleUp = () => {
        dragIndexRef.current = null;

        window.removeEventListener(
          "pointermove",
          handleMove,
        );

        window.removeEventListener(
          "pointerup",
          handleUp,
        );
      };

      window.addEventListener(
        "pointermove",
        handleMove,
      );

      window.addEventListener(
        "pointerup",
        handleUp,
      );
    };

  const removeWaypoint =
    (index: number) =>
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      updateEdgeData(id, {
        waypoints: waypoints.filter(
          (_, i) => i !== index,
        ),
      });
    };

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: "var(--surface-3)",
          strokeWidth: 4,
        }}
      />

      <BaseEdge
        path={edgePath}
        style={{
          stroke,
          strokeWidth: selected
            ? signalWidth + 0.5
            : signalWidth,
          filter: signalGlow,
        }}
      />

      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={14}
        style={{
          pointerEvents: "stroke",
          cursor: "pointer",
        }}
        onDoubleClick={handleDoubleClick}
      />

      {isBus && data?.busWidth !== undefined && (
        <ViewportPortal>
          <div
            className="nopan nodrag pointer-events-none select-none"
            style={{
              position: "absolute",
              transform: `translate(${(sourceX + targetX) / 2}px, ${(sourceY + targetY) / 2}px) translate(-50%, -50%)`,
              padding: "1px 5px",
              borderRadius: 9999,
              background: BUS_STROKE,
              color: "white",
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 10,
              fontWeight: 700,
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }}
          >
            ×{data.busWidth}
          </div>
        </ViewportPortal>
      )}

      {selected && hasWaypoints && (
        <ViewportPortal>
          {waypoints.map((point, index) => {
            // A junction-tagged dot is shared with at least one other edge
            // (see ensureJunctionWaypoint) - the indigo ring reuses the bus
            // badge's color above, since both mean "this represents more
            // than one wire," not just a private bend in this one.
            const isJunction = point.junctionId !== undefined;
            return (
            <div
              key={index}
              className="nopan nodrag"
              onPointerDown={startDragWaypoint(
                index,
              )}
              onClick={handleWaypointClick(
                point,
              )}
              onContextMenu={removeWaypoint(
                index,
              )}
              title={
                isJunction
                  ? "Shared junction: drag moves every wire branching from here,  click to start another,  right-click to remove from just this wire"
                  : "Drag to move,  click to start a wire from here,  right-click to remove"
              }
              style={{
                position: "absolute",
                transform: `translate(${point.x}px, ${point.y}px)`,
                width: isJunction ? 12 : 10,
                height: isJunction ? 12 : 10,
                borderRadius: "9999px",
                background:
                  "var(--copper)",
                border: isJunction
                  ? `2px solid ${BUS_STROKE}`
                  : "2px solid var(--surface-card)",
                boxShadow:
                  "0 1px 3px rgba(0,0,0,0.3)",
                cursor: "grab",
                pointerEvents: "all",
              }}
            />
            );
          })}
        </ViewportPortal>
      )}
    </>
  );
}

export const WireEdge = memo(WireEdgeImpl);
