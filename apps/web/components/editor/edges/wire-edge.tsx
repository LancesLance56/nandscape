"use client";

import { memo, useRef } from "react";
import {
  BaseEdge,
  ViewportPortal,
  useReactFlow,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  type EdgeProps,
} from "@xyflow/react";
import { SignalState } from "@nandscape/engine";
import { useLiveSignalsStore } from "@/store/live-signals-store";
import { usePreferencesStore } from "@/store/preferences-store";
import { useEditorStore } from "@/store/editor-store";
import { buildOrthogonalPath, nearestSegmentIndex, type Point } from "@/lib/editor/edge-path";
import type { EditorEdge } from "@/types/editor";

const SIGNAL_STROKE: Record<SignalState, string> = {
  [SignalState.HIGH]: "var(--signal-green)",
  [SignalState.LOW]: "var(--signal-coral)",
  [SignalState.FLOAT]: "var(--border-strong)",
  [SignalState.UNKNOWN]: "var(--copper)",
};

/**
 * A single wire. Color reflects the live combinational preview
 * (live-signals-store, kept live by hooks/use-live-simulation.ts); HIGH
 * wires animate via the nandscape-wire-flow keyframes in globals.css.
 *
 * Routing: with no `data.waypoints`, follows preferences-store.edgeRouting
 * (bezier/smoothstep/straight) same as before. Once the user has placed
 * turns — either by click-routing the wire from scratch (see
 * canvas/circuit-canvas.tsx + wire-draft-store) or by double-clicking an
 * existing wire to insert one — it switches to an elbow-routed polyline
 * through those points instead, and shows draggable turn markers (via
 * ViewportPortal, so they pan/zoom with the graph) whenever selected.
 * Right-click a marker to remove that turn; right-click the wire itself
 * deletes the whole thing (see canvas/circuit-canvas.tsx's
 * onEdgeContextMenu and context-menu/context-menu-registry.ts).
 */
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
  const animateSignals = usePreferencesStore((s) => s.animateSignals);
  const reducedMotion = usePreferencesStore((s) => s.reducedMotion);
  const signal = useLiveSignalsStore((s) => s.edgeSignals[id]);
  const updateEdgeData = useEditorStore((s) => s.updateEdgeData);
  const { screenToFlowPosition } = useReactFlow();
  const dragIndexRef = useRef<number | null>(null);

  const waypoints = data?.waypoints ?? [];
  const hasWaypoints = waypoints.length > 0;
  const allPoints: Point[] = [{ x: sourceX, y: sourceY }, ...waypoints, { x: targetX, y: targetY }];

  const pathArgs = { sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition };
  const [autoPath] =
    routing === "smoothstep"
      ? getSmoothStepPath({ ...pathArgs, borderRadius: 8 })
      : routing === "straight"
        ? getStraightPath(pathArgs)
        : getBezierPath(pathArgs);

  const edgePath = hasWaypoints ? buildOrthogonalPath(allPoints) : autoPath;

  const stroke = signal !== undefined ? SIGNAL_STROKE[signal] : SIGNAL_STROKE[SignalState.FLOAT];
  const shouldAnimate = animateSignals && !reducedMotion && signal === SignalState.HIGH;

  const handleDoubleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const index = nearestSegmentIndex(allPoints, point);
    const next = [...waypoints];
    next.splice(index, 0, point);
    updateEdgeData(id, { waypoints: next });
  };

  const startDragWaypoint = (index: number) => (event: React.PointerEvent) => {
    event.stopPropagation();
    dragIndexRef.current = index;

    const handleMove = (moveEvent: PointerEvent) => {
      if (dragIndexRef.current === null) return;
      const point = screenToFlowPosition({ x: moveEvent.clientX, y: moveEvent.clientY });
      const next = [...waypoints];
      next[dragIndexRef.current] = point;
      updateEdgeData(id, { waypoints: next });
    };
    const handleUp = () => {
      dragIndexRef.current = null;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const removeWaypoint = (index: number) => (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    updateEdgeData(id, { waypoints: waypoints.filter((_, i) => i !== index) });
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke,
          strokeWidth: selected ? 2.5 : 2,
          strokeDasharray: shouldAnimate ? "6 4" : undefined,
          animation: shouldAnimate ? "nandscape-wire-flow 0.6s linear infinite" : undefined,
          filter: selected ? "drop-shadow(0 0 2px var(--copper))" : undefined,
        }}
      />
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={14}
        style={{ pointerEvents: "stroke", cursor: "pointer" }}
        onDoubleClick={handleDoubleClick}
      />

      {selected && hasWaypoints && (
        <ViewportPortal>
          {waypoints.map((point, index) => (
            <div
              key={index}
              className="nopan nodrag"
              onPointerDown={startDragWaypoint(index)}
              onContextMenu={removeWaypoint(index)}
              title="Drag to move — right-click to remove"
              style={{
                position: "absolute",
                transform: `translate(${point.x}px, ${point.y}px) translate(-50%, -50%)`,
                width: 10,
                height: 10,
                borderRadius: "9999px",
                background: "var(--copper)",
                border: "2px solid var(--surface-card)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
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
