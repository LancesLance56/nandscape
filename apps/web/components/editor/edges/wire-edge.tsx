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
import type { EditorEdge } from "@/types/editor";
import { createAddEdgeWaypointCommand } from "@/lib/commands/commands/add-edge-waypoint.command";
import React, {memo, useRef} from "react";

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

  const updateEdgeData = useEditorStore((s) => s.updateEdgeData);
  const dragIndexRef = useRef<number | null>(null);

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
    ? buildOrthogonalPath(allPoints)
    : autoPath;

  const stroke =
    signal !== undefined
      ? SIGNAL_STROKE[signal]
      : SIGNAL_STROKE[SignalState.FLOAT];

  const signalWidth =
    signal === SignalState.HIGH
      ? 2.5
      : signal === SignalState.FLOAT
        ? 1.5
        : 2;

  const signalGlow =
    signal === SignalState.HIGH
      ? `drop-shadow(0 0 4px ${stroke})
         drop-shadow(0 0 8px ${stroke})`
      : undefined;

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

    const sourceIsDraft =
      draft.sourceHandleType === "source";

    const waypointsForNewEdge = sourceIsDraft
      ? [...draft.waypoints, tapPoint]
      : [tapPoint, ...draft.waypoints];

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
  };

  const startDragWaypoint =
    (index: number) =>
    (event: React.PointerEvent) => {
      event.stopPropagation();

      dragIndexRef.current = index;

      const handleMove = (
        moveEvent: PointerEvent,
      ) => {
        if (dragIndexRef.current === null)
          return;

        const raw =
          screenToFlowPosition({
            x: moveEvent.clientX,
            y: moveEvent.clientY,
          });
        const point = snapPoint(raw, snapGridSize, snapToGrid);

        const next = [...waypoints];
        next[dragIndexRef.current] = point;

        updateEdgeData(id, {
          waypoints: next,
        });
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

      {selected && hasWaypoints && (
        <ViewportPortal>
          {waypoints.map((point, index) => (
            <div
              key={index}
              className="nopan nodrag"
              onPointerDown={startDragWaypoint(
                index,
              )}
              onContextMenu={removeWaypoint(
                index,
              )}
              title="Drag to move,  right-click to remove"
              style={{
                position: "absolute",
                transform: `translate(${point.x}px, ${point.y}px)`,
                width: 10,
                height: 10,
                borderRadius: "9999px",
                background:
                  "var(--copper)",
                border:
                  "2px solid var(--surface-card)",
                boxShadow:
                  "0 1px 3px rgba(0,0,0,0.3)",
                cursor: "grab",
                pointerEvents: "all",
              }}
            />
          ))}
        </ViewportPortal>
      )}
    </>
  );
}

export const WireEdge = memo(WireEdgeImpl);
