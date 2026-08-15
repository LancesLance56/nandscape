"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { useShallow } from "zustand/react/shallow";
import { NodeHandle, Position } from "@/components/editor/nodes/node-handle";
import { usePreferencesStore } from "@/store/preferences-store";
import type { BlockPort, SubcircuitBlockDefinition } from "@/types/subcircuit-block";
import type { EditorNode, SubcircuitNodeData } from "@/types/editor";

/**
 * The circuit-embed's version of subcircuit-node.tsx. Identical sizing and
 * port-offset math, so a block's pins land where the saved edges expect them
 * (handle ids are port NAMES here, not the gate family's positional
 * in-i/out-i,  see live-simulate.ts's readNamedInputs).
 *
 * The one real difference: the editor's version resolves its own block
 * through useResolvedSubcircuit(), which reads the *viewer's* local block
 * library and the active editing session's scopes store. Neither exists for
 * someone reading a shared project, so the resolved block is injected into
 * this node's data for the render instead (see circuit-stage.tsx), the same
 * way PreviewIoNode gets its `onToggle`.
 */
interface PreviewSubcircuitData extends SubcircuitNodeData {
  block?: SubcircuitBlockDefinition;
}

function PreviewSubcircuitNodeImpl({ data }: NodeProps<EditorNode>) {
  const { portSpacing, portTopMargin, minWidth, maxWidth, charWidth, minHeight } = usePreferencesStore(
    useShallow((s) => ({
      portSpacing: s.gateNodePortSpacing,
      portTopMargin: s.gateNodeTopMargin,
      minWidth: s.gateNodeMinWidth,
      maxWidth: s.gateNodeMaxWidth,
      charWidth: s.gateCharWidth,
      minHeight: s.gateNodeMinHeight,
    })),
  );

  const scData = data as PreviewSubcircuitData;
  const block = scData.block;

  const label = scData.label || block?.name || "Missing block";
  const inputs: BlockPort[] = block?.inputs ?? [];
  const outputs: BlockPort[] = block?.outputs ?? [];
  const portCount = Math.max(inputs.length, outputs.length, 1);

  const height = Math.max(minHeight, (portCount - 1) * portSpacing + portTopMargin * 2);
  const estimatedWidth = Math.ceil(label.length * charWidth) + 32;
  const width = Math.min(maxWidth, Math.max(minWidth, estimatedWidth));

  const portOffset = (index: number, total: number) => {
    if (total <= 1) return height / 2;
    const usable = height - portTopMargin * 2;
    return portTopMargin + (usable * index) / (total - 1);
  };

  return (
    <div
      style={{ width, height }}
      className="pointer-events-none relative flex items-center justify-center"
    >
      {inputs.map((input, i) => (
        <NodeHandle
          key={input.name}
          id={input.name}
          type="target"
          position={Position.Left}
          style={{ top: portOffset(i, inputs.length), pointerEvents: "none" }}
        />
      ))}

      {outputs.map((output, i) => (
        <NodeHandle
          key={output.name}
          id={output.name}
          type="source"
          position={Position.Right}
          style={{ top: portOffset(i, outputs.length), pointerEvents: "none" }}
        />
      ))}

      <div
        style={{ width, height }}
        className={`absolute inset-0 flex items-center justify-center overflow-hidden rounded-lg border bg-surface-card px-1 py-1 shadow-sm ${
          block ? "border-border-strong" : "border-dashed border-signal-coral/60"
        }`}
      >
        <div className="flex flex-col items-center gap-1">
          {block?.color && (
            <span
              className="h-1.5 w-6 rounded-full"
              style={{ backgroundColor: block.color }}
              aria-hidden="true"
            />
          )}
          <span
            className="line-clamp-3 whitespace-normal break-words text-center text-[11px] font-bold leading-tight text-ink"
            title={label}
          >
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}

export const PreviewSubcircuitNode = memo(PreviewSubcircuitNodeImpl);
