"use client";

import { memo, useState, useCallback } from "react";
import type { NodeProps } from "@xyflow/react";
import { NodeHandle, Position } from "./node-handle";
import type { EditorNode, IoNodeData } from "@/types/editor";

function GripIcon() {
  return (
    <svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor">
      <circle cx="2" cy="2" r="1.5" />
      <circle cx="2" cy="7" r="1.5" />
      <circle cx="2" cy="12" r="1.5" />
      <circle cx="6" cy="2" r="1.5" />
      <circle cx="6" cy="7" r="1.5" />
      <circle cx="6" cy="12" r="1.5" />
    </svg>
  );
}

function IoNodeImpl({ data, selected }: NodeProps<EditorNode>) {
  const ioData = data as IoNodeData;
  const isInput = ioData.kind === "input";
  const [isOn, setIsOn] = useState(false);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInput) {
      setIsOn((prev) => !prev);
    }
  }, [isInput]);

  const getContainerStyles = () => {
    const base = "relative flex h-10 min-w-24 items-center rounded-lg border shadow-sm backdrop-blur-md transition-all duration-200";

    if (selected) {
      return `${base} border-copper bg-surface-card ring-2 ring-copper/20 scale-105`;
    }

    return `${base} border-border-strong bg-surface-card/90 hover:border-copper/50 hover:shadow-md`;
  };

  const getButtonStyles = () => {
    const base = "nodrag flex h-full flex-1 items-center justify-center rounded-r-lg px-3 transition-colors";

    if (!isInput) {
      return `${base} cursor-default`;
    }

    return `${base} cursor-pointer hover:bg-surface-2/50`;
  };

  const getLabelStyles = () => {
    const base = "select-none font-mono text-[11px] font-bold uppercase tracking-widest transition-all duration-200";

    if (isInput) {
      if (isOn) {
        return `${base} text-signal-green drop-shadow-[0_0_8px_rgba(var(--color-signal-green),0.8)] scale-110`;
      }
      return `${base} text-signal-coral drop-shadow-[0_0_8px_rgba(var(--color-signal-coral),0.8)]`;
    }

    return `${base} text-ink`;
  };

  return (
    <div className={getContainerStyles()}>
      {!isInput && (
        <NodeHandle id="in-0" type="target" position={Position.Left} />
      )}

      <div className="drag-handle flex h-full w-7 shrink-0 cursor-grab items-center justify-center rounded-l-lg border-r border-border/50 bg-surface-2/30 text-ink-soft transition-colors hover:bg-surface-2/60 hover:text-ink active:cursor-grabbing">
        <GripIcon />
      </div>

      <button
        type="button"
        onClick={handleToggle}
        disabled={!isInput}
        className={getButtonStyles()}
      >
        <span className={getLabelStyles()}>
          {(isOn ? "ON " : "OFF ") + ioData.name || (isInput ? "IN" : "OUT")}
        </span>
      </button>

      {isInput && (
        <NodeHandle id="out-0" type="source" position={Position.Right} />
      )}
    </div>
  );
}

export const IoNode = memo(IoNodeImpl);