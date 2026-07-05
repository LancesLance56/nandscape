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
  [SignalState.HIGH]: "!bg-signal-green !border-signal-green-strong",
  [SignalState.LOW]: "!bg-signal-coral !border-signal-coral-strong",
  [SignalState.FLOAT]: "!bg-surface-2 !border-border-strong",
  [SignalState.UNKNOWN]: "!bg-copper !border-copper-dark",
};

/**
 * A pin — rendered as a small two-tone circular "grip" (an inset ring makes
 * it read as a drag target rather than a flat dot) that scales up slightly
 * on hover/grab. Not simulating yet -> neutral gray; pass `signal` to color
 * it live once wired to a signal source.
 */
export function NodeHandle({ id, type, position, signal, style }: NodeHandleProps) {
  const colorClass = signal !== undefined ? SIGNAL_CLASS[signal] : "!bg-surface-2 !border-border-strong";

  return (
    <Handle
      id={id}
      type={type}
      position={position}
      style={style}
      className={`!h-3.5 !w-3.5 !rounded-full !border-2 !shadow-[inset_0_0_0_1.5px_var(--surface-card)] !cursor-grab transition-transform hover:!scale-125 active:!cursor-grabbing ${colorClass}`}
    />
  );
}

export { Position };
