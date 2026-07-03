"use client";

import type React from "react";
import { Handle, Position, type HandleType } from "@xyflow/react";
import { SignalState } from "@nandscape/engine";

interface NodeHandleProps {
  id: string;
  type: HandleType;
  position: Position;
  signal?: SignalState;
  style?: React.CSSProperties;
}

const SIGNAL_CLASS: Record<SignalState, string> = {
  [SignalState.HIGH]: "!bg-signal-green !border-signal-green-strong !shadow-[0_0_8px_rgba(var(--color-signal-green),0.6)]",
  [SignalState.LOW]: "!bg-signal-coral !border-signal-coral-strong !shadow-[0_0_8px_rgba(var(--color-signal-coral),0.6)]",
  [SignalState.FLOAT]: "!bg-surface-2 !border-border-strong",
  [SignalState.UNKNOWN]: "!bg-copper !border-copper-dark",
};

export function NodeHandle({ id, type, position, signal, style }: NodeHandleProps) {
  const colorClass = signal !== undefined ? SIGNAL_CLASS[signal] : "!bg-surface-2 !border-border-strong";

  return (
    <Handle
      id={id}
      type={type}
      position={position}
      style={style}
      className={`!h-3 !w-3 !border-2 !rounded-full transition-all duration-200 hover:scale-125 hover:!bg-copper-light ${colorClass}`}
    />
  );
}

export { Position };