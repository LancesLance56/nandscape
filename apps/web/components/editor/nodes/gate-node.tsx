"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { gateTypeToString, isSequential } from "@nandscape/engine";
import { NodeHandle, Position } from "./node-handle";
import { defaultInputCountForGateType } from "@/lib/editor/gate-defaults";
import type { EditorNode, GateNodeData } from "@/types/editor";

function GateNodeImpl({ data, selected }: NodeProps<EditorNode>) {
  const gateData = data as GateNodeData;
  const typeName = gateTypeToString(gateData.gateType);
  const sequential = isSequential(gateData.gateType);
  const inputCount = gateData.inputCount ?? defaultInputCountForGateType(gateData.gateType);
  const outputCount = sequential ? 2 : 1;

  return (
    <div
      className={`relative flex min-w-24 flex-col items-center rounded-lg border bg-surface-card px-3 py-2.5 shadow-sm transition-colors ${
        selected
          ? "border-copper ring-2 ring-copper/30"
          : sequential
            ? "border-signal-green/40"
            : "border-border-strong"
      }`}
    >
      {Array.from({ length: inputCount }).map((_, i) => (
        <NodeHandle
          key={`in-${i}`}
          id={`in-${i}`}
          type="target"
          position={Position.Left}
          style={{ top: `${((i + 1) / (inputCount + 1)) * 100}%` }}
        />
      ))}

      <span className="font-mono text-xs font-bold text-ink">{gateData.label || typeName}</span>
      {sequential && (
        <span className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-signal-green">
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
