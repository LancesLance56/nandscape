"use client";

import {memo} from "react";
import type {CSSProperties} from "react";
import type {NodeProps} from "@xyflow/react";
import {useShallow} from "zustand/react/shallow";
import {GateType, gateTypeToString, isSequential} from "@nandscape/engine";
import {NodeHandle, Position} from "./node-handle";
import {inputCountForGate, outputCountForGate, inputPinLabel, outputPinLabel} from "@/lib/editor/gate-defaults";
import {
  GateShape, GATE_SHAPE_WIDTH, NODE_WIDTH,
  usesSpecialShape, isInvertedGate, computeGateShapeGeometry,
} from "./gate-shapes";
import {useHandleClick} from "@/hooks/use-handle-click";
import type {EditorNode, GateNodeData} from "@/types/editor";
import {usePreferencesStore} from "@/store/preferences-store";

const ROTATION_ORDER: Position[] = [Position.Left, Position.Top, Position.Right, Position.Bottom];

function rotatePosition(base: Position, rotationDeg: number): Position {
  const steps = (rotationDeg / 90) % 4;
  const idx = ROTATION_ORDER.indexOf(base);
  return ROTATION_ORDER[(idx + steps) % 4];
}

function GateNodeImpl({id, data, selected}: NodeProps<EditorNode>) {
  const gateData = data as GateNodeData;
  // not enough space for BUFFER in the node so its empty
  const typeName = gateData.gateType == GateType.BUFFER ? "" : gateTypeToString(gateData.gateType);
  const sequential = isSequential(gateData.gateType);
  const inputCount = inputCountForGate(gateData);
  const outputCount = outputCountForGate(gateData);
  const rotation = gateData.rotation ?? 0;
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
  const showGateLabels = usePreferencesStore((s) => s.showGateLabels);

  const maxPorts = Math.max(inputCount, outputCount);
  const nodeHeight = Math.max(minHeight, margin * 2 + (maxPorts - 1) * spacing);
  const availableHeight = nodeHeight - margin * 2;
  const availableWidth = NODE_WIDTH - margin * 2;

  const verticalPos = (index: number, count: number) =>
    count <= 1 ? nodeHeight / 2 : margin + index * (availableHeight / (count - 1));
  const horizontalPos = (index: number, count: number) =>
    count <= 1 ? NODE_WIDTH / 2 : margin + index * (availableWidth / (count - 1));

  const styleForPosition = (position: Position, index: number, count: number): CSSProperties =>
    position === Position.Left || position === Position.Right
      ? {top: `${verticalPos(index, count)}px`}
      : {left: `${horizontalPos(index, count)}px`};

  const special = usesSpecialShape(gateData.gateType);
  const inverted = isInvertedGate(gateData.gateType);
  const geometry = special
    ? computeGateShapeGeometry(gateData.gateType, nodeHeight, bubbleRadius, bubbleGap)
    : null;
  const outputInset = geometry ? GATE_SHAPE_WIDTH - geometry.connectorX : 0;
  const outputDiameter = special && inverted ? bubbleRadius * 2 + 2 : 14;

  const inputPosition = rotatePosition(Position.Left, rotation);
  const outputPosition = rotatePosition(Position.Right, rotation);

  const outputInsetStyle: CSSProperties =
    outputInset > 0
      ? outputPosition === Position.Right
        ? {right: outputInset}
        : outputPosition === Position.Left
          ? {left: outputInset}
          : outputPosition === Position.Bottom
            ? {bottom: outputInset}
            : {top: outputInset}
      : {};

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
          position={inputPosition}
          style={styleForPosition(inputPosition, i, inputCount)}
          title={inputPinLabel(gateData, i)}
          onClick={(event) => onHandleClick(id, `in-${i}`, "target", event)}
          onMouseEnter={(event) => onHandleMouseEnter(id, "target", event)}
          onMouseLeave={onHandleMouseLeave}
        />
      ))}

      {outputCount === 1 ? (
        <NodeHandle
          id="out-0"
          type="source"
          position={outputPosition}
          style={{...styleForPosition(outputPosition, 0, 1), ...outputInsetStyle}}
          diameter={outputDiameter}
          bare={special && inverted}
          title={outputPinLabel(gateData, 0)}
          onClick={(event) => onHandleClick(id, "out-0", "source", event)}
          onMouseEnter={(event) => onHandleMouseEnter(id, "source", event)}
          onMouseLeave={onHandleMouseLeave}
        />
      ) : (
        Array.from({length: outputCount}).map((_, i) => (
          <NodeHandle
            key={`out-${i}`}
            id={`out-${i}`}
            type="source"
            position={outputPosition}
            style={styleForPosition(outputPosition, i, outputCount)}
            title={outputPinLabel(gateData, i)}
            onClick={(event) => onHandleClick(id, `out-${i}`, "source", event)}
            onMouseEnter={(event) => onHandleMouseEnter(id, "source", event)}
            onMouseLeave={onHandleMouseLeave}
          />
        ))
      )}

      {special ? (
        <div
          className="absolute inset-y-0 left-1/2 z-10"
          style={{width: GATE_SHAPE_WIDTH, transform: `translateX(-50%) rotate(${rotation}deg)`}}
        >
          <GateShape gateType={gateData.gateType} height={nodeHeight} selected={selected} />
          {showGateLabels && (
            <span
              className="absolute top-1/2 whitespace-nowrap text-center font-mono text-[11px] font-bold leading-tight text-ink"
              style={{left: geometry!.labelX, transform: `translate(-50%, -50%) rotate(${-rotation}deg)`}}
            >
              {gateData.label || typeName}
            </span>
          )}
        </div>
      ) : (
        <div
          style={{width: NODE_WIDTH, transform: `translateX(-50%) rotate(${rotation}deg)`}}
          className={`absolute inset-y-0 left-1/2 z-10 flex items-center justify-center overflow-hidden rounded-lg border bg-surface-card px-2 py-2 shadow-sm transition-[box-shadow,border-color] duration-150 ${
            selected ? "border-copper ring-2 ring-copper/30" : sequential ? "border-signal-green/40" : "border-border-strong"
          }`}
        >
          <span
            className="w-full truncate text-center font-mono text-[11px] font-bold leading-tight text-ink"
            style={{transform: `rotate(${-rotation}deg)`}}
            title={gateData.label || typeName}
          >
            {gateData.label || typeName}
          </span>
        </div>
      )}
    </div>
  );
}

export const GateNode = memo(GateNodeImpl);