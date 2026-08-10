"use client";

import {memo} from "react";
import type React from "react";
import type {NodeProps} from "@xyflow/react";
import {useShallow} from "zustand/react/shallow";
import {SignalState} from "@nandscape/engine";
import {NodeHandle, Position} from "./node-handle";
import {NODE_WIDTH} from "./gate-shapes";
import {useEditorStore} from "@/store/editor-store";
import {useLiveSignalsStore} from "@/store/live-signals-store";
import {useSimulationStore} from "@/store/simulation-store";
import {usePreferencesStore} from "@/store/preferences-store";
import {useHandleClick} from "@/hooks/use-handle-click";
import type {EditorNode, IoNodeData} from "@/types/editor";

const STATE_TEXT_CLASS: Record<SignalState, string> = {
  [SignalState.HIGH]: "text-signal-green",
  [SignalState.LOW]: "text-signal-coral",
  [SignalState.FLOAT]: "text-ink-soft",
  [SignalState.UNKNOWN]: "text-copper",
};

const STATE_BORDER_CLASS: Record<SignalState, string> = {
  [SignalState.HIGH]: "border-signal-green/50",
  [SignalState.LOW]: "border-signal-coral/40",
  [SignalState.FLOAT]: "border-border-strong",
  [SignalState.UNKNOWN]: "border-copper/50",
};

/** Same rounded-card shape and margin/spacing/minHeight-derived sizing as
 *  gate-node.tsx/bus-merge-node.tsx (single pin, so nodeHeight collapses to
 *  just `minHeight`),  a fixed inline size from first paint instead of the
 *  old circle-plus-label layout's unmeasured natural size, which needed a
 *  post-mount ResizeObserver pass and visibly jumped once React Flow
 *  measured it. That jump, combined with a toggle click bubbling into React
 *  Flow's own node-selection handling (see stopPropagation below and
 *  elevateNodesOnSelect in circuit-canvas.tsx), is what looked like the
 *  node "bouncing through" its neighbors on click. */
function IoNodeImpl({id, data, selected}: NodeProps<EditorNode>) {
  const ioData = data as IoNodeData;
  const isInput = ioData.kind === "input";
  const updateNodeData = useEditorStore((s) => s.updateNodeData);
  const incomingEdgeId = useEditorStore((s) =>
    isInput ? undefined : s.edges.find((e) => e.target === id)?.id,
  );
  const edgeSignals = useLiveSignalsStore((s) => s.edgeSignals);
  const engineStatus = useSimulationStore((s) => s.status);
  const engineSignalByEdge = useSimulationStore((s) => s.signalByEdgeId);
  const {onHandleClick, onHandleMouseEnter, onHandleMouseLeave} = useHandleClick();

  const {margin, minHeight} = usePreferencesStore(
    useShallow((s) => ({
      margin: s.gateNodeTopMargin,
      minHeight: s.gateNodeMinHeight,
    })),
  );
  const nodeHeight = Math.max(minHeight, margin * 2);

  // A real simulation session (see simulation-store.ts) takes priority over
  // the always-on instant preview once one's attached,  same rule wire-edge.tsx
  // uses for wire coloring, so an output's own readout never disagrees with
  // the wire feeding it.
  const engineActive = engineStatus === "running";
  const previewOutputSignal = !isInput && incomingEdgeId ? edgeSignals[incomingEdgeId] : undefined;
  const engineOutputSignal =
    !isInput && incomingEdgeId && engineActive ? engineSignalByEdge[incomingEdgeId] : undefined;

  const signal = isInput
    ? (ioData.value ?? SignalState.LOW)
    : (engineOutputSignal ?? previewOutputSignal ?? SignalState.FLOAT);

  const stateChar = signal === SignalState.HIGH ? "1" : signal === SignalState.LOW ? "0" : "·";

  const handleToggle = (event: React.MouseEvent) => {
    if (!isInput) return;
    // A toggle click is content interaction, not a node-selection click,
    // stopping it here keeps React Flow's own selection/elevateNodesOnSelect
    // handling from also firing on the same click.
    event.stopPropagation();
    const next = signal === SignalState.HIGH ? SignalState.LOW : SignalState.HIGH;
    updateNodeData(id, {value: next});
    // No-ops safely if nothing's compiled yet (idle/error); otherwise drives
    // the real Simulator too, settling + refreshing right away if the
    // real-time loop isn't already doing that on its own.
    useSimulationStore.getState().driveInput(id, next);
  };

  return (
    <div
      style={{height: `${nodeHeight}px`, width: `${NODE_WIDTH}px`}}
      className="relative flex items-center justify-center"
    >
      {!isInput && (
        <NodeHandle
          id="in-0"
          type="target"
          position={Position.Left}
          signal={signal}
          style={{top: `${nodeHeight / 2}px`}}
          onClick={(event) => onHandleClick(id, "in-0", "target", event)}
          onMouseEnter={(event) => onHandleMouseEnter(id, "target", event)}
          onMouseLeave={onHandleMouseLeave}
        />
      )}

      {isInput && (
        <NodeHandle
          id="out-0"
          type="source"
          position={Position.Right}
          signal={signal}
          style={{top: `${nodeHeight / 2}px`}}
          onClick={(event) => onHandleClick(id, "out-0", "source", event)}
          onMouseEnter={(event) => onHandleMouseEnter(id, "source", event)}
          onMouseLeave={onHandleMouseLeave}
        />
      )}

      <button
        type="button"
        onClick={handleToggle}
        aria-label={isInput ? `Toggle ${ioData.name}` : `${ioData.name} output`}
        style={{width: NODE_WIDTH}}
        className={`absolute inset-y-0 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg border bg-surface-card px-2 shadow-sm transition-[box-shadow,border-color] duration-150 ${
          isInput ? "cursor-pointer active:scale-[0.97]" : "cursor-default"
        } ${selected ? "border-copper ring-2 ring-copper/30" : STATE_BORDER_CLASS[signal]}`}
      >
        <span className="w-full truncate text-center font-mono text-[11px] font-bold leading-tight text-ink">
          {ioData.name}
        </span>
        <span className={`font-mono text-xs font-bold leading-none ${STATE_TEXT_CLASS[signal]}`}>{stateChar}</span>
      </button>
    </div>
  );
}

export const IoNode = memo(IoNodeImpl);
