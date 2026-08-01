"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { useShallow } from "zustand/react/shallow";
import { GateType, gateTypeToString, isSequential } from "@nandscape/engine";
import { NodeHandle, Position } from "@/components/editor/nodes/node-handle";
import { defaultInputCountForGateType } from "@/lib/editor/gate-defaults";
import {
  GateShape,
  GATE_SHAPE_WIDTH,
  NODE_WIDTH,
  usesSpecialShape,
  isInvertedGate,
  computeGateShapeGeometry,
} from "@/components/editor/nodes/gate-shapes";
import { usePreferencesStore } from "@/store/preferences-store";
import type { EditorNode, GateNodeData } from "@/types/editor";

function PreviewGateNodeImpl({ data }: NodeProps<EditorNode>) {
  const gateData = data as GateNodeData;
  const typeName = gateData.gateType === GateType.BUFFER ? "" : gateTypeToString(gateData.gateType);
  const sequential = isSequential(gateData.gateType);
  const inputCount = gateData.inputCount ?? defaultInputCountForGateType(gateData.gateType);
  const outputCount = sequential ? 2 : 1;

  const { margin, spacing, minHeight } = usePreferencesStore(
    useShallow((s) => ({
      margin: s.gateNodeTopMargin,
      spacing: s.gateNodePortSpacing,
      minHeight: s.gateNodeMinHeight,
    })),
  );
  const { bubbleRadius, bubbleGap } = usePreferencesStore(
    useShallow((s) => ({
      bubbleRadius: s.gateShapesBubbleRadius,
      bubbleGap: s.gateShapesBubbleGap,
    })),
  );

  const maxPorts = Math.max(inputCount, outputCount);
  const nodeHeight = Math.max(minHeight, margin * 2 + (maxPorts - 1) * spacing);
  const availableHeight = nodeHeight - margin * 2;

  const verticalPos = (index: number, count: number) =>
    count <= 1 ? nodeHeight / 2 : margin + index * (availableHeight / (count - 1));

  const special = usesSpecialShape(gateData.gateType);
  const inverted = isInvertedGate(gateData.gateType);
  const geometry = special
    ? computeGateShapeGeometry(gateData.gateType, nodeHeight, bubbleRadius, bubbleGap)
    : null;
  const outputInset = geometry ? GATE_SHAPE_WIDTH - geometry.connectorX : 0;
  const outputDiameter = special && inverted ? bubbleRadius * 2 + 2 : 14;

  return (
    <div
      style={{ height: nodeHeight, width: NODE_WIDTH }}
      className="pointer-events-none relative flex items-center justify-center"
    >
      {Array.from({ length: inputCount }).map((_, i) => (
        <NodeHandle
          key={`in-${i}`}
          id={`in-${i}`}
          type="target"
          position={Position.Left}
          style={{ top: verticalPos(i, inputCount), pointerEvents: "none" }}
        />
      ))}

      {outputCount === 1 ? (
        <NodeHandle
          id="out-0"
          type="source"
          position={Position.Right}
          style={{
            top: verticalPos(0, 1),
            pointerEvents: "none",
            ...(outputInset > 0 ? { right: outputInset } : {}),
          }}
          diameter={outputDiameter}
          bare={special && inverted}
        />
      ) : (
        ["Q", "Q̄"].map((label, i) => (
          <NodeHandle
            key={label}
            id={`out-${i}`}
            type="source"
            position={Position.Right}
            style={{ top: verticalPos(i, outputCount), pointerEvents: "none" }}
          />
        ))
      )}

      {special ? (
        <div
          className="absolute inset-y-0 left-1/2 z-10"
          style={{ width: GATE_SHAPE_WIDTH, transform: "translateX(-50%)" }}
        >
          <GateShape gateType={gateData.gateType} height={nodeHeight} />
          <span
            className="absolute top-1/2 whitespace-nowrap text-center font-mono text-[11px] font-bold leading-tight text-ink"
            style={{ left: geometry!.labelX, transform: "translate(-50%, -50%)" }}
          >
            {gateData.label || typeName}
          </span>
        </div>
      ) : (
        <div
          style={{ width: NODE_WIDTH, transform: "translateX(-50%)" }}
          className={`absolute inset-y-0 left-1/2 z-10 flex items-center justify-center overflow-hidden rounded-lg border bg-surface-card px-2 py-2 shadow-sm ${
            sequential ? "border-signal-green/40" : "border-border-strong"
          }`}
        >
          <span
            className="w-full truncate text-center font-mono text-[11px] font-bold leading-tight text-ink"
            title={gateData.label || typeName}
          >
            {gateData.label || typeName}
          </span>
        </div>
      )}
    </div>
  );
}

export const PreviewGateNode = memo(PreviewGateNodeImpl);
