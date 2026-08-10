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

const NAME_HEIGHT = 13;
const KIND_HEIGHT = 11;
const LABEL_GAP = 3;
const LINE_INSET = 10;

/** N single-bit lanes converging into one bus-out. Mirror of BusSplitNode
 *  (see bus-split-node.tsx); layout math intentionally matches gate-node.tsx
 *  so a bus node's lane spacing lines up with an ordinary gate's.
 *
 *  The box interior draws the taper itself - a line per lane, from that
 *  lane's own pin to the trunk pin - rather than a text label, the standard
 *  way schematic tools (KiCad, Altium) render a bus-entry taper. Name and
 *  the ×N lane count sit outside the box, below it (see bus-input-node.tsx
 *  for the same outside-label pattern), so the box stays purely structural
 *  and never needs to fit text past a couple of lanes. */
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

  const boxHeight = Math.max(minHeight, margin * 2 + (width - 1) * spacing);
  const nodeHeight = boxHeight + LABEL_GAP + NAME_HEIGHT + KIND_HEIGHT;
  const availableHeight = boxHeight - margin * 2;
  const verticalPos = (index: number, count: number) =>
    count <= 1 ? boxHeight / 2 : margin + index * (availableHeight / (count - 1));

  return (
    <div style={{ height: `${nodeHeight}px`, width: `${NODE_WIDTH}px` }} className="relative">
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
        style={{ top: `${boxHeight / 2}px` }}
        onClick={(event) => onHandleClick(id, "bus-out", "source", event)}
        onMouseEnter={(event) => onHandleMouseEnter(id, "source", event)}
        onMouseLeave={onHandleMouseLeave}
      />

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
              y1={verticalPos(i, width)}
              x2={NODE_WIDTH - LINE_INSET}
              y2={boxHeight / 2}
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
        <div style={{ height: `${NAME_HEIGHT}px` }} className="truncate font-mono text-[10px] font-semibold text-indigo-400">
          {busData.label || "BUS"}
        </div>
        <div style={{ height: `${KIND_HEIGHT}px` }} className="font-mono text-[8px] uppercase tracking-wider text-ink-soft">
          merge ×{width}
        </div>
      </div>
    </div>
  );
}

export const BusMergeNode = memo(BusMergeNodeImpl);
