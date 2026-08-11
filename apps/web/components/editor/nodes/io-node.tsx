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

/** An LED reads as "off" (dim, unlit) rather than "0" (coral, same as a
 *  false readout) when LOW/FLOAT,  a real LED doesn't turn red when
 *  unpowered, it just doesn't light up. UNKNOWN gets a dim amber tint so
 *  it's still visually distinct from a clean off state. */
const LED_DOT_CLASS: Record<SignalState, string> = {
  [SignalState.HIGH]: "bg-signal-green shadow-[0_0_8px_var(--signal-green)]",
  [SignalState.LOW]: "bg-surface-2 border border-border-strong",
  [SignalState.FLOAT]: "bg-surface-2 border border-border-strong",
  [SignalState.UNKNOWN]: "bg-copper/40 border border-copper/50",
};

const LABEL_HEIGHT = 13;
const LABEL_GAP = 3;

/** Same rounded-card shape and margin/spacing/minHeight-derived sizing as
 *  gate-node.tsx/bus-merge-node.tsx (single pin, so the box's own height
 *  collapses to just `minHeight`),  a fixed inline size from first paint
 *  instead of the old circle-plus-label layout's unmeasured natural size,
 *  which needed a post-mount ResizeObserver pass and visibly jumped once
 *  React Flow measured it. That jump, combined with a toggle click bubbling
 *  into React Flow's own node-selection handling (see stopPropagation below
 *  and elevateNodesOnSelect in circuit-canvas.tsx), is what looked like the
 *  node "bouncing through" its neighbors on click.
 *
 *  The name label sits outside the box, below it, so the box itself (and
 *  therefore the pin, which is centered on the box, not the whole node) is
 *  exactly as tall as a plain single-port gate node,  keeping straight
 *  wires straight against every other node type that shares this formula.
 *  The label is extra content anchored below that fixed point, it never
 *  changes where the box or pin sit. */
function IoNodeImpl({id, data, selected}: NodeProps<EditorNode>) {
  const ioData = data as IoNodeData;
  const isInput = ioData.kind === "input";
  const isLed = ioData.kind === "led";
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
  const boxHeight = Math.max(minHeight, margin * 2);
  const nodeHeight = boxHeight + LABEL_GAP + LABEL_HEIGHT;

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
      style={{height: `${nodeHeight}px`, width: `${boxHeight}px`}}
      className="relative"
    >
      {!isInput && (
        <NodeHandle
          id="in-0"
          type="target"
          position={Position.Left}
          signal={signal}
          style={{top: `${boxHeight / 2}px`}}
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
          style={{top: `${boxHeight / 2}px`}}
          onClick={(event) => onHandleClick(id, "out-0", "source", event)}
          onMouseEnter={(event) => onHandleMouseEnter(id, "source", event)}
          onMouseLeave={onHandleMouseLeave}
        />
      )}

      <button
        type="button"
        onClick={handleToggle}
        aria-label={isInput ? `Toggle ${ioData.name}` : `${ioData.name} ${isLed ? "LED" : "output"}`}
        style={{top: 0, height: `${boxHeight}px`, width: `${boxHeight}px`}}
        className={`absolute left-1/2 z-10 flex -translate-x-1/2 items-center justify-center overflow-hidden rounded-lg border bg-surface-card shadow-sm transition-[box-shadow,border-color] duration-150 ${
          isInput ? "cursor-pointer active:scale-[0.97]" : "cursor-default"
        } ${selected ? "border-copper ring-2 ring-copper/30" : STATE_BORDER_CLASS[signal]}`}
      >
        {isLed ? (
          <span className={`h-3.5 w-3.5 rounded-full transition-shadow ${LED_DOT_CLASS[signal]}`} />
        ) : (
          <span className={`font-mono text-sm font-bold leading-none ${STATE_TEXT_CLASS[signal]}`}>{stateChar}</span>
        )}
      </button>

      <span
        style={{top: `${boxHeight + LABEL_GAP}px`, height: `${LABEL_HEIGHT}px`, width: NODE_WIDTH}}
        className="absolute left-1/2 -translate-x-1/2 truncate text-center font-mono text-[10px] font-semibold text-slate"
      >
        {ioData.name}
      </span>
    </div>
  );
}

export const IoNode = memo(IoNodeImpl);
