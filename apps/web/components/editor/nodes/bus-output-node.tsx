"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { useShallow } from "zustand/react/shallow";
import { SignalState } from "@nandscape/engine";
import { NodeHandle, Position } from "./node-handle";
import { NODE_WIDTH } from "./gate-shapes";
import { useHandleClick } from "@/hooks/use-handle-click";
import { useLaneSignals } from "@/hooks/use-lane-signals";
import { usePreferencesStore } from "@/store/preferences-store";
import { commonBusLabel } from "@/lib/editor/bus-utils";
import type { BusOutputNodeData, EditorNode } from "@/types/editor";

const LABEL_HEIGHT = 13;
const LABEL_GAP = 3;
// Matches bus-input-node.tsx's own DIGIT_COLUMN_WIDTH - kept as a separate
// constant (not imported) since the two files intentionally don't share
// runtime code, only the layout convention, see BusOutputNodeImpl's doc
// comment below.
const DIGIT_COLUMN_WIDTH = 18;

const STATE_TEXT_CLASS: Record<SignalState, string> = {
  [SignalState.HIGH]: "text-signal-green",
  [SignalState.LOW]: "text-signal-coral",
  [SignalState.FLOAT]: "text-ink-soft",
  [SignalState.UNKNOWN]: "text-copper",
};

function bitChar(s: SignalState): string {
  if (s === SignalState.HIGH) return "1";
  if (s === SignalState.LOW) return "0";
  return s === SignalState.FLOAT ? "·" : "?";
}

/** N single-bit inputs (in-0..in-(N-1), index 0 = MSB) shown as a decimal
 *  readout plus a column of per-lane digits instead of N separate LEDs.
 *  Purely a display sink,  see bus-output-inspector.tsx for how `names` is
 *  edited and compile-circuit.ts for how each lane becomes its own
 *  OUTPUT_PIN.
 *
 *  The digit column is vertical, not a horizontal row: each digit sits at
 *  the exact same y as its own pin (verticalPos(i, width), the same
 *  function that positions the pins themselves,  mirrors
 *  bus-input-node.tsx's identical layout), so it's immediately clear which
 *  digit is which pin's value, and - unlike a horizontal row, which clipped
 *  against NODE_WIDTH once width passed ~5 - it scales with however tall
 *  the box already is for `width` lanes instead of needing its own separate
 *  width budget.
 *
 *  The label sits outside the box, below it (see io-node.tsx for the same
 *  pattern): the box's own height still drives lane pin spacing, so adding
 *  the label below never moves a pin. */
function BusOutputNodeImpl({ id, data, selected }: NodeProps<EditorNode>) {
  const busData = data as BusOutputNodeData;
  const width = busData.names.length;
  const { onHandleClick, onHandleMouseEnter, onHandleMouseLeave } = useHandleClick();
  const signals = useLaneSignals(id, width);

  const { margin, spacing, minHeight } = usePreferencesStore(
    useShallow((s) => ({
      margin: s.gateNodeTopMargin,
      spacing: s.gateNodePortSpacing,
      minHeight: s.gateNodeMinHeight,
    })),
  );

  const boxHeight = Math.max(minHeight, margin * 2 + (width - 1) * spacing);
  const nodeHeight = boxHeight + LABEL_GAP + LABEL_HEIGHT;
  const availableHeight = boxHeight - margin * 2;
  const verticalPos = (index: number, count: number) =>
    count <= 1 ? boxHeight / 2 : margin + index * (availableHeight / (count - 1));

  const allDefined = signals.every((s) => s === SignalState.HIGH || s === SignalState.LOW);
  const decimalValue = allDefined
    ? signals.reduce((acc, s) => (acc << 1) | (s === SignalState.HIGH ? 1 : 0), 0)
    : null;
  const label = commonBusLabel(busData.names) || "BUS";

  return (
    <div style={{ height: `${nodeHeight}px`, width: `${NODE_WIDTH}px` }} className="relative">
      {busData.names.map((name, i) => (
        <NodeHandle
          key={name}
          id={`in-${i}`}
          type="target"
          position={Position.Left}
          signal={signals[i]}
          style={{ top: `${verticalPos(i, width)}px` }}
          onClick={(event) => onHandleClick(id, `in-${i}`, "target", event)}
          onMouseEnter={(event) => onHandleMouseEnter(id, "target", event)}
          onMouseLeave={onHandleMouseLeave}
        />
      ))}

      <div
        style={{ top: 0, height: `${boxHeight}px`, width: NODE_WIDTH }}
        className={`absolute left-1/2 z-10 flex -translate-x-1/2 items-center justify-between gap-1 overflow-hidden rounded-lg border bg-surface-card px-1.5 shadow-sm transition-[box-shadow,border-color] duration-150 ${
          selected ? "border-copper ring-2 ring-copper/30" : "border-indigo-400/50"
        }`}
      >
        {/* Digits sit next to in-i's own pins (Position.Left), one per
            lane, each at that lane's exact verticalPos - the same
            coordinate space the pins above use, since this column spans
            the same top:0..boxHeight range as the wrapper they're both
            positioned in. */}
        <div className="relative h-full shrink-0" style={{ width: `${DIGIT_COLUMN_WIDTH}px` }}>
          {signals.map((s, i) => (
            <span
              key={busData.names[i]}
              title={busData.names[i]}
              style={{ top: `${verticalPos(i, width)}px` }}
              className={`absolute left-1/2 flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center font-mono text-[10px] font-bold leading-none ${STATE_TEXT_CLASS[s]}`}
            >
              {bitChar(s)}
            </span>
          ))}
        </div>

        <span className="font-mono text-sm font-bold leading-none text-ink">
          {decimalValue !== null ? decimalValue : "?"}
        </span>
      </div>

      <span
        style={{ top: `${boxHeight + LABEL_GAP}px`, height: `${LABEL_HEIGHT}px`, width: NODE_WIDTH }}
        className="absolute left-1/2 -translate-x-1/2 truncate text-center font-mono text-[10px] font-semibold text-indigo-400"
      >
        {label}
      </span>
    </div>
  );
}

export const BusOutputNode = memo(BusOutputNodeImpl);
