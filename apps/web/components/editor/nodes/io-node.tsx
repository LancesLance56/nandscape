"use client";

import {memo} from "react";
import type {NodeProps} from "@xyflow/react";
import {SignalState} from "@nandscape/engine";
import {NodeHandle, Position} from "./node-handle";
import {useEditorStore} from "@/store/editor-store";
import {useLiveSignalsStore} from "@/store/live-signals-store";
import {useSimulationStore} from "@/store/simulation-store";
import {useHandleClick} from "@/hooks/use-handle-click";
import type {EditorNode, IoNodeData} from "@/types/editor";

const HIGH_CLASS = "bg-signal-green text-white shadow-[0_0_0_4px_var(--signal-green-bg)]";
const LOW_CLASS = "bg-signal-coral text-white shadow-[0_0_0_4px_var(--signal-coral-bg)]";
const FLOAT_CLASS = "bg-surface-2 text-ink-soft";

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

  // A real simulation session (see simulation-store.ts) takes priority over
  // the always-on instant preview once one's attached,  same rule wire-edge.tsx
  // uses for wire coloring, so an output's own LED never disagrees with the
  // wire feeding it.
  const engineActive = engineStatus === "running";
  const previewOutputSignal = !isInput && incomingEdgeId ? edgeSignals[incomingEdgeId] : undefined;
  const engineOutputSignal =
    !isInput && incomingEdgeId && engineActive ? engineSignalByEdge[incomingEdgeId] : undefined;

  const signal = isInput
    ? (ioData.value ?? SignalState.LOW)
    : (engineOutputSignal ?? previewOutputSignal);

  const stateClass = signal === SignalState.HIGH ? HIGH_CLASS : signal === SignalState.LOW ? LOW_CLASS : FLOAT_CLASS;
  const borderClass = selected
    ? "border-copper ring-2 ring-copper/30"
    : signal === SignalState.HIGH || signal === SignalState.LOW
      ? "border-transparent"
      : "border-border-strong";

  const handleToggle = () => {
    if (!isInput) return;
    const next = signal === SignalState.HIGH ? SignalState.LOW : SignalState.HIGH;
    updateNodeData(id, {value: next});
    // No-ops safely if nothing's compiled yet (idle/error); otherwise drives
    // the real Simulator too, settling + refreshing right away if the
    // real-time loop isn't already doing that on its own.
    useSimulationStore.getState().driveInput(id, next);
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        {!isInput && (
          <NodeHandle
            id="in-0"
            type="target"
            position={Position.Left}
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
            onClick={(event) => onHandleClick(id, "out-0", "source", event)}
            onMouseEnter={(event) => onHandleMouseEnter(id, "source", event)}
            onMouseLeave={onHandleMouseLeave}
          />
        )}
        <button
          type="button"
          onClick={handleToggle}
          aria-label={isInput ? `Toggle ${ioData.name}` : `${ioData.name} output`}
          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-mono text-xs font-bold transition-all ${stateClass} ${borderClass} ${
            isInput ? "cursor-pointer active:scale-95" : "cursor-default"
          }`}
        >
          {signal === SignalState.HIGH ? "1" : signal === SignalState.LOW ? "0" : "·"}
        </button>

      </div>
      <span className="font-mono text-[10px] font-semibold text-slate">{ioData.name}</span>
    </div>
  );
}

export const IoNode = memo(IoNodeImpl);
