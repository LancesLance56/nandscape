"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { useShallow } from "zustand/react/shallow";
import { NodeHandle, Position } from "./node-handle";
import { NODE_WIDTH } from "./gate-shapes";
import { useHandleClick } from "@/hooks/use-handle-click";
import { usePreferencesStore } from "@/store/preferences-store";
import { clampBusWidth, laneHandle } from "@/lib/editor/bus-utils";
import type { BusSplitNodeData, EditorNode } from "@/types/editor";

const NAME_HEIGHT = 13;
const KIND_HEIGHT = 11;
const LABEL_GAP = 3;
const LINE_INSET = 10;

/** One bus-in fanning out into N single-bit lanes. Mirror of BusMergeNode
 *  (see bus-merge-node.tsx), including the same box-interior taper glyph and
 *  outside-the-box name/×N label. */
function BusSplitNodeImpl({ id, data, selected }: NodeProps<EditorNode>) {
  const busData = data as BusSplitNodeData;
  const width = clampBusWidth(busData.width);
  const { onHandleClick, onHandleMouseEnter, onHandleMouseLeave } = useHandleClick();

  const { margin, spacing, minHeight } = usePreferencesStore(
    useShallow((s) => ({
      margin: s.gateNodeTopMargin,
      spacing: s.gateNodePortSpacing,
      minHeight: s.gateNodeMinHeight,
    })),
  );

  const boxHeight = Math.max(minHeight, margin * 2 + (width - 1) * spacing);
  const nodeHeight = boxHeight + LABEL_GAP + NAME_HEIGHT + KIND_HEIGHT;
  const availableHeight = boxHeight - margin * 2;
  const verticalPos = (index: number, count: number) =>
    count <= 1 ? boxHeight / 2 : margin + index * (availableHeight / (count - 1));

  return (
    <div style={{ height: `${nodeHeight}px`, width: `${NODE_WIDTH}px` }} className="relative">
      <NodeHandle
        id="bus-in"
        type="target"
        position={Position.Left}
        diameter={16}
        style={{ top: `${boxHeight / 2}px` }}
        onClick={(event) => onHandleClick(id, "bus-in", "target", event)}
        onMouseEnter={(event) => onHandleMouseEnter(id, "target", event)}
        onMouseLeave={onHandleMouseLeave}
      />

      {Array.from({ length: width }).map((_, i) => (
        <NodeHandle
          key={`out-${i}`}
          id={laneHandle("out", i)}
          type="source"
          position={Position.Right}
          style={{ top: `${verticalPos(i, width)}px` }}
          onClick={(event) => onHandleClick(id, laneHandle("out", i), "source", event)}
          onMouseEnter={(event) => onHandleMouseEnter(id, "source", event)}
          onMouseLeave={onHandleMouseLeave}
        />
      ))}

      <div
        style={{ top: 0, height: `${boxHeight}px`, width: NODE_WIDTH }}
        className={`absolute left-1/2 z-10 -translate-x-1/2 overflow-hidden rounded-lg border bg-surface-card shadow-sm transition-[box-shadow,border-color] duration-150 ${
          selected ? "border-copper ring-2 ring-copper/30" : "border-indigo-400/50"
        }`}
      >
        <svg viewBox={`0 0 ${NODE_WIDTH} ${boxHeight}`} className="h-full w-full" preserveAspectRatio="none">
          {Array.from({ length: width }).map((_, i) => (
            <line
              key={i}
              x1={LINE_INSET}
              y1={boxHeight / 2}
              x2={NODE_WIDTH - LINE_INSET}
              y2={verticalPos(i, width)}
              strokeWidth={1.5}
              strokeLinecap="round"
              className="stroke-indigo-400/60"
            />
          ))}
        </svg>
      </div>

      <div
        style={{ top: `${boxHeight + LABEL_GAP}px`, width: NODE_WIDTH }}
        className="absolute left-1/2 -translate-x-1/2 text-center leading-tight"
      >
        <div style={{ height: `${NAME_HEIGHT}px` }} className="truncate text-[10px] font-semibold text-indigo-400">
          {busData.label || "BUS"}
        </div>
        <div style={{ height: `${KIND_HEIGHT}px` }} className=" text-[8px] text-ink-soft">
          split ×{width}
        </div>
      </div>
    </div>
  );
}

export const BusSplitNode = memo(BusSplitNodeImpl);
