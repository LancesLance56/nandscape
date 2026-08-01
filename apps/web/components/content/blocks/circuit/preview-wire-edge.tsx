"use client";

import { memo } from "react";
import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";
import { SignalState } from "@nandscape/engine";
import type { EditorEdge } from "@/types/editor";

const SIGNAL_STROKE: Record<SignalState, string> = {
  [SignalState.HIGH]: "var(--signal-green)",
  [SignalState.LOW]: "var(--signal-coral)",
  [SignalState.FLOAT]: "var(--border-strong)",
  [SignalState.UNKNOWN]: "var(--signal-unknown)",
};

function PreviewWireEdgeImpl({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<EditorEdge>) {
  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  const signal = (data as { signal?: SignalState } | undefined)?.signal;
  const stroke = signal !== undefined ? SIGNAL_STROKE[signal] : SIGNAL_STROKE[SignalState.FLOAT];
  const isHigh = signal === SignalState.HIGH;

  return (
    <>
      <BaseEdge path={path} interactionWidth={0} style={{ stroke: "var(--surface-2)", strokeWidth: 4 }} />
      <BaseEdge
        path={path}
        interactionWidth={0}
        style={{
          stroke,
          strokeWidth: isHigh ? 2.5 : 2,
          filter: isHigh ? `drop-shadow(0 0 4px ${stroke})` : undefined,
        }}
      />
    </>
  );
}

export const PreviewWireEdge = memo(PreviewWireEdgeImpl);
