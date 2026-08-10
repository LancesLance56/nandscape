"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { useShallow } from "zustand/react/shallow";
import { NodeHandle, Position } from "./node-handle";
import { NODE_WIDTH } from "./gate-shapes";
import { useHandleClick } from "@/hooks/use-handle-click";
import { usePreferencesStore } from "@/store/preferences-store";
import { clampBusWidth, laneHandle } from "@/lib/editor/bus-utils";
import type { BusMergeNodeData, EditorNode } from "@/types/editor";

/** N single-bit lanes converging into one bus-out. Mirror of BusSplitNode
 *  (see bus-split-node.tsx); layout math intentionally matches gate-node.tsx
 *  so a bus node's lane spacing lines up with an ordinary gate's. */
function BusMergeNodeImpl({ id, data, selected }: NodeProps<EditorNode>) {
  const busData = data as BusMergeNodeData;
  const width = clampBusWidth(busData.width);
  const { onHandleClick, onHandleMouseEnter, onHandleMouseLeave } = useHandleClick();

  const { margin, spacing, minHeight } = usePreferencesStore(
    useShallow((s) => ({
      margin: s.gateNodeTopMargin,
      spacing: s.gateNodePortSpacing,
      minHeight: s.gateNodeMinHeight,
    })),
  );

  const nodeHeight = Math.max(minHeight, margin * 2 + (width - 1) * spacing);
  const availableHeight = nodeHeight - margin * 2;
  const verticalPos = (index: number, count: number) =>
    count <= 1 ? nodeHeight / 2 : margin + index * (availableHeight / (count - 1));

  return (
    <div
      style={{ height: `${nodeHeight}px`, width: `${NODE_WIDTH}px` }}
      className="relative flex items-center justify-center"
    >
      {Array.from({ length: width }).map((_, i) => (
        <NodeHandle
          key={`in-${i}`}
          id={laneHandle("in", i)}
          type="target"
          position={Position.Left}
          style={{ top: `${verticalPos(i, width)}px` }}
          onClick={(event) => onHandleClick(id, laneHandle("in", i), "target", event)}
          onMouseEnter={(event) => onHandleMouseEnter(id, "target", event)}
          onMouseLeave={onHandleMouseLeave}
        />
      ))}

      <NodeHandle
        id="bus-out"
        type="source"
        position={Position.Right}
        diameter={16}
        style={{ top: `${nodeHeight / 2}px` }}
        onClick={(event) => onHandleClick(id, "bus-out", "source", event)}
        onMouseEnter={(event) => onHandleMouseEnter(id, "source", event)}
        onMouseLeave={onHandleMouseLeave}
      />

      <div
        style={{ width: NODE_WIDTH }}
        className={`absolute inset-y-0 left-1/2 z-10 flex -translate-x-1/2 items-center justify-center overflow-hidden rounded-lg border bg-surface-card px-2 py-2 shadow-sm transition-[box-shadow,border-color] duration-150 ${
          selected ? "border-copper ring-2 ring-copper/30" : "border-indigo-400/50"
        }`}
      >
        <div className="flex flex-col items-center gap-0.5">
          <span className="w-full truncate text-center font-mono text-[11px] font-bold leading-tight text-ink">
            {busData.label || "BUS"}
          </span>
          <span className="mt-0.5 text-center font-mono text-[8px] uppercase tracking-wider text-indigo-400">
            merge ×{width}
          </span>
        </div>
      </div>
    </div>
  );
}

export const BusMergeNode = memo(BusMergeNodeImpl);
