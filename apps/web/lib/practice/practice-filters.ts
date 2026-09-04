import type { PracticeDifficulty, PracticeLanguage, PracticeSpec } from "@/types/practice";

/**
 * Filtering and sorting for the practice list, following the shape
 * lib/puzzles/puzzle-filters.ts settled on: the filter state is one object,
 * the predicate is derived from it, and option counts are computed here rather
 * than inside a component's useMemo, so the UI can answer both "what is on?"
 * and "how many would this match?" without re-deriving either.
 */

export type SolvedKind = "solved" | "attempted" | "unsolved";

export type PracticeSortKey = "default" | "easiest" | "hardest" | "title";

export interface PracticeFilterState {
  query: string;
  tags: string[];
  difficulties: PracticeDifficulty[];
  languages: PracticeLanguage[];
  solved: SolvedKind[];
  sort: PracticeSortKey;
}

export const EMPTY_FILTERS: PracticeFilterState = {
  query: "",
  tags: [],
  difficulties: [],
  languages: [],
  solved: [],
  sort: "default",
};

export const DIFFICULTY_ORDER: PracticeDifficulty[] = ["easy", "medium", "hard", "expert"];

const DIFFICULTY_RANK: Record<PracticeDifficulty, number> = {
  easy: 0,
  medium: 1,
  hard: 2,
  expert: 3,
};

export const SORT_OPTIONS: { key: PracticeSortKey; label: string }[] = [
  { key: "default", label: "Recommended" },
  { key: "easiest", label: "Easiest first" },
  { key: "hardest", label: "Hardest first" },
  { key: "title", label: "A to Z" },
];

export const SOLVED_LABELS: Record<SolvedKind, string> = {
  solved: "Solved",
  attempted: "Attempted",
  unsolved: "Not started",
};

/** How the current reader stands on one problem. */
export type ProgressLookup = (slug: string) => SolvedKind;

export function hasActiveFilters(filters: PracticeFilterState): boolean {
  return (
    filters.query.trim().length > 0 ||
    filters.tags.length > 0 ||
    filters.difficulties.length > 0 ||
    filters.languages.length > 0 ||
    filters.solved.length > 0
  );
}

function matches(
  problem: PracticeSpec,
  filters: PracticeFilterState,
  progressOf: ProgressLookup,
): boolean {
  const needle = filters.query.trim().toLowerCase();
  if (needle.length > 0) {
    const haystack = `${problem.title} ${problem.summary} ${problem.tags.join(" ")}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  // Within a facet the options are OR-ed and between facets they are AND-ed,
  // which is what a reader expects from checkbox filters: ticking Easy and
  // Medium widens the result set, ticking Easy and Python narrows it.
  if (filters.difficulties.length > 0 && !filters.difficulties.includes(problem.difficulty)) {
    return false;
  }
  if (filters.tags.length > 0 && !filters.tags.some((tag) => problem.tags.includes(tag))) {
    return false;
  }
  if (
    filters.languages.length > 0 &&
    !filters.languages.some((language) => problem.languages.includes(language))
  ) {
    return false;
  }
  if (filters.solved.length > 0 && !filters.solved.includes(progressOf(problem.slug))) {
    return false;
  }

  return true;
}

export function filterPractices(
  problems: PracticeSpec[],
  filters: PracticeFilterState,
  progressOf: ProgressLookup,
): PracticeSpec[] {
  const kept = problems.filter((problem) => matches(problem, filters, progressOf));

  switch (filters.sort) {
    case "easiest":
      return [...kept].sort(
        (a, b) => DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty],
      );
    case "hardest":
      return [...kept].sort(
        (a, b) => DIFFICULTY_RANK[b.difficulty] - DIFFICULTY_RANK[a.difficulty],
      );
    case "title":
      return [...kept].sort((a, b) => a.title.localeCompare(b.title));
    case "default":
    default:
      return kept;
  }
}

/**
 * How many problems each option would match, holding the other facets fixed.
 *
 * Counting against the *other* filters rather than against everything is what
 * makes the panel honest: an option showing 4 means ticking it yields 4 rows,
 * not that 4 exist somewhere behind filters that are already excluding them.
 */
export function countsFor<K extends string>(
  problems: PracticeSpec[],
  filters: PracticeFilterState,
  facet: keyof PracticeFilterState,
  valuesOf: (problem: PracticeSpec) => K[],
  progressOf: ProgressLookup,
): Record<K, number> {
  const withoutFacet = { ...filters, [facet]: [] } as PracticeFilterState;
  const pool = problems.filter((problem) => matches(problem, withoutFacet, progressOf));

  const counts = {} as Record<K, number>;
  for (const problem of pool) {
    for (const value of valuesOf(problem)) {
      counts[value] = (counts[value] ?? 0) + 1;
    }
  }
  return counts;
}

export function allTags(problems: PracticeSpec[]): string[] {
  const seen = new Set<string>();
  for (const problem of problems) {
    for (const tag of problem.tags) seen.add(tag);
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}
