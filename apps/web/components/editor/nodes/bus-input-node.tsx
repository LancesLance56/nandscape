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
import { commonBusLabel } from "@/lib/editor/bus-utils";
import type { BusInputNodeData, EditorNode } from "@/types/editor";

const LABEL_HEIGHT = 13;
const LABEL_GAP = 3;
// Just wide enough for one two-character-max digit button - the column
// sits beside the decimal readout, not stacked under it, so it costs
// horizontal room instead of the vertical room a wider bus needs for its
// pins anyway (see BusInputNodeImpl's doc comment below).
const DIGIT_COLUMN_WIDTH = 18;

function bitChar(s: SignalState): string {
  return s === SignalState.HIGH ? "1" : "0";
}

/** The source-side mirror of BusOutputNode: N independently toggleable
 *  source pins (out-0..out-(N-1), index 0 = MSB) shown as a decimal readout
 *  plus a column of clickable digit buttons instead of N separate Input
 *  toggles. See BusInputNodeData's doc comment in types/editor.ts for why
 *  this is a general sandbox tool rather than a puzzle-input node.
 *
 *  The digit column is vertical, not a horizontal row: each digit sits at
 *  the exact same y as its own pin (verticalPos(i, width), the same
 *  function that positions the pins themselves), so it's immediately clear
 *  which digit toggles which pin, and - unlike a horizontal row, which
 *  clipped against NODE_WIDTH once width passed ~5 - it scales with however
 *  tall the box already is for `width` lanes instead of needing its own
 *  separate width budget.
 *
 *  The label sits outside the box, below it (see io-node.tsx for the same
 *  pattern): the box's own height still drives lane pin spacing, so adding
 *  the label below never moves a pin. */
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

  const boxHeight = Math.max(minHeight, margin * 2 + (width - 1) * spacing);
  const nodeHeight = boxHeight + LABEL_GAP + LABEL_HEIGHT;
  const availableHeight = boxHeight - margin * 2;
  const verticalPos = (index: number, count: number) =>
    count <= 1 ? boxHeight / 2 : margin + index * (availableHeight / (count - 1));

  const decimalValue = busData.values.reduce((acc, s) => (acc << 1) | (s === SignalState.HIGH ? 1 : 0), 0);
  const label = commonBusLabel(busData.names) || "BUS";

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

  return (
    <div style={{ height: `${nodeHeight}px`, width: `${NODE_WIDTH}px` }} className="relative">
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
        style={{ top: 0, height: `${boxHeight}px`, width: NODE_WIDTH }}
        className={`absolute left-1/2 z-10 flex -translate-x-1/2 items-center justify-between gap-1 overflow-hidden rounded-lg border bg-surface-card px-1.5 shadow-sm transition-[box-shadow,border-color] duration-150 ${
          selected ? "border-copper ring-2 ring-copper/30" : "border-indigo-400/50"
        }`}
      >
        <span className="font-mono text-sm font-bold leading-none text-ink">{decimalValue}</span>

        {/* Digits sit next to out-i's own pins (Position.Right), one per
            lane, each at that lane's exact verticalPos - the same
            coordinate space the pins above use, since this column spans
            the same top:0..boxHeight range as the wrapper they're both
            positioned in. */}
        <div className="relative h-full shrink-0" style={{ width: `${DIGIT_COLUMN_WIDTH}px` }}>
          {busData.values.map((v, i) => (
            <button
              key={busData.names[i]}
              type="button"
              onClick={(event) => toggleLane(event, i)}
              title={`Toggle ${busData.names[i]}`}
              style={{ top: `${verticalPos(i, width)}px` }}
              className={`absolute left-1/2 flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-sm border font-mono text-[10px] font-bold leading-none transition-colors ${
                v === SignalState.HIGH
                  ? "border-signal-green/50 bg-signal-green/10 text-signal-green"
                  : "border-signal-coral/40 bg-signal-coral/10 text-signal-coral"
              } hover:brightness-125 active:scale-95`}
            >
              {bitChar(v)}
            </button>
          ))}
        </div>
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

export const BusInputNode = memo(BusInputNodeImpl);
