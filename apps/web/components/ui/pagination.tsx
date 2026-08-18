"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

export const PAGE_SIZES = [10, 25, 50] as const;
export type PageSize = (typeof PAGE_SIZES)[number] | "all";

/**
 * Page numbers with ellipses, never more than about nine slots wide.
 *
 * Always shows the first and last page so the ends of the list stay one click
 * away, and a window around the current page so the neighbours do too.
 */
export function pageItems(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const items: (number | "gap")[] = [1];
  const from = Math.max(2, current - 1);
  const to = Math.min(total - 1, current + 1);

  if (from > 2) items.push("gap");
  for (let p = from; p <= to; p++) items.push(p);
  if (to < total - 1) items.push("gap");

  items.push(total);
  return items;
}

const BUTTON =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-35";

export function Pagination({
  page,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  /** Total rows before slicing, for the "showing x–y of z" line. */
  totalItems,
  className,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: PageSize;
  onPageSizeChange: (size: PageSize) => void;
  totalItems: number;
  className?: string;
}) {
  const perPage = pageSize === "all" ? totalItems : pageSize;
  const first = totalItems === 0 ? 0 : (page - 1) * perPage + 1;
  const last = pageSize === "all" ? totalItems : Math.min(page * perPage, totalItems);

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <p className="text-xs text-slate">
        {totalItems === 0 ? "No results" : `Showing ${first}–${last} of ${totalItems}`}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-slate">
          Per page
          <select
            value={String(pageSize)}
            onChange={(e) => onPageSizeChange(e.target.value === "all" ? "all" : (Number(e.target.value) as PageSize))}
            className="rounded-lg border border-border-strong bg-surface-card px-2 py-1 text-xs text-ink outline-none transition-colors focus:border-copper"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
            <option value="all">All</option>
          </select>
        </label>

        {totalPages > 1 && (
          <nav className="flex items-center gap-1" aria-label="Pagination">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
              className={cn(BUTTON, "border-border-strong text-ink-soft hover:bg-surface-2 hover:text-ink")}
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            </button>

            {pageItems(page, totalPages).map((item, i) =>
              item === "gap" ? (
                <span key={`gap-${i}`} className="px-1 text-xs text-slate" aria-hidden>
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => onPageChange(item)}
                  aria-current={item === page ? "page" : undefined}
                  className={cn(
                    BUTTON,
                    item === page
                      ? "border-copper bg-copper-bg text-copper-dark"
                      : "border-border-strong text-ink-soft hover:bg-surface-2 hover:text-ink",
                  )}
                >
                  {item}
                </button>
              ),
            )}

            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              aria-label="Next page"
              className={cn(BUTTON, "border-border-strong text-ink-soft hover:bg-surface-2 hover:text-ink")}
            >
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
