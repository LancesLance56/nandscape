"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { gateTypeToString, isSequential } from "@nandscape/engine";
import { NodeHandle, Position } from "./node-handle";
import type { EditorNode, GateNodeData } from "@/types/editor";

function GateNodeImpl({ data, selected }: NodeProps<EditorNode>) {
  const gateData = data as GateNodeData;
  const typeName = gateTypeToString(gateData.gateType);
  const sequential = isSequential(gateData.gateType);
  const inputCount = gateData.inputCount ?? (typeName === "NOT" || typeName === "BUFFER" ? 1 : 2);
  const outputCount = sequential ? 2 : 1;

  const getContainerStyles = () => {
    const base = "relative flex min-w-28 flex-col items-center rounded-xl border backdrop-blur-md px-4 py-3 shadow-md transition-all duration-200";

    if (selected) {
      return `${base} border-copper bg-surface-card ring-4 ring-copper/20 scale-105`;
    }
    if (sequential) {
      return `${base} border-signal-green/50 bg-surface-card/80 hover:border-signal-green hover:shadow-lg`;
    }

    return `${base} border-border-strong bg-surface-card/80 hover:border-copper/50 hover:shadow-lg`;
  };

  return (
    <div className={getContainerStyles()}>
      {Array.from({ length: inputCount }).map((_, i) => (
        <NodeHandle
          key={`in-${i}`}
          id={`in-${i}`}
          type="target"
          position={Position.Left}
          style={{ top: `${((i + 1) / (inputCount + 1)) * 100}%` }}
        />
      ))}

      <span className="font-mono text-sm font-semibold tracking-wide text-ink drop-shadow-sm">
        {gateData.label || typeName}
      </span>

      {sequential && (
        <span className="mt-1 font-mono text-[10px] uppercase tracking-widest text-signal-green opacity-80">
          stateful
        </span>
      )}

      {outputCount === 1 ? (
        <NodeHandle id="out-0" type="source" position={Position.Right} />
      ) : (
        ["Q", "Q̄"].map((label, i) => (
          <NodeHandle
            key={label}
            id={`out-${i}`}
            type="source"
            position={Position.Right}
            style={{ top: `${((i + 1) / 3) * 100}%` }}
          />
        ))
      )}
    </div>
  );
}

export const GateNode = memo(GateNodeImpl);