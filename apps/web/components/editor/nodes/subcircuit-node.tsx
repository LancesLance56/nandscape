"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { NodeHandle, Position } from "./node-handle";
import { useHandleClick } from "@/hooks/use-handle-click";
import { usePreferencesStore } from "@/store";
import { useResolvedSubcircuit } from "@/hooks/use-resolved-subcircuit";
import type { BlockPort } from "@/types/subcircuit-block";
import type { EditorNode, SubcircuitNodeData } from "@/types/editor";

function SubcircuitNodeComponent({ id, data, selected }: NodeProps<EditorNode>) {
  const portSpacing = usePreferencesStore().gateNodePortSpacing;
  const portTopMargin = usePreferencesStore().gateNodeTopMargin;
  const gateMinWidth = usePreferencesStore().gateNodeMinWidth;
  const gateMaxWidth = usePreferencesStore().gateNodeMaxWidth;
  const gateCharWidth = usePreferencesStore().gateCharWidth;
  const gateMinHeight = usePreferencesStore().gateNodeMinHeight;

  const scData = data as SubcircuitNodeData;
  const { block } = useResolvedSubcircuit(scData.circuitId);
  const { onHandleClick, onHandleMouseEnter, onHandleMouseLeave } = useHandleClick();

  const label = scData.label || block?.name || "Missing block";
  const color = block?.color;
  const inputs: BlockPort[] = block?.inputs ?? [];
  const outputs: BlockPort[] = block?.outputs ?? [];
  const portCount = Math.max(inputs.length, outputs.length, 1);

  const height = Math.max(gateMinHeight, (portCount - 1) * portSpacing + portTopMargin * 2);
  const estimatedWidth = Math.ceil(label.length * gateCharWidth) + 32;
  const width = Math.min(gateMaxWidth, Math.max(gateMinWidth, estimatedWidth));

  const portOffset = (index: number, total: number) => {
    if (total <= 1) return height / 2;
    const usable = height - portTopMargin * 2;
    return portTopMargin + (usable * index) / (total - 1);
  };

  return (
    <div
      style={{ width, height }}
      className="relative flex items-center justify-center transition-[height,width] duration-150"
    >
      {inputs.map((input, i) => (
        <NodeHandle
          key={input.name}
          id={input.name}
          type="target"
          position={Position.Left}
          style={{ top: portOffset(i, inputs.length) }}
          onClick={(event) => onHandleClick(id, input.name, "target", event)}
          onMouseEnter={(event) => onHandleMouseEnter(id, "target", event)}
          onMouseLeave={onHandleMouseLeave}
        />
      ))}

      {outputs.map((output, i) => (
        <NodeHandle
          key={output.name}
          id={output.name}
          type="source"
          position={Position.Right}
          style={{ top: portOffset(i, outputs.length) }}
          onClick={(event) => onHandleClick(id, output.name, "source", event)}
          onMouseEnter={(event) => onHandleMouseEnter(id, "source", event)}
          onMouseLeave={onHandleMouseLeave}
        />
      ))}

      <div
        style={{ width, height }}
        className={`absolute inset-0 flex items-center justify-center overflow-hidden rounded-lg border bg-surface-card px-1 py-1 shadow-sm transition-[box-shadow,border-color] duration-150 ${
          selected
            ? "border-copper ring-2 ring-copper/30"
            : !block
              ? "border-dashed border-signal-coral/60"
              : "border-border-strong"
        }`}
      >
        <div className="flex flex-col items-center gap-1">
          {color && (
            <span
              className="h-1.5 w-6 rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
          )}
          <span
            className="line-clamp-3 whitespace-normal break-words text-center font-mono text-[11px] font-bold leading-tight text-ink"
            title={label}
          >
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}

export const SubcircuitNode = memo(SubcircuitNodeComponent);