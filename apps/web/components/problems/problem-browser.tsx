"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { DifficultyTag } from "@/components/puzzles/difficulty-tag";
import { Pagination, type PageSize } from "@/components/ui/pagination";
import { DEFAULT_BLOCK_COLORS, hexToRgba } from "@/lib/editor/block-colors";
import { ProblemFilterPanel } from "./problem-filter-panel";
import { cn } from "@/lib/cn";
import {
  EMPTY_FILTERS,
  activeChips,
  applyFilters,
  countActive,
  countFor,
  tagOptionsFrom,
  withGroup,
  type FacetDef,
  type ProblemFilterState,
  type ProblemItem,
  type SortDef,
} from "@/lib/problems/problem-filters";

/**
 * The problem list, shared by logic problems and coding problems.
 *
 * Both are the same thing to someone browsing: a searchable, filterable,
 * paginated table of titled and tagged problems with a solved marker. What
 * differs between them is entirely data - the extra filter groups, the extra
 * column, where a row links - so those arrive as props and there is one
 * implementation rather than two that drift apart.
 */

function tagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) >>> 0;
  return DEFAULT_BLOCK_COLORS[hash % DEFAULT_BLOCK_COLORS.length];
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-3 w-3" aria-hidden="true">
      <path
        d="M4 10.5 8 14.5 16 5.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatusDot({ solved, signedOut }: { solved: boolean; signedOut: boolean }) {
  if (solved) {
    return (
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-signal-green text-white">
        <CheckIcon />
      </span>
    );
  }
  return (
    <span
      title={signedOut ? "Sign in to track your progress" : undefined}
      className="inline-flex h-4 w-4 items-center justify-center rounded-full border-2 border-border-strong"
    />
  );
}

function ProgressRing({
  solved,
  total,
  signedOut,
}: {
  solved: number;
  total: number;
  signedOut: boolean;
}) {
  const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
  const complete = total > 0 && solved === total;

  return (
    <span
      title={signedOut ? "Sign in to track your progress" : `${solved} of ${total} solved`}
      className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
      style={{
        background:
          pct > 0
            ? `conic-gradient(var(--signal-green) ${pct}%, var(--border-strong) 0)`
            : "var(--border-strong)",
      }}
    >
      <span className="absolute inset-[2.5px] rounded-full bg-surface-card" />
      {complete && (
        <span className="relative z-10 text-signal-green-strong">
          <CheckIcon />
        </span>
      )}
    </span>
  );
}

/** An extra column between Topics and Difficulty, e.g. constraints or languages. */
export interface ProblemColumn<T> {
  header: string;
  /** Tailwind responsive visibility, so narrow screens can drop it. */
  className?: string;
  render: (item: T) => ReactNode;
}

export function ProblemBrowser<T extends ProblemItem>({
  items,
  hrefFor,
  facets,
  sorts,
  columns = [],
  isSolved,
  signedOut,
  searchLabel,
  sortName,
  badge,
}: {
  /** Already in the order the "Mixed up" sort should present. */
  items: T[];
  hrefFor: (item: T) => string;
  facets: FacetDef<T>[];
  sorts: SortDef<T>[];
  columns?: ProblemColumn<T>[];
  isSolved: (slug: string) => boolean;
  signedOut: boolean;
  /** Used for the placeholder and the aria-label, e.g. "logic problems". */
  searchLabel: string;
  sortName: string;
  /** Optional per-row marker, e.g. the daily problem. */
  badge?: (item: T) => string | null;
}) {
  const router = useRouter();
  const [filters, setFiltersRaw] = useState<ProblemFilterState>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(25);

  // Every filter change goes through here so the view returns to page 1.
  // Doing that in an effect would trip the repo's set-state-in-effect rule,
  // and would also flash a page of stale rows before correcting itself.
  const setFilters = useCallback((next: ProblemFilterState) => {
    setFiltersRaw(next);
    setPage(1);
  }, []);

  const solvedCount = useMemo(
    () => items.filter((item) => isSolved(item.slug)).length,
    [items, isSolved],
  );
  const tagOptions = useMemo(() => tagOptionsFrom(items), [items]);
  const filtered = useMemo(
    () => applyFilters(items, filters, facets, sorts, isSolved),
    [items, filters, facets, sorts, isSolved],
  );

  const chips = activeChips(filters, facets);
  const active = countActive(filters, facets);

  // Clamped during render rather than corrected in an effect: filtering can
  // shrink the list under the current page at any time, and a page number past
  // the end should simply resolve to the last page.
  const perPage = pageSize === "all" ? Math.max(filtered.length, 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * perPage;
  const visible = filtered.slice(start, start + perPage);

  const paginate = (
    <Pagination
      page={currentPage}
      totalPages={totalPages}
      onPageChange={setPage}
      pageSize={pageSize}
      onPageSizeChange={(size) => {
        setPageSize(size);
        setPage(1);
      }}
      totalItems={filtered.length}
    />
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-8">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate">
              <Search className="h-4 w-4" aria-hidden />
            </span>
            <input
              type="search"
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              placeholder={`Search ${searchLabel}…`}
              aria-label={`Search ${searchLabel}`}
              className="w-full rounded-xl border border-border-strong bg-surface-card py-2.5 pl-10 pr-3 text-sm text-ink outline-none transition-colors focus:border-copper"
            />
          </div>

          <div className="flex shrink-0 items-center gap-2 text-xs text-slate">
            <ProgressRing solved={solvedCount} total={items.length} signedOut={signedOut} />
            {solvedCount} / {items.length} solved
          </div>
        </div>

        {/* What is currently on, and one click to take any of it off. The
            sidebar says which groups are active; this says which options. */}
        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {chips.map((chip) => (
              <button
                key={`${chip.group}-${chip.value}`}
                type="button"
                onClick={() =>
                  setFilters(
                    withGroup(
                      filters,
                      chip.group,
                      (chip.group === "difficulties"
                        ? filters.difficulties
                        : chip.group === "tags"
                          ? filters.tags
                          : chip.group === "solved"
                            ? filters.solved
                            : (filters.facets[chip.group] ?? [])
                      ).filter((v) => v !== chip.value),
                    ),
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-full border border-copper bg-copper-bg/60 px-2.5 py-1 text-[11px] font-semibold text-copper-dark transition-colors hover:bg-copper-bg"
              >
                {chip.label}
                <X className="h-3 w-3" aria-hidden />
                <span className="sr-only">Remove filter</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="ml-1 text-[11px] font-semibold text-slate underline-offset-2 hover:text-ink hover:underline"
            >
              Clear all
            </button>
          </div>
        )}

        {paginate}

        <div className="overflow-hidden rounded-2xl border border-border bg-surface-card">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-surface-2 text-[11px] text-slate">
                <th className="w-10 px-4 py-3" aria-label="Status" />
                <th className="px-4 py-3">Title</th>
                <th className="hidden px-4 py-3 md:table-cell">Topics</th>
                {columns.map((column) => (
                  <th key={column.header} className={cn("px-4 py-3", column.className)}>
                    {column.header}
                  </th>
                ))}
                <th className="px-4 py-3 text-right">Difficulty</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item, index) => {
                const href = hrefFor(item);
                const mark = badge?.(item) ?? null;
                return (
                  <tr
                    key={item.slug}
                    onClick={() => router.push(href)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(href);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer border-t border-border transition-colors hover:bg-surface-2/60 focus-visible:bg-surface-2/60 focus-visible:outline-none"
                  >
                    <td className="px-4 py-3">
                      <StatusDot solved={isSolved(item.slug)} signedOut={signedOut} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="flex items-center gap-2 font-semibold text-ink">
                        {start + index + 1}. {item.title}
                        {mark && (
                          <span className="rounded-full bg-copper/15 px-2 py-0.5 text-[10px] font-semibold text-copper-dark">
                            {mark}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-ink-soft">
                        {item.description}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <div className="flex flex-wrap gap-1.5">
                        {item.tags.map((tag) => {
                          const color = tagColor(tag);
                          const on = filters.tags.includes(tag);
                          return (
                            <span
                              key={tag}
                              style={{ backgroundColor: hexToRgba(color, on ? 0.3 : 0.14), color }}
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                                on && "ring-1 ring-inset",
                              )}
                            >
                              {tag}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    {columns.map((column) => (
                      <td
                        key={column.header}
                        className={cn("px-4 py-3 text-xs text-slate", column.className)}
                      >
                        {column.render(item)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <DifficultyTag difficulty={item.difficulty} />
                    </td>
                  </tr>
                );
              })}

              {visible.length === 0 && (
                <tr>
                  <td colSpan={4 + columns.length} className="px-4 py-12 text-center">
                    <p className="text-sm text-ink-soft">No problems match these filters.</p>
                    <button
                      type="button"
                      onClick={() => setFilters(EMPTY_FILTERS)}
                      className="mt-3 text-xs font-semibold text-copper-dark hover:text-copper"
                    >
                      Reset filters
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && paginate}
      </div>

      <ProblemFilterPanel
        filters={filters}
        setFilters={setFilters}
        facets={facets}
        sorts={sorts}
        tagOptions={tagOptions}
        countFor={(group, value) => countFor(items, filters, facets, isSolved, group, value)}
        signedOut={signedOut}
        onReset={() => setFilters(EMPTY_FILTERS)}
        activeCount={active}
        sortName={sortName}
      />
    </div>
  );
}
