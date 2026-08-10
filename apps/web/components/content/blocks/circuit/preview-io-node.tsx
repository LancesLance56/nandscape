"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { useShallow } from "zustand/react/shallow";
import { SignalState } from "@nandscape/engine";
import { NodeHandle, Position } from "@/components/editor/nodes/node-handle";
import { NODE_WIDTH } from "@/components/editor/nodes/gate-shapes";
import { usePreferencesStore } from "@/store/preferences-store";
import type { EditorNode, IoNodeData } from "@/types/editor";

/**
 * The circuit-embed's version of io-node.tsx: same square-card-with-
 * outside-label layout and margin/minHeight-derived sizing, so its pins line
 * up with PreviewGateNode's single-port formula (see preview-gate-node.tsx)
 * exactly the way the real io-node.tsx lines up with gate-node.tsx. It never
 * writes through useEditorStore.updateNodeData() the way the real one does
 * though - that would mean clicking an input inside a tutorial silently
 * edits the app's one global editor graph and pollutes its undo history.
 * Instead it calls back an `onToggle` the embed injects into the node's
 * data for this render (see circuit-stage.tsx),  so state stays local to
 * the one embedded circuit the reader is looking at.
 */
interface PreviewIoData extends IoNodeData {
  onToggle?: () => void;
}

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

const LABEL_HEIGHT = 13;
const LABEL_GAP = 3;

function PreviewIoNodeImpl({ data }: NodeProps<EditorNode>) {
  const ioData = data as PreviewIoData;
  const isInput = ioData.kind === "input";
  // An output with no incoming edge has no value at all (see circuit-stage.tsx),
  // same FLOAT fallback the real io-node.tsx uses for that case.
  const signal = isInput ? (ioData.value ?? SignalState.LOW) : (ioData.value ?? SignalState.FLOAT);

  const { margin, minHeight } = usePreferencesStore(
    useShallow((s) => ({
      margin: s.gateNodeTopMargin,
      minHeight: s.gateNodeMinHeight,
    })),
  );
  const boxHeight = Math.max(minHeight, margin * 2);
  const nodeHeight = boxHeight + LABEL_GAP + LABEL_HEIGHT;

  const stateChar = signal === SignalState.HIGH ? "1" : signal === SignalState.LOW ? "0" : "·";

  return (
    <div style={{ height: nodeHeight, width: boxHeight }} className="pointer-events-none relative">
      {!isInput && (
        <NodeHandle
          id="in-0"
          type="target"
          position={Position.Left}
          style={{ top: boxHeight / 2, pointerEvents: "none" }}
        />
      )}
      {isInput && (
        <NodeHandle
          id="out-0"
          type="source"
          position={Position.Right}
          style={{ top: boxHeight / 2, pointerEvents: "none" }}
        />
      )}

      <button
        type="button"
        onClick={isInput ? ioData.onToggle : undefined}
        aria-label={isInput ? `Toggle ${ioData.name}` : `${ioData.name} output`}
        style={{ top: 0, height: boxHeight, width: boxHeight }}
        className={`nodrag nopan pointer-events-auto absolute left-1/2 z-10 flex -translate-x-1/2 items-center justify-center overflow-hidden rounded-lg border bg-surface-card shadow-sm transition-[box-shadow,border-color] duration-150 ${
          STATE_BORDER_CLASS[signal]
        } ${isInput ? "cursor-pointer active:scale-[0.97]" : "cursor-default"}`}
      >
        <span className={`font-mono text-sm font-bold leading-none ${STATE_TEXT_CLASS[signal]}`}>{stateChar}</span>
      </button>

      <span
        style={{ top: boxHeight + LABEL_GAP, height: LABEL_HEIGHT, width: NODE_WIDTH }}
        className="absolute left-1/2 -translate-x-1/2 truncate text-center font-mono text-[10px] font-semibold text-slate"
      >
        {ioData.name}
      </span>
    </div>
  );
}

export const PreviewIoNode = memo(PreviewIoNodeImpl);
