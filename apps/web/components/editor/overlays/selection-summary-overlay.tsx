"use client";

import { useEditorStore } from "@/store/editor-store";

/**
 * overlays/ hosts anything absolutely-positioned *over* the canvas that
 * isn't part of React Flow itself — selection summaries, minimaps, sim
 * status toasts, measurement rulers. Each overlay is a small independent
 * component so the canvas doesn't accumulate unrelated UI concerns.
 */
export function SelectionSummaryOverlay() {
  const selection = useEditorStore((s) => s.selection);
  const count = selection.nodeIds.length + selection.edgeIds.length;

  if (count === 0) return null;

  return (
    <div className="absolute right-4 top-4 z-10 rounded-full border border-border bg-surface-card px-3 py-1.5 font-mono text-[11px] font-semibold text-ink-soft shadow-md">
      {count} selected
    </div>
  );
}
