"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { SignalState } from "@nandscape/engine";
import { NodeHandle, Position } from "./node-handle";
import { NODE_WIDTH } from "./gate-shapes";
import { useHandleClick } from "@/hooks/use-handle-click";
import { useLaneSignals } from "@/hooks/use-lane-signals";
import { SEVEN_SEGMENT_LABELS } from "@/lib/editor/bus-utils";
import type { EditorNode, SevenSegmentNodeData } from "@/types/editor";

const NODE_HEIGHT = 168;

/** a..g rect geometry in a 66x100 viewBox, matching SEVEN_SEGMENT_LABELS'
 *  order (a=top, b=upper-right, c=lower-right, d=bottom, e=lower-left,
 *  f=upper-left, g=middle). Rounded bars rather than tapered hexagons,
 *  simpler to draw and still reads clearly as a digit at this size. */
const SEGMENT_RECTS: Record<string, { x: number; y: number; w: number; h: number; rx: number }> = {
  A: { x: 14, y: 4, w: 40, h: 10, rx: 4 },
  B: { x: 52, y: 14, w: 10, h: 38, rx: 4 },
  C: { x: 52, y: 54, w: 10, h: 38, rx: 4 },
  D: { x: 14, y: 92, w: 40, h: 10, rx: 4 },
  E: { x: 4, y: 54, w: 10, h: 38, rx: 4 },
  F: { x: 4, y: 14, w: 10, h: 38, rx: 4 },
  G: { x: 14, y: 48, w: 40, h: 10, rx: 4 },
};

/** Seven fixed target pins (in-0..in-6, a..g order) rendered as an actual
 *  lit digit instead of seven separate LEDs. Purely a display sink, see
 *  seven-segment-inspector.tsx for how `names` is edited and
 *  compile-circuit.ts for how each lane becomes its own OUTPUT_PIN. */
function SevenSegmentNodeImpl({ id, data, selected }: NodeProps<EditorNode>) {
  const segData = data as SevenSegmentNodeData;
  const { onHandleClick, onHandleMouseEnter, onHandleMouseLeave } = useHandleClick();
  const signals = useLaneSignals(id, 7);

  const verticalPos = (index: number) => 16 + index * ((NODE_HEIGHT - 32) / 6);

  return (
    <div
      style={{ height: `${NODE_HEIGHT}px`, width: `${NODE_WIDTH}px` }}
      className="relative flex items-center justify-center"
    >
      {SEVEN_SEGMENT_LABELS.map((label, i) => (
        <NodeHandle
          key={label}
          id={`in-${i}`}
          type="target"
          position={Position.Left}
          signal={signals[i]}
          style={{ top: `${verticalPos(i)}px` }}
          onClick={(event) => onHandleClick(id, `in-${i}`, "target", event)}
          onMouseEnter={(event) => onHandleMouseEnter(id, "target", event)}
          onMouseLeave={onHandleMouseLeave}
        />
      ))}

      <div
        style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
        className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border bg-surface-card px-2 py-2 shadow-sm transition-[box-shadow,border-color] duration-150 ${
          selected ? "border-copper ring-2 ring-copper/30" : "border-indigo-400/50"
        }`}
      >
        <svg viewBox="0 0 66 100" className="h-24 w-16">
          {SEVEN_SEGMENT_LABELS.map((label, i) => {
            const rect = SEGMENT_RECTS[label];
            const lit = signals[i] === SignalState.HIGH;
            return (
              <rect
                key={label}
                x={rect.x}
                y={rect.y}
                width={rect.w}
                height={rect.h}
                rx={rect.rx}
                className={lit ? "fill-signal-green" : "fill-surface-2"}
                opacity={lit ? 1 : 0.5}
              />
            );
          })}
        </svg>
        <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-indigo-400">
          {segData.names[0]?.replace(/A$/, "") || "SEG"}
        </span>
      </div>
    </div>
  );
}

export const SevenSegmentNode = memo(SevenSegmentNodeImpl);
