"use client";

import { ChevronDown, X } from "lucide-react";
import type { PuzzleDifficulty, PuzzleSpec } from "@/types/puzzle";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import {
  BUDGET_LABELS,
  DIFFICULTY_ORDER,
  RESTRICTION_LABELS,
  SOLVED_LABELS,
  SORT_OPTIONS,
  countFor,
  type BudgetKind,
  type PuzzleFilterState,
  type PuzzleSortKey,
  type RestrictionKind,
  type SolvedKind,
} from "@/lib/puzzles/puzzle-filters";

/**
 * The filter sidebar.
 *
 * Every dimension is a labelled group rather than a loose row of pills, the
 * trigger says how many options in that group are on, and each option carries
 * the number of puzzles it would leave. The old version showed one flat wall
 * of every tag in the database with no indication of what was selected.
 */

interface Option<T extends string> {
  value: T;
  label: string;
}

function FilterGroup<T extends string>({
  label,
  options,
  selected,
  onToggle,
  count,
}: {
  label: string;
  options: Option<T>[];
  selected: T[];
  onToggle: (value: T) => void;
  /** Problems left if this option were the only one on in its group. */
  count: (value: T) => number;
}) {
  const on = selected.length;

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-sm transition-colors",
          on > 0
            ? "border-copper bg-copper-bg/50 text-copper-dark"
            : "border-border-strong bg-surface-card text-ink-soft hover:text-ink",
        )}
      >
        <span className="truncate font-medium">
          {label}
          {on > 0 && <span className="ml-1.5 tabular-nums opacity-80">({on})</span>}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
      </PopoverTrigger>

      <PopoverContent className="w-64 p-1.5">
        <div className="flex max-h-72 flex-col overflow-y-auto">
          {options.map((opt) => {
            const checked = selected.includes(opt.value);
            const n = count(opt.value);
            return (
              <label
                key={opt.value}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-surface-2",
                  n === 0 && !checked && "opacity-45",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(opt.value)}
                  className="h-3.5 w-3.5 shrink-0 accent-copper"
                />
                <span className="min-w-0 flex-1 truncate text-ink">{opt.label}</span>
                <span className="shrink-0 text-xs tabular-nums text-slate">{n}</span>
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function PuzzleFilterPanel({
  puzzles,
  filters,
  setFilters,
  isSolved,
  tagOptions,
  signedOut,
  onReset,
  activeCount,
}: {
  puzzles: PuzzleSpec[];
  filters: PuzzleFilterState;
  setFilters: (next: PuzzleFilterState) => void;
  isSolved: (slug: string) => boolean;
  /** Tags in descending frequency, so the common ones are reachable first. */
  tagOptions: string[];
  signedOut: boolean;
  onReset: () => void;
  activeCount: number;
}) {
  const toggle = <K extends keyof PuzzleFilterState>(group: K, value: string) => {
    const current = filters[group] as unknown as string[];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    setFilters({ ...filters, [group]: next });
  };

  const count = <K extends keyof PuzzleFilterState>(group: K) => (value: string) =>
    countFor(puzzles, filters, isSolved, group, value as never);

  return (
    <aside className="flex flex-col gap-3">
      <FilterGroup<PuzzleDifficulty>
        label="All difficulties"
        options={DIFFICULTY_ORDER.map((d) => ({ value: d, label: d[0].toUpperCase() + d.slice(1) }))}
        selected={filters.difficulties}
        onToggle={(v) => toggle("difficulties", v)}
        count={count("difficulties")}
      />

      <FilterGroup<string>
        label="All topics"
        options={tagOptions.map((t) => ({ value: t, label: t }))}
        selected={filters.tags}
        onToggle={(v) => toggle("tags", v)}
        count={count("tags")}
      />

      <FilterGroup<RestrictionKind>
        label="All constraints"
        options={(Object.keys(RESTRICTION_LABELS) as RestrictionKind[]).map((k) => ({
          value: k,
          label: RESTRICTION_LABELS[k],
        }))}
        selected={filters.restrictions}
        onToggle={(v) => toggle("restrictions", v)}
        count={count("restrictions")}
      />

      <FilterGroup<BudgetKind>
        label="All budgets"
        options={(Object.keys(BUDGET_LABELS) as BudgetKind[]).map((k) => ({
          value: k,
          label: BUDGET_LABELS[k],
        }))}
        selected={filters.budgets}
        onToggle={(v) => toggle("budgets", v)}
        count={count("budgets")}
      />

      {/* Progress filters are meaningless when there is no account to have
          progress in, so they are hidden rather than shown always returning
          everything. */}
      {!signedOut && (
        <div className="rounded-xl border border-border bg-surface-card p-3.5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate">Your progress</p>
          <div className="flex flex-col gap-0.5">
            {(Object.keys(SOLVED_LABELS) as SolvedKind[]).map((k) => (
              <label
                key={k}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm text-ink transition-colors hover:bg-surface-2"
              >
                <input
                  type="checkbox"
                  checked={filters.solved.includes(k)}
                  onChange={() => toggle("solved", k)}
                  className="h-3.5 w-3.5 accent-copper"
                />
                {SOLVED_LABELS[k]}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface-card p-3.5">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate">Sort by</p>
        <div className="flex flex-col gap-0.5">
          {SORT_OPTIONS.map((opt) => (
            <label
              key={opt.key}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm text-ink transition-colors hover:bg-surface-2"
            >
              <input
                type="radio"
                name="puzzle-sort"
                checked={filters.sort === opt.key}
                onChange={() => setFilters({ ...filters, sort: opt.key as PuzzleSortKey })}
                className="h-3.5 w-3.5 accent-copper"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onReset}
        disabled={activeCount === 0}
        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border-strong bg-surface-card px-4 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
        Reset filters{activeCount > 0 && ` (${activeCount})`}
      </button>
    </aside>
  );
}
