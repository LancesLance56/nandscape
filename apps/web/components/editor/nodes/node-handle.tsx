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
  diameter?: number;
  bare?: boolean;
  /** Tooltip text for pins where position alone doesn't make the role
   *  obvious (e.g. a multiplexer's select vs. data lines). */
  title?: string;
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

export function NodeHandle({
  id, type, position, signal, style, diameter = 14, bare = false, title,
  onClick, onMouseEnter, onMouseLeave,
}: NodeHandleProps) {
  const colorClass = signal !== undefined ? SIGNAL_CLASS[signal] : "!bg-surface-2 !border-border-strong";

  return (
    <Handle
      id={id}
      type={type}
      position={position}
      style={{...style, width: diameter, height: diameter}}
      title={title}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="!p-0 !overflow-visible !bg-transparent !border-none !shadow-none !cursor-pointer group"
    >
      {bare ? (
        <span className="pointer-events-none block h-full w-full rounded-full ring-0 transition-all group-hover:ring-2 group-hover:ring-copper/50" />
      ) : (
        <span
          className={`pointer-events-none block h-full w-full rounded-full border-2 shadow-[inset_0_0_0_1.5px_var(--surface-card)] transition-transform group-hover:scale-125 ${colorClass}`}
        />
      )}
    </Handle>
  );
}

export {Position};