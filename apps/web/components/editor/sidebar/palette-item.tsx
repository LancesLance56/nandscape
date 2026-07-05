"use client";

import type React from "react";
import type { EditorNodeKind } from "@/types/editor";

export interface PaletteEntry {
  kind: EditorNodeKind;
  gateType?: number;
  label: string;
  symbol: string;
}

export const PALETTE_DRAG_MIME = "application/nandscape-node";

export function PaletteItem({ entry }: { entry: PaletteEntry }) {
  const handleDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData(PALETTE_DRAG_MIME, JSON.stringify(entry));
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex cursor-grab items-center gap-2.5 rounded-lg border border-border bg-surface-card px-3 py-2 text-sm font-medium text-ink shadow-sm transition-all hover:border-border-strong hover:shadow-md active:cursor-grabbing active:scale-[0.98]"
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-2 font-mono text-[11px] font-bold text-copper-dark">
        {entry.symbol}
      </span>
      {entry.label}
    </div>
  );
}
