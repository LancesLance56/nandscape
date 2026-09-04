"use client";

import { ChevronDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import {
  DIFFICULTY_ORDER,
  SOLVED_LABELS,
  toggleValue,
  type FacetDef,
  type ProblemFilterState,
  type ProblemItem,
  type ProgressKind,
  type SortDef,
} from "@/lib/problems/problem-filters";

/**
 * The filter sidebar, shared by every problem list.
 *
 * Every dimension is a labelled group rather than a loose row of pills, the
 * trigger says how many options in that group are on, and each option carries
 * how many problems it would leave.
 *
 * Difficulty, topic and progress are built in because every problem list has
 * them; anything else arrives as a `FacetDef`, which is how one panel serves
 * both gate constraints and languages without knowing what either is.
 */

function FilterGroup({
  label,
  options,
  selected,
  onToggle,
  count,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  count: (value: string) => number;
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

export function ProblemFilterPanel<T extends ProblemItem>({
  filters,
  setFilters,
  facets,
  sorts,
  tagOptions,
  countFor,
  signedOut,
  onReset,
  activeCount,
  sortName,
}: {
  filters: ProblemFilterState;
  setFilters: (next: ProblemFilterState) => void;
  facets: FacetDef<T>[];
  sorts: SortDef<T>[];
  tagOptions: string[];
  countFor: (group: string, value: string) => number;
  signedOut: boolean;
  onReset: () => void;
  activeCount: number;
  /** Radio group name, so two lists on one page would not share state. */
  sortName: string;
}) {
  const toggle = (group: string, value: string) => setFilters(toggleValue(filters, group, value));

  return (
    <aside className="flex flex-col gap-3">
      <FilterGroup
        label="All difficulties"
        options={DIFFICULTY_ORDER.map((d) => ({ value: d, label: d[0].toUpperCase() + d.slice(1) }))}
        selected={filters.difficulties}
        onToggle={(v) => toggle("difficulties", v)}
        count={(v) => countFor("difficulties", v)}
      />

      <FilterGroup
        label="All topics"
        options={tagOptions.map((t) => ({ value: t, label: t }))}
        selected={filters.tags}
        onToggle={(v) => toggle("tags", v)}
        count={(v) => countFor("tags", v)}
      />

      {facets.map((facet) => (
        <FilterGroup
          key={facet.id}
          label={facet.label}
          options={facet.options}
          selected={filters.facets[facet.id] ?? []}
          onToggle={(v) => toggle(facet.id, v)}
          count={(v) => countFor(facet.id, v)}
        />
      ))}

      {/* Progress filters are meaningless with no account to have progress in,
          so they are hidden rather than shown always returning everything. */}
      {!signedOut && (
        <div className="rounded-xl border border-border bg-surface-card p-3.5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate">
            Your progress
          </p>
          <div className="flex flex-col gap-0.5">
            {(Object.keys(SOLVED_LABELS) as ProgressKind[]).map((k) => (
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
          {sorts.map((opt) => (
            <label
              key={opt.key}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm text-ink transition-colors hover:bg-surface-2"
            >
              <input
                type="radio"
                name={sortName}
                checked={filters.sort === opt.key}
                onChange={() => setFilters({ ...filters, sort: opt.key })}
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
