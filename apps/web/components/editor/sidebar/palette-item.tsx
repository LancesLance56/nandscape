"use client";

import type React from "react";
import type {EditorNodeKind} from "@/types/editor";

export interface PaletteEntry {
  kind: EditorNodeKind;
  gateType?: number;
  blockId?: string;
  label: string;
  symbol: string;
  color?: string;
}

export const PALETTE_DRAG_MIME = "application/nandscape-node";

export function PaletteItem({ entry, onDelete }: { entry: PaletteEntry; onDelete?: () => void }) {
  const handleDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData(PALETTE_DRAG_MIME, JSON.stringify(entry));
    event.dataTransfer.effectAllowed = "move";
  };
    const swatchClass = entry.color
    ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-bold text-white"
    : "flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-2 font-mono text-[11px] font-bold text-copper-dark";

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="group relative flex cursor-grab items-center gap-2.5 rounded-lg border border-border bg-surface-card px-3 py-2 text-sm font-medium text-ink shadow-sm transition-all hover:border-border-strong hover:shadow-md active:cursor-grabbing active:scale-[0.98]"
    >
      <span className={swatchClass} style={entry.color ? { backgroundColor: entry.color } : undefined}>
        {entry.symbol}
      </span>
      {entry.label}
      {onDelete && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          aria-label={`Delete ${entry.label}`}
          className="absolute right-1.5 top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-surface-2 text-[9px] text-ink-soft hover:text-signal-coral group-hover:flex"
        >
          ✕
        </button>
      )}
    </div>
  );
}