"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import type { PuzzleSpec } from "@/types/puzzle";
import { DifficultyTag } from "./difficulty-tag";
import { PuzzleFilterPanel } from "./puzzle-filter-panel";
import { Pagination, type PageSize } from "@/components/ui/pagination";
import { DEFAULT_BLOCK_COLORS, hexToRgba } from "@/lib/editor/block-colors";
import { usePuzzleProgressStore } from "@/store/puzzle-progress-store";
import { shuffleDeterministic } from "@/lib/puzzles/puzzle-display";
import {
  EMPTY_FILTERS,
  activeChips,
  applyPuzzleFilters,
  countActive,
  formatRestriction,
  type PuzzleFilterState,
} from "@/lib/puzzles/puzzle-filters";
import { cn } from "@/lib/cn";

function tagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) >>> 0;
  return DEFAULT_BLOCK_COLORS[hash % DEFAULT_BLOCK_COLORS.length];
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-3 w-3" aria-hidden="true">
      <path d="M4 10.5 8 14.5 16 5.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
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

function ProgressRing({ solved, total, signedOut }: { solved: number; total: number; signedOut: boolean }) {
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
      {complete && <span className="relative z-10 text-signal-green-strong"><CheckIcon /></span>}
    </span>
  );
}

export function PuzzleList({ puzzles, dailyPuzzleSlug }: { puzzles: PuzzleSpec[]; dailyPuzzleSlug?: string }) {
  const router = useRouter();
  const [filters, setFiltersRaw] = useState<PuzzleFilterState>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(25);

  // Every filter change goes through here so the view returns to page 1.
  // Doing that in an effect would trip the repo's set-state-in-effect rule,
  // and would also flash a page of stale rows before correcting itself.
  const setFilters = useCallback((next: PuzzleFilterState) => {
    setFiltersRaw(next);
    setPage(1);
  }, []);

  // Deliberately not sorted by difficulty: order is scrambled once, based on
  // slug identity, so it looks mixed up but stays put across renders/filters
  // and matches between server and client.
  const shuffled = useMemo(() => shuffleDeterministic(puzzles, (p) => p.slug), [puzzles]);

  const progressStatus = usePuzzleProgressStore((s) => s.status);
  const progressBySlug = usePuzzleProgressStore((s) => s.bySlug);
  const loadAllProgress = usePuzzleProgressStore((s) => s.loadAll);
  const signedOut = progressStatus === "signed-out";

  useEffect(() => {
    void loadAllProgress();
  }, [loadAllProgress]);

  const isSolved = useCallback(
    (slug: string) => progressBySlug[slug]?.solved === true,
    [progressBySlug],
  );

  const solvedCount = useMemo(
    () => puzzles.filter((p) => isSolved(p.slug)).length,
    [puzzles, isSolved],
  );

  const tagOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const puzzle of puzzles) {
      for (const tag of puzzle.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag]) => tag);
  }, [puzzles]);

  const filtered = useMemo(
    () => applyPuzzleFilters(shuffled, filters, isSolved),
    [shuffled, filters, isSolved],
  );

  const chips = activeChips(filters);
  const activeCount = countActive(filters);

  // Clamped during render rather than corrected in an effect: filtering can
  // shrink the list under the current page at any time, and a page number
  // past the end should simply resolve to the last page.
  const perPage = pageSize === "all" ? Math.max(filtered.length, 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * perPage;
  const visible = filtered.slice(start, start + perPage);

  const removeChip = (group: keyof PuzzleFilterState, value: string) => {
    const current = filters[group] as unknown as string[];
    setFilters({ ...filters, [group]: current.filter((v) => v !== value) });
  };

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
              placeholder="Search logic problems…"
              aria-label="Search logic problems"
              className="w-full rounded-xl border border-border-strong bg-surface-card py-2.5 pl-10 pr-3 text-sm text-ink outline-none transition-colors focus:border-copper"
            />
          </div>

          <div className="flex shrink-0 items-center gap-2 text-xs text-slate">
            <ProgressRing solved={solvedCount} total={puzzles.length} signedOut={signedOut} />
            {solvedCount} / {puzzles.length} solved
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
                onClick={() => removeChip(chip.group, chip.value)}
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

        <div className="overflow-hidden rounded-2xl border border-border bg-surface-card">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-surface-2 text-[11px] text-slate">
                <th className="w-10 px-4 py-3" aria-label="Status" />
                <th className="px-4 py-3">Title</th>
                <th className="hidden px-4 py-3 md:table-cell">Topics</th>
                <th className="hidden px-4 py-3 lg:table-cell">Constraint</th>
                <th className="px-4 py-3 text-right">Difficulty</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((puzzle, index) => (
                <tr
                  key={puzzle.slug}
                  onClick={() => router.push(`/puzzles/${puzzle.slug}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/puzzles/${puzzle.slug}`);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer border-t border-border transition-colors hover:bg-surface-2/60 focus-visible:bg-surface-2/60 focus-visible:outline-none"
                >
                  <td className="px-4 py-3">
                    <StatusDot solved={isSolved(puzzle.slug)} signedOut={signedOut} />
                  </td>
                  <td className="px-4 py-3">
                    <p className="flex items-center gap-2 font-semibold text-ink">
                      {start + index + 1}. {puzzle.title}
                      {puzzle.slug === dailyPuzzleSlug && (
                        <span className="rounded-full bg-copper/15 px-2 py-0.5 text-[10px] font-semibold text-copper-dark">
                          Today
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-ink-soft">{puzzle.description}</p>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <div className="flex flex-wrap gap-1.5">
                      {puzzle.tags.map((tag) => {
                        const color = tagColor(tag);
                        const active = filters.tags.includes(tag);
                        return (
                          <span
                            key={tag}
                            style={{ backgroundColor: hexToRgba(color, active ? 0.3 : 0.14), color }}
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-medium",
                              active && "ring-1 ring-inset",
                            )}
                          >
                            {tag}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-slate lg:table-cell">
                    {formatRestriction(puzzle)}
                    {puzzle.gateBudget !== null && (
                      <span className="text-border-strong"> · budget {puzzle.gateBudget}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DifficultyTag difficulty={puzzle.difficulty} />
                  </td>
                </tr>
              ))}

              {visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
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

        {totalPages > 1 && (
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
        )}
      </div>

      <PuzzleFilterPanel
        puzzles={shuffled}
        filters={filters}
        setFilters={setFilters}
        isSolved={isSolved}
        tagOptions={tagOptions}
        signedOut={signedOut}
        onReset={() => setFilters(EMPTY_FILTERS)}
        activeCount={activeCount}
      />
    </div>
  );
}
