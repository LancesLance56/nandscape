"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Circle, CircleDot, Search } from "lucide-react";
import { DifficultyTag } from "@/components/puzzles/difficulty-tag";
import type { PracticeSpec, PracticeDifficulty, PracticeLanguage } from "@/types/practice";
import {
  allTags,
  countsFor,
  DIFFICULTY_ORDER,
  EMPTY_FILTERS,
  filterPractices,
  hasActiveFilters,
  SOLVED_LABELS,
  SORT_OPTIONS,
  type PracticeFilterState,
  type PracticeSortKey,
  type SolvedKind,
} from "@/lib/practice/practice-filters";

const LANGUAGE_LABELS: Record<PracticeLanguage, string> = {
  python: "Python",
  javascript: "JavaScript",
  cpp: "C++",
};

interface PracticeListProps {
  practices: PracticeSpec[];
  solvedSlugs: string[];
  attemptedSlugs: string[];
}

export function PracticeList({ practices, solvedSlugs, attemptedSlugs }: PracticeListProps) {
  const [filters, setFilters] = useState<PracticeFilterState>(EMPTY_FILTERS);

  const progressOf = useMemo(() => {
    const solved = new Set(solvedSlugs);
    const attempted = new Set(attemptedSlugs);
    return (slug: string): SolvedKind =>
      solved.has(slug) ? "solved" : attempted.has(slug) ? "attempted" : "unsolved";
  }, [solvedSlugs, attemptedSlugs]);

  const visible = useMemo(
    () => filterPractices(practices, filters, progressOf),
    [practices, filters, progressOf],
  );

  const difficultyCounts = useMemo(
    () => countsFor(practices, filters, "difficulties", (p) => [p.difficulty], progressOf),
    [practices, filters, progressOf],
  );
  const languageCounts = useMemo(
    () => countsFor(practices, filters, "languages", (p) => p.languages, progressOf),
    [practices, filters, progressOf],
  );
  const tagCounts = useMemo(
    () => countsFor(practices, filters, "tags", (p) => p.tags, progressOf),
    [practices, filters, progressOf],
  );
  const solvedCounts = useMemo(
    () => countsFor(practices, filters, "solved", (p) => [progressOf(p.slug)], progressOf),
    [practices, filters, progressOf],
  );

  const toggle = <K extends keyof PracticeFilterState>(
    facet: K,
    value: PracticeFilterState[K] extends (infer T)[] ? T : never,
  ) => {
    setFilters((current) => {
      const list = current[facet] as unknown[];
      const next = list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value];
      return { ...current, [facet]: next };
    });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="space-y-6">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft" />
          <input
            type="search"
            value={filters.query}
            onChange={(event) => setFilters((c) => ({ ...c, query: event.target.value }))}
            placeholder="Search problems"
            className="w-full rounded-md border border-border bg-surface-2 py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-soft"
          />
        </label>

        <FilterGroup title="Difficulty">
          {DIFFICULTY_ORDER.map((difficulty) => (
            <FilterOption
              key={difficulty}
              label={difficulty[0].toUpperCase() + difficulty.slice(1)}
              count={difficultyCounts[difficulty] ?? 0}
              active={filters.difficulties.includes(difficulty)}
              onToggle={() => toggle("difficulties", difficulty as PracticeDifficulty)}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Language">
          {(Object.keys(LANGUAGE_LABELS) as PracticeLanguage[])
            .filter((id) => (languageCounts[id] ?? 0) > 0 || filters.languages.includes(id))
            .map((id) => (
              <FilterOption
                key={id}
                label={LANGUAGE_LABELS[id]}
                count={languageCounts[id] ?? 0}
                active={filters.languages.includes(id)}
                onToggle={() => toggle("languages", id)}
              />
            ))}
        </FilterGroup>

        <FilterGroup title="Progress">
          {(Object.keys(SOLVED_LABELS) as SolvedKind[]).map((kind) => (
            <FilterOption
              key={kind}
              label={SOLVED_LABELS[kind]}
              count={solvedCounts[kind] ?? 0}
              active={filters.solved.includes(kind)}
              onToggle={() => toggle("solved", kind)}
            />
          ))}
        </FilterGroup>

        {allTags(practices).length > 0 && (
          <FilterGroup title="Topic">
            {allTags(practices)
              .filter((tag) => (tagCounts[tag] ?? 0) > 0 || filters.tags.includes(tag))
              .map((tag) => (
                <FilterOption
                  key={tag}
                  label={tag}
                  count={tagCounts[tag] ?? 0}
                  active={filters.tags.includes(tag)}
                  onToggle={() => toggle("tags", tag)}
                />
              ))}
          </FilterGroup>
        )}

        {hasActiveFilters(filters) && (
          <button
            type="button"
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="text-xs font-medium text-copper-dark hover:underline dark:text-copper"
          >
            Clear all filters
          </button>
        )}
      </aside>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-ink-soft">
            {visible.length} of {practices.length} problems
          </p>
          <select
            aria-label="Sort by"
            value={filters.sort}
            onChange={(event) =>
              setFilters((c) => ({ ...c, sort: event.target.value as PracticeSortKey }))
            }
            className="rounded-md border border-border bg-surface-2 px-2 py-1 text-xs text-ink"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {visible.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-6 py-12 text-center text-sm text-ink-soft">
            No problems match those filters.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface-card">
            {visible.map((practice) => (
              <PracticeRow
                key={practice.slug}
                practice={practice}
                progress={progressOf(practice.slug)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function PracticeRow({
  practice,
  progress,
}: {
  practice: PracticeSpec;
  progress: SolvedKind;
}) {
  return (
    <li>
      <Link
        href={`/practices/${practice.slug}`}
        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
      >
        <ProgressIcon progress={progress} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{practice.title}</p>
          {practice.summary && (
            <p className="truncate text-xs text-ink-soft">{practice.summary}</p>
          )}
        </div>
        <div className="hidden shrink-0 gap-1.5 sm:flex">
          {practice.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-surface-3 px-2 py-0.5 text-[0.65rem] text-ink-soft"
            >
              {tag}
            </span>
          ))}
        </div>
        <DifficultyTag difficulty={practice.difficulty} />
      </Link>
    </li>
  );
}

function ProgressIcon({ progress }: { progress: SolvedKind }) {
  if (progress === "solved") {
    return <Check className="h-4 w-4 shrink-0 text-signal-green-strong" aria-label="Solved" />;
  }
  if (progress === "attempted") {
    return <CircleDot className="h-4 w-4 shrink-0 text-copper" aria-label="Attempted" />;
  }
  return <Circle className="h-4 w-4 shrink-0 text-border-strong" aria-label="Not started" />;
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">{title}</h2>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function FilterOption({
  label,
  count,
  active,
  onToggle,
}: {
  label: string;
  count: number;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-xs transition-colors ${
        active ? "bg-copper-bg text-copper-dark dark:text-copper" : "text-ink-soft hover:bg-surface-2"
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums opacity-60">{count}</span>
    </button>
  );
}
