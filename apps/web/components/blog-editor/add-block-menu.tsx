"use client";

import { useEffect, useRef, useState } from "react";
import { creatableBlockTypes } from "@/lib/blog-editor/block-registry";
import { BLOCK_ACCENT } from "@/lib/blog-editor/block-accent";
import { createInsertBlockCommand } from "@/lib/blog-editor/commands";
import { useCommandDispatch } from "@/hooks/use-command";

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M8 3v10M3 8h10" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Two looks, one component: `icon` is the compact trigger that lives in
 * each BlockCard's hover gutter (inserts above that block) - see
 * block-card.tsx. `default` is the single trailing control at the end of
 * the list in block-list.tsx, for appending or starting from empty. There
 * used to be one of these rendered between every pair of blocks; now
 * there's exactly one per block (hover-only) plus one at the end.
 */
export function AddBlockMenu({
  atIndex,
  variant = "default",
  onOpenChange,
}: {
  atIndex: number;
  variant?: "icon" | "default";
  /**
   * The `icon` variant lives inside block-card.tsx's hover-only gutter - if
   * the dropdown opens below a short block (a divider, say), moving the
   * cursor down into it exits the parent's hover rect and CSS would fade
   * the whole gutter out from under an open menu. This lets the parent keep
   * the gutter visible for as long as the menu itself is open.
   */
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpenState] = useState(false);
  const dispatch = useCommandDispatch();
  const containerRef = useRef<HTMLDivElement>(null);

  const setOpen = (next: boolean | ((prev: boolean) => boolean)) =>
    setOpenState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      onOpenChange?.(value);
      return value;
    });

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${variant === "default" ? "flex" : "inline-flex"}`}>
      {variant === "icon" ? (
        <button
          type="button"
          aria-label="Insert block above"
          title="Insert block above"
          onClick={() => setOpen((o) => !o)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-border-strong transition-colors hover:bg-surface hover:text-ink-soft"
        >
          <PlusIcon />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold text-slate transition-colors hover:bg-surface-2 hover:text-copper-dark"
        >
          <PlusIcon />
          Add block
        </button>
      )}
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 flex w-56 flex-col gap-0.5 rounded-lg border border-border bg-surface-card p-1.5 shadow-lg">
          {creatableBlockTypes.map((definition) => {
            const accent = BLOCK_ACCENT[definition.type];
            return (
              <button
                key={definition.type}
                type="button"
                onClick={() => {
                  dispatch(createInsertBlockCommand(definition.createDefault(), atIndex, `Add ${definition.label}`));
                  setOpen(false);
                }}
                className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-ink hover:bg-surface-2"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: accent ?? "var(--border-strong)" }}
                />
                {definition.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
