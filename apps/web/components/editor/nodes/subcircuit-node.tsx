"use client";

import { memo, useMemo } from "react";
import type { NodeProps } from "@xyflow/react";
import { useShallow } from "zustand/react/shallow";
import { NodeHandle, Position } from "./node-handle";
import { useHandleClick } from "@/hooks/use-handle-click";
import { useSubcircuitBlocksStore } from "@/store/subcircuit-blocks-store";
import { usePreferencesStore } from "@/store/preferences-store";
import { getBuiltinSubcircuitBlocks } from "@/lib/editor/default-blocks";
import { NODE_WIDTH } from "./gate-shapes";
import type { EditorNode, SubcircuitNodeData } from "@/types/editor";
import { hexToRgba } from "@/lib/editor/block-colors";

function SubcircuitNodeImpl({ id, data, selected }: NodeProps<EditorNode>) {
  const scData = data as SubcircuitNodeData;
  const customBlocks = useSubcircuitBlocksStore((s) => s.customBlocks);
  const block = useMemo(
    () =>
      getBuiltinSubcircuitBlocks().find((b) => b.id === scData.circuitId) ??
      customBlocks.find((b) => b.id === scData.circuitId),
    [customBlocks, scData.circuitId],
  );
  const { onHandleClick, onHandleMouseEnter, onHandleMouseLeave } = useHandleClick();

  const { margin, spacing, minHeight } = usePreferencesStore(
    useShallow((s) => ({
      margin: s.gateNodeTopMargin,
      spacing: s.gateNodePortSpacing,
      minHeight: s.gateNodeMinHeight,
    })),
  );

  if (!block) {
    return (
      <div className="rounded-lg border border-signal-coral bg-surface-card px-3 py-2 font-mono text-[11px] text-signal-coral">
        Missing block ({scData.circuitId})
      </div>
    );
  }

  const maxPorts = Math.max(block.inputs.length, block.outputs.length);
  const nodeHeight = Math.max(minHeight, margin * 2 + (maxPorts - 1) * spacing);
  const availableHeight = nodeHeight - margin * 2;

  const topForHandle = (index: number, count: number) => {
    if (count <= 1) return nodeHeight / 2;
    const sideSpacing = availableHeight / (count - 1);
    return margin + index * sideSpacing;
  };

  const colorStyle = block.color
    ? {
        backgroundColor: hexToRgba(block.color, 0.16),
        borderColor: selected ? undefined : block.color,
      }
    : undefined;

  return (
    <div
      style={{ height: `${nodeHeight}px`, width: `${NODE_WIDTH}px` }}
      className="relative flex items-center justify-center transition-[height] duration-150"
    >
      {block.inputs.map((port, i) => (
        <NodeHandle
          key={`in-${i}`}
          id={`in-${i}`}
          type="target"
          position={Position.Left}
          style={{ top: `${topForHandle(i, block.inputs.length)}px` }}
          onClick={(event) => onHandleClick(id, `in-${i}`, "target", event)}
          onMouseEnter={(event) => onHandleMouseEnter(id, "target", event)}
          onMouseLeave={onHandleMouseLeave}
        />
      ))}

      {block.outputs.map((port, i) => (
        <NodeHandle
          key={`out-${i}`}
          id={`out-${i}`}
          type="source"
          position={Position.Right}
          style={{ top: `${topForHandle(i, block.outputs.length)}px` }}
          onClick={(event) => onHandleClick(id, `out-${i}`, "source", event)}
          onMouseEnter={(event) => onHandleMouseEnter(id, "source", event)}
          onMouseLeave={onHandleMouseLeave}
        />
      ))}

      <div
        style={{ ...colorStyle, width: NODE_WIDTH }}
        className={`absolute inset-y-0 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg border bg-surface-card px-2 py-2 shadow-sm transition-[box-shadow,border-color] duration-150 ${
          selected ? "border-copper ring-2 ring-copper/30" : block.color ? "" : "border-signal-green/40"
        }`}
      >
        <span
          className="w-full truncate text-center font-mono text-[11px] font-bold leading-tight text-ink"
          title={scData.label || block.name}
        >
          {scData.label || block.name}
        </span>
      </div>
    </div>
  );
}

export const SubcircuitNode = memo(SubcircuitNodeImpl);