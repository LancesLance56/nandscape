"use client";

import { memo } from "react";
import type React from "react";
import type { NodeProps } from "@xyflow/react";
import { useShallow } from "zustand/react/shallow";
import { SignalState } from "@nandscape/engine";
import { NodeHandle, Position } from "./node-handle";
import { NODE_WIDTH } from "./gate-shapes";
import { useHandleClick } from "@/hooks/use-handle-click";
import { useEditorStore } from "@/store/editor-store";
import { useSimulationStore } from "@/store/simulation-store";
import { usePreferencesStore } from "@/store/preferences-store";
import { commonBusLabel, COMPACT_BUS_WIDTH_THRESHOLD } from "@/lib/editor/bus-utils";
import type { BusInputNodeData, EditorNode } from "@/types/editor";

function bitChar(s: SignalState): string {
  return s === SignalState.HIGH ? "1" : "0";
}

/** The source-side mirror of BusOutputNode: N independently toggleable
 *  source pins (out-0..out-(N-1), index 0 = MSB) shown as one combined
 *  decimal + binary readout with clickable digits instead of N separate
 *  Input toggles. See BusInputNodeData's doc comment in types/editor.ts for
 *  why this is a general sandbox tool rather than a puzzle-input node. */
function BusInputNodeImpl({ id, data, selected }: NodeProps<EditorNode>) {
  const busData = data as BusInputNodeData;
  const width = busData.names.length;
  const { onHandleClick, onHandleMouseEnter, onHandleMouseLeave } = useHandleClick();
  const updateNodeData = useEditorStore((s) => s.updateNodeData);

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

  const decimalValue = busData.values.reduce((acc, s) => (acc << 1) | (s === SignalState.HIGH ? 1 : 0), 0);
  const label = commonBusLabel(busData.names) || "BUS";
  const compact = width < COMPACT_BUS_WIDTH_THRESHOLD;

  const toggleLane = (event: React.MouseEvent, i: number) => {
    // A lane toggle is a click inside the node body, not a pin drag or a
    // node-selection click,  stopping it here keeps React Flow's own click
    // handling (selection, elevateNodesOnSelect) from also firing.
    event.stopPropagation();
    const next = busData.values[i] === SignalState.HIGH ? SignalState.LOW : SignalState.HIGH;
    const nextValues = busData.values.slice();
    nextValues[i] = next;
    updateNodeData(id, { values: nextValues });
    useSimulationStore.getState().driveInputLane(id, i, next);
  };

  const digits = (
    <span className="flex shrink-0 gap-px font-mono text-xs font-bold leading-none text-ink">
      {busData.values.map((v, i) => (
        <button
          key={busData.names[i]}
          type="button"
          onClick={(event) => toggleLane(event, i)}
          className={`rounded-sm px-px transition-colors ${
            v === SignalState.HIGH ? "text-signal-green" : "text-signal-coral"
          } hover:bg-surface-2`}
        >
          {bitChar(v)}
        </button>
      ))}
    </span>
  );

  return (
    <div
      style={{ height: `${nodeHeight}px`, width: `${NODE_WIDTH}px` }}
      className="relative flex items-center justify-center"
    >
      {busData.names.map((name, i) => (
        <NodeHandle
          key={name}
          id={`out-${i}`}
          type="source"
          position={Position.Right}
          signal={busData.values[i]}
          style={{ top: `${verticalPos(i, width)}px` }}
          onClick={(event) => onHandleClick(id, `out-${i}`, "source", event)}
          onMouseEnter={(event) => onHandleMouseEnter(id, "source", event)}
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
            {digits}
            <span className="shrink-0 font-mono text-[9px] text-ink-soft">={decimalValue}</span>
          </>
        ) : (
          <>
            <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-indigo-400">
              {label}
            </span>
            <span className="font-mono text-lg font-bold leading-none text-ink">{decimalValue}</span>
            {digits}
          </>
        )}
      </div>
    </div>
  );
}

export const BusInputNode = memo(BusInputNodeImpl);
