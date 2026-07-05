"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { SignalState } from "@nandscape/engine";
import { NodeHandle, Position } from "./node-handle";
import { useEditorStore } from "@/store/editor-store";
import { useLiveSignalsStore } from "@/store/live-signals-store";
import type { EditorNode, IoNodeData } from "@/types/editor";

const HIGH_CLASS = "bg-signal-green text-white shadow-[0_0_0_4px_var(--signal-green-bg)]";
const LOW_CLASS = "bg-signal-coral text-white shadow-[0_0_0_4px_var(--signal-coral-bg)]";
const FLOAT_CLASS = "bg-surface-2 text-ink-soft";

/**
 * Circuit-level terminal, styled after the LED indicators already used
 * elsewhere in Nandscape (see components/ui/led.tsx): a round pill showing
 * 0/1/· with the name below. Inputs are clickable — toggling one writes
 * straight to editor-store (not a Command; this is a runtime interaction
 * like flipping a physical switch, not a structural edit worth undoing)
 * and the live-simulation preview picks the change up on its next pass.
 * Outputs are read-only, colored from live-signals-store via their single
 * incoming wire.
 */
function IoNodeImpl({ id, data, selected }: NodeProps<EditorNode>) {
  const ioData = data as IoNodeData;
  const isInput = ioData.kind === "input";
  const updateNodeData = useEditorStore((s) => s.updateNodeData);
  const incomingEdgeId = useEditorStore((s) =>
    isInput ? undefined : s.edges.find((e) => e.target === id)?.id,
  );
  const edgeSignals = useLiveSignalsStore((s) => s.edgeSignals);

  const signal = isInput ? (ioData.value ?? SignalState.LOW) : incomingEdgeId ? edgeSignals[incomingEdgeId] : undefined;

  const stateClass = signal === SignalState.HIGH ? HIGH_CLASS : signal === SignalState.LOW ? LOW_CLASS : FLOAT_CLASS;
  const borderClass = selected
    ? "border-copper ring-2 ring-copper/30"
    : signal === SignalState.HIGH || signal === SignalState.LOW
      ? "border-transparent"
      : "border-border-strong";

  const handleToggle = () => {
    if (!isInput) return;
    const next = signal === SignalState.HIGH ? SignalState.LOW : SignalState.HIGH;
    updateNodeData(id, { value: next });
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        {!isInput && <NodeHandle id="in-0" type="target" position={Position.Left} />}
        <button
          type="button"
          disabled={!isInput}
          onClick={handleToggle}
          aria-label={isInput ? `Toggle ${ioData.name}` : `${ioData.name} output`}
          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-mono text-xs font-bold transition-all ${stateClass} ${borderClass} ${
            isInput ? "cursor-pointer active:scale-95" : "cursor-default"
          }`}
        >
          {signal === SignalState.HIGH ? "1" : signal === SignalState.LOW ? "0" : "·"}
        </button>
        {isInput && <NodeHandle id="out-0" type="source" position={Position.Right} />}
      </div>
      <span className="font-mono text-[10px] font-semibold text-slate">{ioData.name}</span>
    </div>
  );
}

export const IoNode = memo(IoNodeImpl);
