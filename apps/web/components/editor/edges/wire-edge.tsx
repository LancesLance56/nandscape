"use client";

import { memo } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";
import { SignalState } from "@nandscape/engine";
import type { EditorEdge } from "@/types/editor";

const SIGNAL_STROKE: Record<SignalState, string> = {
  [SignalState.HIGH]: "var(--signal-green)",
  [SignalState.LOW]: "var(--signal-coral)",
  [SignalState.FLOAT]: "var(--border-strong)",
  [SignalState.UNKNOWN]: "var(--copper)",
};

function WireEdgeImpl({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps<EditorEdge>) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const signal = data?.signal;
  const stroke = signal !== undefined ? SIGNAL_STROKE[signal] : "var(--border-strong)";

  return (
    <BaseEdge
      path={edgePath}
      style={{
        stroke,
        strokeWidth: selected ? 2.5 : 2,
        filter: selected ? "drop-shadow(0 0 2px var(--copper))" : undefined,
      }}
    />
  );
}

export const WireEdge = memo(WireEdgeImpl);

export { EdgeLabelRenderer };
