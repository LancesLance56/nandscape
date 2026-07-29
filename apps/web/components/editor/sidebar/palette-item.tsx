"use client";

import type React from "react";
import type { GateType } from "@nandscape/engine";
import type { EditorNodeKind } from "@/types/editor";

export interface PaletteEntry {
  kind: EditorNodeKind;
  gateType?: GateType;
  blockId?: string;
  label: string;
  symbol: string;
  color?: string;
}

export const PALETTE_DRAG_MIME = "application/nandscape-node";

function BanIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="8" cy="8" r="6" />
      <path d="M4 4L12 12" strokeLinecap="round" />
    </svg>
  );
}

export function PaletteItem({
  entry,
  onDeleteAction,
  disabled = false,
  disabledReason,
}: {
  entry: PaletteEntry;
  onDeleteAction?: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const handleDragStart = (event: React.DragEvent) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData(PALETTE_DRAG_MIME, JSON.stringify(entry));
    event.dataTransfer.effectAllowed = "move";
  };

  const swatchClass = entry.color
    ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-bold text-white shadow-sm ring-1 ring-black/5"
    : "flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-2 font-mono text-[11px] font-bold text-copper-dark";

  return (
    <div
      draggable={!disabled}
      onDragStart={handleDragStart}
      title={disabled ? disabledReason : undefined}
      aria-disabled={disabled}
      className={`group relative flex w-fit shrink-0 items-center gap-2.5 rounded-lg border px-3 py-2 min-w-25 text-base font-medium shadow-sm transition-all ${
        disabled
          ? "cursor-not-allowed border-border bg-surface-2/50 text-ink-soft/60 grayscale"
          : "cursor-grab border-border bg-surface-card text-ink hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md active:cursor-grabbing active:translate-y-0 active:scale-[0.98]"
      }`}
    >
      <span className={swatchClass} style={entry.color ? { backgroundColor: entry.color } : undefined}>
        {entry.symbol}
      </span>
      <span className="whitespace-nowrap">{entry.label}</span>

      {disabled && (
        <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-surface-card text-signal-coral shadow-sm">
          <BanIcon />
        </span>
      )}

      {onDeleteAction && !disabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteAction();
          }}
          aria-label={`Delete ${entry.label}`}
          className="absolute right-1.5 top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-surface-2 text-[9px] text-ink-soft hover:text-signal-coral group-hover:flex"
        >
          ✕
        </button>
      )}
    </div>
  );
}