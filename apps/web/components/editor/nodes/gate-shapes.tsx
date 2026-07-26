import { GateType } from "@nandscape/engine";
import { useShallow } from "zustand/react/shallow";
import { GATE_COLORS } from "@/lib/editor/gate-colors";
import { usePreferencesStore } from "@/store";

export const GATE_SHAPE_WIDTH = 64; // was 96
export const NODE_WIDTH = GATE_SHAPE_WIDTH + 20;

export function isInvertedGate(t: GateType): boolean {
  return t === GateType.NAND || t === GateType.NOR || t === GateType.XNOR || t === GateType.NOT;
}

function isOrFamily(t: GateType): boolean {
  return t === GateType.OR || t === GateType.NOR || t === GateType.XOR || t === GateType.XNOR;
}

function isAndFamily(t: GateType): boolean {
  return t === GateType.AND || t === GateType.NAND;
}

function isTriangleFamily(t: GateType): boolean {
  return t === GateType.NOT || t === GateType.BUFFER;
}

export function usesSpecialShape(gateType: GateType): boolean {
  return isAndFamily(gateType) || isOrFamily(gateType) || isTriangleFamily(gateType);
}

function bubbleShrink(gateType: GateType, bubbleRadius: number, bubbleGap: number): number {
  return isInvertedGate(gateType) ? bubbleRadius * 2 + bubbleGap : 0;
}

export interface GateShapeGeometry {
  bodyWidth: number;
  labelX: number;
  connectorX: number;
}

export function computeGateShapeGeometry(
  gateType: GateType,
  height: number,
  bubbleRadius: number,
  bubbleGap: number,
): GateShapeGeometry {
  const shrink = bubbleShrink(gateType, bubbleRadius, bubbleGap);
  const bodyWidth = GATE_SHAPE_WIDTH - shrink;
  const labelFraction = isAndFamily(gateType) ? 0.42 : isOrFamily(gateType) ? 0.34 : 0.3;
  const connectorX = isInvertedGate(gateType) ? bodyWidth + bubbleGap + bubbleRadius : bodyWidth;
  return { bodyWidth, labelX: bodyWidth * labelFraction, connectorX };
}

function andBodyPath(w: number, h: number): string {
  const straightW = w - h / 2;
  return `M0,0 L${straightW},0 A${h / 2},${h / 2} 0 0 1 ${straightW},${h} L0,${h} Z`;
}

function orBodyPath(w: number, h: number): string {
  const backBulge = w * 0.12;
  const frontControl = w * 0.62;
  return (
    `M0,0 Q${backBulge},${h / 2} 0,${h} ` +
    `Q${frontControl},${h} ${w},${h / 2} ` +
    `Q${frontControl},0 0,0 Z`
  );
}

function xorBackStrokePath(w: number, h: number): string {
  const backBulge = w * 0.12;
  const x = -6;
  return `M${x},0 Q${x + backBulge},${h / 2} ${x},${h}`;
}

function trianglePath(w: number, h: number): string {
  return `M0,0 L${w},${h / 2} L0,${h} Z`;
}

export interface GateShapeProps {
  gateType: GateType;
  height: number;
  selected?: boolean;
}

export function GateShape({ gateType, height, selected }: GateShapeProps) {
  const { bubbleRadius, bubbleGap, fillOpacity } = usePreferencesStore(
    useShallow((s) => ({
      bubbleRadius: s.gateShapesBubbleRadius,
      bubbleGap: s.gateShapesBubbleGap,
      fillOpacity: s.gateShapesFillOpacity,
    })),
  );

  const inverted = isInvertedGate(gateType);
  const { bodyWidth } = computeGateShapeGeometry(gateType, height, bubbleRadius, bubbleGap);

  const color = GATE_COLORS[gateType] ?? "var(--border-strong)";
  const strokeColor = selected ? "var(--copper)" : color;
  const strokeWidth = selected ? 2 : 1.5;

  const bodyPath = isAndFamily(gateType)
    ? andBodyPath(bodyWidth, height)
    : isOrFamily(gateType)
      ? orBodyPath(bodyWidth, height)
      : trianglePath(bodyWidth, height);

  return (
    <svg
      className="absolute overflow-visible"
      width={GATE_SHAPE_WIDTH}
      height={height}
      viewBox={`0 0 ${GATE_SHAPE_WIDTH} ${height}`}
    >
      {(gateType === GateType.XOR || gateType === GateType.XNOR) && (
        <path d={xorBackStrokePath(bodyWidth, height)} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
      )}
      <path d={bodyPath} fill={color} fillOpacity={fillOpacity} stroke={strokeColor} strokeWidth={strokeWidth} />
      {inverted && (
        <circle
          cx={bodyWidth + bubbleGap + bubbleRadius}
          cy={height / 2}
          r={bubbleRadius}
          fill={color}
          fillOpacity={fillOpacity}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
      )}
    </svg>
  );
}