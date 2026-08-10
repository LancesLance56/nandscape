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
import { commonBusLabel, COMPACT_BUS_WIDTH_THRESHOLD } from "@/lib/editor/bus-utils";
import type { BusOutputNodeData, EditorNode } from "@/types/editor";

function bitChar(s: SignalState): string {
  if (s === SignalState.HIGH) return "1";
  if (s === SignalState.LOW) return "0";
  return s === SignalState.FLOAT ? "·" : "?";
}

/** N single-bit inputs (in-0..in-(N-1), index 0 = MSB) shown as one
 *  combined decimal + binary readout instead of N separate LEDs. Purely a
 *  display sink,  see bus-output-inspector.tsx for how `names` is edited
 *  and compile-circuit.ts for how each lane becomes its own OUTPUT_PIN. */
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

  const nodeHeight = Math.max(minHeight, margin * 2 + (width - 1) * spacing);
  const availableHeight = nodeHeight - margin * 2;
  const verticalPos = (index: number, count: number) =>
    count <= 1 ? nodeHeight / 2 : margin + index * (availableHeight / (count - 1));

  const allDefined = signals.every((s) => s === SignalState.HIGH || s === SignalState.LOW);
  const decimalValue = allDefined
    ? signals.reduce((acc, s) => (acc << 1) | (s === SignalState.HIGH ? 1 : 0), 0)
    : null;
  const binaryString = signals.map(bitChar).join("");
  const label = commonBusLabel(busData.names) || "BUS";
  const compact = width < COMPACT_BUS_WIDTH_THRESHOLD;

  return (
    <div
      style={{ height: `${nodeHeight}px`, width: `${NODE_WIDTH}px` }}
      className="relative flex items-center justify-center"
    >
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
        style={{ width: NODE_WIDTH }}
        className={`absolute inset-y-0 left-1/2 z-10 flex -translate-x-1/2 items-center justify-center overflow-hidden rounded-lg border bg-surface-card shadow-sm transition-[box-shadow,border-color] duration-150 ${
          compact ? "gap-1 px-1.5 py-1" : "flex-col gap-0.5 px-2 py-1.5"
        } ${selected ? "border-copper ring-2 ring-copper/30" : "border-indigo-400/50"}`}
      >
        {compact ? (
          <>
            <span className="max-w-[22px] truncate font-mono text-[9px] font-semibold text-indigo-400">{label}</span>
            <span className="shrink-0 font-mono text-xs font-bold leading-none text-ink">{binaryString}</span>
            <span className="shrink-0 font-mono text-[9px] text-ink-soft">
              ={decimalValue !== null ? decimalValue : "?"}
            </span>
          </>
        ) : (
          <>
            <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-indigo-400">
              {label}
            </span>
            <span className="font-mono text-lg font-bold leading-none text-ink">
              {decimalValue !== null ? decimalValue : "?"}
            </span>
            <span className="font-mono text-[9px] text-ink-soft">{binaryString}</span>
          </>
        )}
      </div>
    </div>
  );
}

export const BusOutputNode = memo(BusOutputNodeImpl);
