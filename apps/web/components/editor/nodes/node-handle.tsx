"use client";

import type React from "react";
import {Handle, Position, type HandleType} from "@xyflow/react";
import {SignalState} from "@nandscape/engine";

interface NodeHandleProps {
  id: string;
  type: HandleType;
  position: Position;
  signal?: SignalState;
  style?: React.CSSProperties;
  onClick?: (event: React.MouseEvent) => void;
  onMouseEnter?: (event: React.MouseEvent) => void;
  onMouseLeave?: (event: React.MouseEvent) => void;
}

const SIGNAL_CLASS: Record<SignalState, string> = {
  [SignalState.HIGH]: "!bg-signal-green !border-signal-green-strong",
  [SignalState.LOW]: "!bg-signal-coral !border-signal-coral-strong",
  [SignalState.FLOAT]: "!bg-surface-2 !border-border-strong",
  [SignalState.UNKNOWN]: "!bg-copper !border-copper-dark",
};

export function NodeHandle({id, type, position, signal, style, onClick, onMouseEnter, onMouseLeave}: NodeHandleProps) {
  const colorClass = signal !== undefined ? SIGNAL_CLASS[signal] : "!bg-surface-2 !border-border-strong";

  return (
    <Handle
      id={id}
      type={type}
      position={position}
      style={style}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="!h-3.5 !w-3.5 !p-0 !overflow-visible !bg-transparent !border-none !shadow-none !cursor-pointer group"
    >
      <span
        className={`pointer-events-none block h-full w-full rounded-full border-2 shadow-[inset_0_0_0_1.5px_var(--surface-card)] transition-transform group-hover:scale-125 ${colorClass}`}
      />
    </Handle>
  );
}

export {Position};