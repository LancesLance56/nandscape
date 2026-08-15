"use client";

import { memo } from "react";
import type React from "react";
import type { NodeProps } from "@xyflow/react";
import { useShallow } from "zustand/react/shallow";
import { SignalState } from "@nandscape/engine";
import { NodeHandle, Position } from "@/components/editor/nodes/node-handle";
import { NODE_WIDTH } from "@/components/editor/nodes/gate-shapes";
import { usePreferencesStore } from "@/store/preferences-store";
import { commonBusLabel } from "@/lib/editor/bus-utils";
import type { BusInputNodeData, BusOutputNodeData, EditorNode } from "@/types/editor";

/**
 * The circuit-embed's versions of bus-input-node.tsx / bus-output-node.tsx.
 * Same layout math as the editor's originals (identical box sizing and
 * verticalPos, so each lane's digit sits exactly on its own pin and saved
 * edges land where they should), minus the editor-session dependencies:
 * the real ones read lane values through useLaneSignals/useSimulationStore
 * and write back through useEditorStore, none of which exist - or should be
 * mutated - when someone is just reading a shared circuit. Values arrive
 * through the node's data instead, injected per render by circuit-stage.tsx,
 * the same way PreviewIoNode gets its `onToggle`.
 *
 * Colors deliberately match the editor's bus styling (indigo) rather than
 * the site accent, so a circuit looks the same to a reader as it does to its
 * author.
 */

const NAME_HEIGHT = 13;
const VALUE_HEIGHT = 13;
const LABEL_GAP = 3;

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

/** The box/pin geometry both bus nodes share with their editor counterparts. */
function useBusLayout(width: number) {
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

  return { boxWidth, boxHeight, nodeHeight, verticalPos };
}

function BusLabel({
  top,
  label,
  value,
}: {
  top: number;
  label: string;
  value: number | null;
}) {
  return (
    <div
      style={{ top: `${top}px`, width: NODE_WIDTH }}
      className="absolute left-1/2 -translate-x-1/2 text-center leading-tight"
    >
      <div style={{ height: `${NAME_HEIGHT}px` }} className="truncate text-[10px] font-semibold text-indigo-400">
        {label}
      </div>
      <div style={{ height: `${VALUE_HEIGHT}px` }} className="text-[10px] font-bold text-ink">
        {value !== null ? value : "?"}
      </div>
    </div>
  );
}

interface PreviewBusInputData extends BusInputNodeData {
  onToggleLane?: (lane: number) => void;
}

function PreviewBusInputNodeImpl({ data }: NodeProps<EditorNode>) {
  const busData = data as PreviewBusInputData;
  const width = busData.names.length;
  const { boxWidth, boxHeight, nodeHeight, verticalPos } = useBusLayout(width);

  const decimalValue = busData.values.reduce((acc, s) => (acc << 1) | (s === SignalState.HIGH ? 1 : 0), 0);
  const label = commonBusLabel(busData.names) || "BUS";

  const handleLaneClick = (event: React.MouseEvent, i: number) => {
    event.stopPropagation();
    busData.onToggleLane?.(i);
  };

  return (
    <div style={{ height: `${nodeHeight}px`, width: `${boxWidth}px` }} className="pointer-events-none relative">
      {busData.names.map((name, i) => (
        <NodeHandle
          key={name}
          id={`out-${i}`}
          type="source"
          position={Position.Right}
          signal={busData.values[i]}
          style={{ top: `${verticalPos(i, width)}px`, pointerEvents: "none" }}
        />
      ))}

      <div
        style={{ top: 0, height: `${boxHeight}px`, width: `${boxWidth}px` }}
        className="absolute left-1/2 z-10 -translate-x-1/2 overflow-hidden rounded-lg border border-indigo-400/50 bg-surface-card shadow-sm"
      >
        <div className="relative h-full w-full">
          {busData.values.map((v, i) => (
            <button
              key={busData.names[i]}
              type="button"
              onClick={(event) => handleLaneClick(event, i)}
              title={`Toggle ${busData.names[i]}`}
              style={{ top: `${verticalPos(i, width)}px` }}
              className={`nodrag nopan pointer-events-auto absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded px-1 text-xs font-bold leading-none transition-colors hover:bg-surface-2 active:scale-95 ${
                v === SignalState.HIGH ? "text-signal-green" : "text-signal-coral"
              }`}
            >
              {bitChar(v)}
            </button>
          ))}
        </div>
      </div>

      <BusLabel top={boxHeight + LABEL_GAP} label={label} value={decimalValue} />
    </div>
  );
}

interface PreviewBusOutputData extends BusOutputNodeData {
  /** One entry per lane, index-aligned with `names` - computed from the
   *  incoming edge on `in-${i}` by circuit-stage.tsx. */
  laneSignals?: SignalState[];
}

function PreviewBusOutputNodeImpl({ data }: NodeProps<EditorNode>) {
  const busData = data as PreviewBusOutputData;
  const width = busData.names.length;
  const { boxWidth, boxHeight, nodeHeight, verticalPos } = useBusLayout(width);

  const signals = busData.names.map((_, i) => busData.laneSignals?.[i] ?? SignalState.FLOAT);
  const allDefined = signals.every((s) => s === SignalState.HIGH || s === SignalState.LOW);
  const decimalValue = allDefined
    ? signals.reduce((acc, s) => (acc << 1) | (s === SignalState.HIGH ? 1 : 0), 0)
    : null;
  const label = commonBusLabel(busData.names) || "BUS";

  return (
    <div style={{ height: `${nodeHeight}px`, width: `${boxWidth}px` }} className="pointer-events-none relative">
      {busData.names.map((name, i) => (
        <NodeHandle
          key={name}
          id={`in-${i}`}
          type="target"
          position={Position.Left}
          signal={signals[i]}
          style={{ top: `${verticalPos(i, width)}px`, pointerEvents: "none" }}
        />
      ))}

      <div
        style={{ top: 0, height: `${boxHeight}px`, width: `${boxWidth}px` }}
        className="absolute left-1/2 z-10 -translate-x-1/2 overflow-hidden rounded-lg border border-indigo-400/50 bg-surface-card shadow-sm"
      >
        <div className="relative h-full w-full">
          {signals.map((s, i) => (
            <span
              key={busData.names[i]}
              title={busData.names[i]}
              style={{ top: `${verticalPos(i, width)}px` }}
              className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-bold leading-none ${STATE_TEXT_CLASS[s]}`}
            >
              {bitChar(s)}
            </span>
          ))}
        </div>
      </div>

      <BusLabel top={boxHeight + LABEL_GAP} label={label} value={decimalValue} />
    </div>
  );
}

export const PreviewBusInputNode = memo(PreviewBusInputNodeImpl);
export const PreviewBusOutputNode = memo(PreviewBusOutputNodeImpl);
