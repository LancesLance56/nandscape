"use client";

import {memo} from "react";
import type {NodeProps} from "@xyflow/react";
import {useShallow} from "zustand/react/shallow";
import {gateTypeToString, isSequential} from "@nandscape/engine";
import {NodeHandle, Position} from "./node-handle";
import {defaultInputCountForGateType} from "@/lib/editor/gate-defaults";
import {GateShape, GATE_SHAPE_WIDTH, usesSpecialShape, computeGateShapeGeometry} from "./gate-shapes";
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

  return (
    <div
      style={{height: `${nodeHeight}px`}}
      className="relative flex min-w-24 items-center justify-center transition-[height] duration-150"
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
          style={{top: `${topForHandle(0, 1)}px`}}
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

      {usesSpecialShape(gateData.gateType) ? (
        <div
          className="absolute inset-y-0 left-1/2 z-10 -translate-x-1/2"
          style={{width: GATE_SHAPE_WIDTH}}
        >
          <GateShape gateType={gateData.gateType} height={nodeHeight} selected={selected} />
          <span
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-center font-mono text-xs font-bold leading-tight text-ink"
            style={{left: computeGateShapeGeometry(gateData.gateType, nodeHeight, bubbleRadius, bubbleGap).labelX}}
          >
            {gateData.label || typeName}
          </span>
        </div>
      ) : (
        <div
          className={`absolute inset-y-0 left-1/2 z-10 flex min-w-24 -translate-x-1/2 flex-col items-center justify-center gap-0.5 rounded-lg border bg-surface-card px-3 py-2.5 shadow-sm transition-[box-shadow,border-color] duration-150 ${
            selected ? "border-copper ring-2 ring-copper/30" : sequential ? "border-signal-green/40" : "border-border-strong"
          }`}
        >
          <span className="text-center font-mono text-xs font-bold leading-tight text-ink">
            {gateData.label || typeName}
          </span>
          {sequential && (
            <span className="mt-0.5 text-center font-mono text-[9px] uppercase tracking-wider text-signal-green">
              stateful
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export const GateNode = memo(GateNodeImpl);