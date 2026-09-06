"use client";

/**
 * The status strip: pages on the left, zoom on the right.
 *
 * Both used to be somewhere else - pages in a tab row above the canvas, zoom
 * floating over the bottom-right corner of it. Neither belongs on top of the
 * drawing. A strip under the canvas costs 30px once and stops the page tabs
 * from reading like browser tabs, which is what they looked like sitting
 * directly above a white sheet.
 */

import { useState } from "react";
import { Layers, Maximize2, Minus, Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/cn";
import { useEditor } from "@/lib/flowchart-editor/store";

export function BottomBar() {
  const doc = useEditor((s) => s.doc);
  const index = useEditor((s) => s.pageIndex);
  const goto = useEditor((s) => s.gotoPage);
  const addPage = useEditor((s) => s.addPage);
  const removePage = useEditor((s) => s.removePage);
  const renamePage = useEditor((s) => s.renamePage);
  const viewport = useEditor((s) => s.viewport);
  const zoomTo = useEditor((s) => s.zoomTo);
  const setViewport = useEditor((s) => s.setViewport);
  const page = doc.pages[Math.min(index, doc.pages.length - 1)];
  const [renaming, setRenaming] = useState<number | null>(null);

  const fit = () => {
    const host = document.querySelector<HTMLElement>("[data-fe-surface]");
    if (!host) return;
    const zoom = Math.max(
      0.1,
      Math.min(2, (host.clientWidth - 64) / page.width, (host.clientHeight - 64) / page.height),
    );
    setViewport({
      zoom,
      x: Math.round((host.clientWidth - page.width * zoom) / 2),
      y: Math.round((host.clientHeight - page.height * zoom) / 2),
    });
  };

  return (
    <footer className="flex h-8 shrink-0 items-center gap-1 border-t border-fe-line bg-fe-panel px-2">
      <Layers className="h-3.5 w-3.5 shrink-0 text-fe-muted" />
      <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
        {doc.pages.map((p, i) =>
          renaming === i ? (
            <input
              key={p.id}
              autoFocus
              defaultValue={p.name}
              onBlur={(e) => {
                renamePage(i, e.target.value.trim() || p.name);
                setRenaming(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setRenaming(null);
              }}
              className="h-5 w-24 rounded border border-fe-accent bg-fe-field px-1.5 text-[11px] outline-none"
            />
          ) : (
            <span key={p.id} className="group relative flex items-center">
              <button
                type="button"
                onClick={() => goto(i)}
                onDoubleClick={() => setRenaming(i)}
                title={`${p.name} — double-click to rename`}
                className={cn(
                  "h-5 rounded px-2 text-[11px] transition-colors",
                  i === index
                    ? "bg-fe-accent-soft font-semibold text-fe-accent-strong"
                    : "text-fe-muted hover:bg-fe-hover hover:text-fe-ink",
                )}
              >
                {p.name}
              </button>
              {doc.pages.length > 1 && i === index && (
                <button
                  type="button"
                  onClick={() => removePage(i)}
                  aria-label={`Delete ${p.name}`}
                  className="rounded p-0.5 text-fe-muted opacity-0 transition-opacity hover:text-fe-ink group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </span>
          ),
        )}
        <button
          type="button"
          onClick={addPage}
          aria-label="Add a page"
          title="Add a page"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-fe-muted hover:bg-fe-hover hover:text-fe-ink"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={fit}
          title="Fit the page in the window"
          className="flex h-5 w-5 items-center justify-center rounded text-fe-muted hover:bg-fe-hover hover:text-fe-ink"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => zoomTo(viewport.zoom / 1.25)}
          aria-label="Zoom out"
          className="flex h-5 w-5 items-center justify-center rounded text-fe-muted hover:bg-fe-hover hover:text-fe-ink"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <input
          type="range"
          min={10}
          max={400}
          step={5}
          value={Math.round(viewport.zoom * 100)}
          onChange={(e) => zoomTo(Number(e.target.value) / 100)}
          aria-label="Zoom"
          className="h-1 w-24 cursor-pointer accent-[var(--fe-accent)]"
        />
        <button
          type="button"
          onClick={() => zoomTo(viewport.zoom * 1.25)}
          aria-label="Zoom in"
          className="flex h-5 w-5 items-center justify-center rounded text-fe-muted hover:bg-fe-hover hover:text-fe-ink"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => zoomTo(1)}
          title="Reset to 100%"
          className="w-10 text-right text-[11px] tabular-nums text-fe-ink hover:underline"
        >
          {Math.round(viewport.zoom * 100)}%
        </button>
      </div>
    </footer>
  );
}
