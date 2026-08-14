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

const NAME_HEIGHT = 13;
const VALUE_HEIGHT = 13;
const LABEL_GAP = 3;

function bitChar(s: SignalState): string {
  return s === SignalState.HIGH ? "1" : "0";
}

/** The source-side mirror of BusOutputNode: N independently toggleable
 *  source pins (out-0..out-(N-1), index 0 = MSB) shown as a column of
 *  clickable digits instead of N separate Input toggles. See
 *  BusInputNodeData's doc comment in types/editor.ts for why this is a
 *  general sandbox tool rather than a puzzle-input node.
 *
 *  Each digit sits at the exact same y as its own pin (verticalPos(i,
 *  width), the same function that positions the pins themselves), so it's
 *  immediately clear which digit toggles which pin, and - unlike a
 *  horizontal row, which clipped against NODE_WIDTH once width passed ~5 -
 *  it scales with however tall the box already is for `width` lanes instead
 *  of needing its own separate width budget.
 *
 *  Name and decimal value both sit outside the box, below it (see
 *  io-node.tsx for the same pattern): the box's own height still drives
 *  lane pin spacing, so adding text below never moves a pin.
 *
 *  The box itself is narrow - a fixed single-lane square, same width
 *  formula as io-node.tsx's Input/Output box - rather than the shared
 *  NODE_WIDTH gates and the other bus nodes use: a wide box only made sense
 *  when it had to fit a value readout beside the digit column, and that
 *  readout now lives outside the box too, so there's nothing left inside
 *  wanting the extra width. Only the box narrows; the outer label text
 *  below it stays NODE_WIDTH-wide (see io-node.tsx again) so a long name
 *  isn't cramped into a 1-lane-wide column. */
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

  const boxWidth = Math.max(minHeight, margin * 2);
  const boxHeight = Math.max(minHeight, margin * 2 + (width - 1) * spacing);
  const nodeHeight = boxHeight + LABEL_GAP + NAME_HEIGHT + VALUE_HEIGHT;
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
    <div style={{ height: `${nodeHeight}px`, width: `${boxWidth}px` }} className="relative">
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
        style={{ top: 0, height: `${boxHeight}px`, width: `${boxWidth}px` }}
        className={`absolute left-1/2 z-10 -translate-x-1/2 overflow-hidden rounded-lg border bg-surface-card shadow-sm transition-[box-shadow,border-color] duration-150 ${
          selected ? "border-copper ring-2 ring-copper/30" : "border-indigo-400/50"
        }`}
      >
        <div className="relative h-full w-full">
          {busData.values.map((v, i) => (
            <button
              key={busData.names[i]}
              type="button"
              onClick={(event) => toggleLane(event, i)}
              title={`Toggle ${busData.names[i]}`}
              style={{ top: `${verticalPos(i, width)}px` }}
              className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded px-1 text-xs font-bold leading-none transition-colors hover:bg-surface-2 active:scale-95 ${
                v === SignalState.HIGH ? "text-signal-green" : "text-signal-coral"
              }`}
            >
              {bitChar(v)}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{ top: `${boxHeight + LABEL_GAP}px`, width: NODE_WIDTH }}
        className="absolute left-1/2 -translate-x-1/2 text-center leading-tight"
      >
        <div style={{ height: `${NAME_HEIGHT}px` }} className="truncate text-[10px] font-semibold text-indigo-400">
          {label}
        </div>
        <div style={{ height: `${VALUE_HEIGHT}px` }} className=" text-[10px] font-bold text-ink">
          {decimalValue}
        </div>
      </div>
    </div>
  );
}

export const BusInputNode = memo(BusInputNodeImpl);
