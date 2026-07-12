"use client";

import {useReactFlow} from "@xyflow/react";

export function CanvasControls() {
  const {zoomIn, zoomOut, fitView} = useReactFlow();

  return (
    <div
      className="absolute bottom-4 left-4 z-10 flex items-center gap-0.5 rounded-xl border border-border bg-surface-card p-1 shadow-md">
      <button
        type="button"
        aria-label="Zoom out"
        onClick={() => zoomOut({duration: 150})}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
      >
        −
      </button>
      <button
        type="button"
        aria-label="Fit view"
        onClick={() => fitView({duration: 200, padding: 0.2})}
        className="flex h-7 items-center justify-center rounded-lg px-2 font-mono text-[11px] font-semibold text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
      >
        FIT
      </button>
      <button
        type="button"
        aria-label="Zoom in"
        onClick={() => zoomIn({duration: 150})}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
      >
        +
      </button>
    </div>
  );
}
