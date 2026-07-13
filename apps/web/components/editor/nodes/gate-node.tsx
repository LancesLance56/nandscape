"use client";

import {memo} from "react";
import type {NodeProps} from "@xyflow/react";
import {useShallow} from "zustand/react/shallow";
import {gateTypeToString, isSequential} from "@nandscape/engine";
import {NodeHandle, Position} from "./node-handle";
import {defaultInputCountForGateType} from "@/lib/editor/gate-defaults";
import {
  GateShape, GATE_SHAPE_WIDTH, NODE_WIDTH,
  usesSpecialShape, isInvertedGate, computeGateShapeGeometry,
} from "./gate-shapes";
import {useHandleClick} from "@/hooks/use-handle-click";
import type {EditorNode, GateNodeData} from "@/types/editor";
import {usePreferencesStore} from "@/store/preferences-store";

function GateNodeImpl({id, data, selected}: NodeProps<EditorNode>) {
  const gateData = data as GateNodeData;
  const typeName = gateTypeToString(gateData.gateType);
  const sequential = isSequential(gateData.gateType);
  const inputCount = gateData.inputCount ?? defaultInputCountForGateType(gateData.gateType);
  const outputCount = sequential ? 2 : 1;
  const {onHandleClick, onHandleMouseEnter, onHandleMouseLeave} = useHandleClick();

  const {margin, spacing, minHeight} = usePreferencesStore(
    useShallow((s) => ({
      margin: s.gateNodeTopMargin,
      spacing: s.gateNodePortSpacing,
      minHeight: s.gateNodeMinHeight,
    })),
  );

  const {bubbleRadius, bubbleGap} = usePreferencesStore(
    useShallow((s) => ({
      bubbleRadius: s.gateShapesBubbleRadius,
      bubbleGap: s.gateShapesBubbleGap,
    })),
  );

  const maxPorts = Math.max(inputCount, outputCount);
  const nodeHeight = Math.max(minHeight, margin * 2 + (maxPorts - 1) * spacing);
  const availableHeight = nodeHeight - margin * 2;

  const topForHandle = (index: number, count: number) => {
    if (count <= 1) return nodeHeight / 2;
    const sideSpacing = availableHeight / (count - 1);
    return margin + index * sideSpacing;
  };

  const special = usesSpecialShape(gateData.gateType);
  const inverted = isInvertedGate(gateData.gateType);
  const geometry = special
    ? computeGateShapeGeometry(gateData.gateType, nodeHeight, bubbleRadius, bubbleGap)
    : null;
  // How far the connector sits inset from the node's right edge — 0 for
  // plain shapes, `bubbleRadius` for inverted ones (bubble center).
  const outputInset = geometry ? GATE_SHAPE_WIDTH - geometry.connectorX : 0;
  const outputDiameter = special && inverted ? bubbleRadius * 2 + 2 : 14;

  return (
    <div
      style={{height: `${nodeHeight}px`, width: `${NODE_WIDTH}px`}}
      className="relative flex items-center justify-center transition-[height] duration-150"
    >
      {Array.from({length: inputCount}).map((_, i) => (
        <NodeHandle
          key={`in-${i}`}
          id={`in-${i}`}
          type="target"
          position={Position.Left}
          style={{top: `${topForHandle(i, inputCount)}px`}}
          onClick={(event) => onHandleClick(id, `in-${i}`, "target", event)}
          onMouseEnter={(event) => onHandleMouseEnter(id, "target", event)}
          onMouseLeave={onHandleMouseLeave}
        />
      ))}

      {outputCount === 1 ? (
        <NodeHandle
          id="out-0"
          type="source"
          position={Position.Right}
          style={{top: `${topForHandle(0, 1)}px`, right: outputInset}}
          diameter={outputDiameter}
          bare={special && inverted}
          onClick={(event) => onHandleClick(id, "out-0", "source", event)}
          onMouseEnter={(event) => onHandleMouseEnter(id, "source", event)}
          onMouseLeave={onHandleMouseLeave}
        />
      ) : (
        ["Q", "Q̄"].map((label, i) => (
          <NodeHandle
            key={label}
            id={`out-${i}`}
            type="source"
            position={Position.Right}
            style={{top: `${topForHandle(i, outputCount)}px`}}
            onClick={(event) => onHandleClick(id, `out-${i}`, "source", event)}
            onMouseEnter={(event) => onHandleMouseEnter(id, "source", event)}
            onMouseLeave={onHandleMouseLeave}
          />
        ))
      )}

      {special ? (
        <div className="absolute inset-y-0 left-1/2 z-10 -translate-x-1/2" style={{width: GATE_SHAPE_WIDTH}}>
          <GateShape gateType={gateData.gateType} height={nodeHeight} selected={selected} />
          <span
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-center font-mono text-[11px] font-bold leading-tight text-ink"
            style={{left: geometry!.labelX}}
          >
            {gateData.label || typeName}
          </span>
        </div>
      ) : (
        <div
          style={{width: NODE_WIDTH}}
          className={`absolute inset-y-0 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg border bg-surface-card px-2 py-2 shadow-sm transition-[box-shadow,border-color] duration-150 ${
            selected ? "border-copper ring-2 ring-copper/30" : sequential ? "border-signal-green/40" : "border-border-strong"
          }`}
        >
          <span
            className="w-full truncate text-center font-mono text-[11px] font-bold leading-tight text-ink"
            title={gateData.label || typeName}
          >
            {gateData.label || typeName}
          </span>
          {sequential && (
            <span className="mt-0.5 text-center font-mono text-[8px] uppercase tracking-wider text-signal-green">
              stateful
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export const GateNode = memo(GateNodeImpl);