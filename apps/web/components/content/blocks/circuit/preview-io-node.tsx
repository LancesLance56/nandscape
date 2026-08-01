"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { SignalState } from "@nandscape/engine";
import { NodeHandle, Position } from "@/components/editor/nodes/node-handle";
import type { EditorNode, IoNodeData } from "@/types/editor";

/**
 * The circuit-embed's version of io-node.tsx. Real io-node.tsx writes
 * through useEditorStore.updateNodeData(), which would mean clicking an
 * input inside a tutorial silently edits the app's one global editor graph
 * and pollutes its undo history. This version never touches any store,
 * it just calls back an `onToggle` the embed injects into the node's data
 * for this render (see circuit-embed.tsx),  so state stays local to the
 * one embedded circuit the reader is looking at.
 */
interface PreviewIoData extends IoNodeData {
  onToggle?: () => void;
}

const HIGH_CLASS = "bg-signal-green text-white shadow-[0_0_0_4px_var(--signal-green-bg)]";
const LOW_CLASS = "bg-signal-coral text-white shadow-[0_0_0_4px_var(--signal-coral-bg)]";
const FLOAT_CLASS = "bg-surface-2 text-ink-soft";

function PreviewIoNodeImpl({ data }: NodeProps<EditorNode>) {
  const ioData = data as PreviewIoData;
  const isInput = ioData.kind === "input";
  const signal = isInput ? (ioData.value ?? SignalState.LOW) : ioData.value;

  const stateClass =
    signal === SignalState.HIGH ? HIGH_CLASS : signal === SignalState.LOW ? LOW_CLASS : FLOAT_CLASS;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        {!isInput && <NodeHandle id="in-0" type="target" position={Position.Left} style={{ pointerEvents: "none" }} />}
        {isInput && <NodeHandle id="out-0" type="source" position={Position.Right} style={{ pointerEvents: "none" }} />}
        <button
          type="button"
          onClick={isInput ? ioData.onToggle : undefined}
          aria-label={isInput ? `Toggle ${ioData.name}` : `${ioData.name} output`}
          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-transparent font-mono text-xs font-bold transition-all ${stateClass} ${
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

export const PreviewIoNode = memo(PreviewIoNodeImpl);
