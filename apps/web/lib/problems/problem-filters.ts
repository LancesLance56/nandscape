import type { PuzzleDifficulty } from "@/types/puzzle";

/**
 * Filtering and sorting for any list of practice problems.
 *
 * Logic problems and coding problems are the same thing to a reader browsing
 * them: a titled, tagged, difficulty-graded item they may or may not have
 * solved. The parts that differ - a gate budget on one, a language list on the
 * other - are the *facets* a caller supplies, so the two lists share one
 * implementation instead of two that drift.
 *
 * Everything a facet needs is data: its options, and how to read the values an
 * item matches. No conditional in here knows what a puzzle or a coding problem
 * is.
 */

export type ProgressKind = "solved" | "unsolved";

/** What every browsable problem has, whatever its domain. */
export interface ProblemItem {
  slug: string;
  title: string;
  description: string;
  difficulty: PuzzleDifficulty;
  tags: string[];
}

export interface FacetOption {
  value: string;
  label: string;
}

/** One domain-specific filter group, e.g. "All constraints" or "All languages". */
export interface FacetDef<T> {
  id: string;
  /** Shown on the collapsed trigger. */
  label: string;
  options: FacetOption[];
  /** The option values this item matches; an item matches a facet if any overlap. */
  valuesOf: (item: T) => string[];
}

export interface SortDef<T> {
  key: string;
  label: string;
  /** Omitted for the default, which keeps whatever order the caller passed in. */
  compare?: (a: T, b: T) => number;
}

export interface ProblemFilterState {
  query: string;
  difficulties: string[];
  tags: string[];
  solved: ProgressKind[];
  /** Keyed by FacetDef.id. */
  facets: Record<string, string[]>;
  sort: string;
}

export const DIFFICULTY_ORDER: PuzzleDifficulty[] = ["easy", "medium", "hard", "expert"];

export const DIFFICULTY_RANK: Record<PuzzleDifficulty, number> = {
  easy: 0,
  medium: 1,
  hard: 2,
  expert: 3,
};

export const SOLVED_LABELS: Record<ProgressKind, string> = {
  solved: "Solved",
  unsolved: "Unsolved",
};

export const EMPTY_FILTERS: ProblemFilterState = {
  query: "",
  difficulties: [],
  tags: [],
  solved: [],
  facets: {},
  sort: "default",
};

/** Sorts every problem list offers, before any domain-specific ones. */
export function baseSorts<T extends ProblemItem>(): SortDef<T>[] {
  return [
    { key: "default", label: "Mixed up" },
    {
      key: "easiest",
      label: "Easiest first",
      compare: (a, b) => DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty],
    },
    {
      key: "hardest",
      label: "Hardest first",
      compare: (a, b) => DIFFICULTY_RANK[b.difficulty] - DIFFICULTY_RANK[a.difficulty],
    },
    { key: "title", label: "A to Z", compare: (a, b) => a.title.localeCompare(b.title) },
  ];
}

function selected(filters: ProblemFilterState, group: string): string[] {
  if (group === "difficulties") return filters.difficulties;
  if (group === "tags") return filters.tags;
  if (group === "solved") return filters.solved;
  return filters.facets[group] ?? [];
}

export function withGroup(
  filters: ProblemFilterState,
  group: string,
  values: string[],
): ProblemFilterState {
  if (group === "difficulties") return { ...filters, difficulties: values };
  if (group === "tags") return { ...filters, tags: values };
  if (group === "solved") return { ...filters, solved: values as ProgressKind[] };
  return { ...filters, facets: { ...filters.facets, [group]: values } };
}

export function toggleValue(
  filters: ProblemFilterState,
  group: string,
  value: string,
): ProblemFilterState {
  const current = selected(filters, group);
  return withGroup(
    filters,
    group,
    current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
  );
}

/**
 * Whether one item survives the filters.
 *
 * Within a group the options are OR-ed and between groups they are AND-ed,
 * which is what a reader expects from checkboxes: ticking Easy and Medium
 * widens the result, ticking Easy and Python narrows it.
 */
function matches<T extends ProblemItem>(
  item: T,
  filters: ProblemFilterState,
  facets: FacetDef<T>[],
  isSolved: (slug: string) => boolean,
  skipGroup?: string,
): boolean {
  const needle = filters.query.trim().toLowerCase();
  if (needle && skipGroup !== "query") {
    const haystack = `${item.title} ${item.description} ${item.tags.join(" ")}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  if (skipGroup !== "difficulties" && filters.difficulties.length > 0) {
    if (!filters.difficulties.includes(item.difficulty)) return false;
  }

  if (skipGroup !== "tags" && filters.tags.length > 0) {
    if (!filters.tags.some((tag) => item.tags.includes(tag))) return false;
  }

  if (skipGroup !== "solved" && filters.solved.length > 0) {
    const state: ProgressKind = isSolved(item.slug) ? "solved" : "unsolved";
    if (!filters.solved.includes(state)) return false;
  }

  for (const facet of facets) {
    if (skipGroup === facet.id) continue;
    const chosen = filters.facets[facet.id] ?? [];
    if (chosen.length === 0) continue;
    const values = facet.valuesOf(item);
    if (!chosen.some((value) => values.includes(value))) return false;
  }

  return true;
}

export function applyFilters<T extends ProblemItem>(
  items: T[],
  filters: ProblemFilterState,
  facets: FacetDef<T>[],
  sorts: SortDef<T>[],
  isSolved: (slug: string) => boolean,
): T[] {
  const kept = items.filter((item) => matches(item, filters, facets, isSolved));
  const sort = sorts.find((s) => s.key === filters.sort);
  return sort?.compare ? [...kept].sort(sort.compare) : kept;
}

/**
 * How many problems an option would leave, judged against every *other* group.
 *
 * Counting with its own group excluded is what makes the number honest: a 4
 * means ticking this yields 4 rows, not that 4 exist somewhere behind filters
 * already excluding them.
 */
export function countFor<T extends ProblemItem>(
  items: T[],
  filters: ProblemFilterState,
  facets: FacetDef<T>[],
  isSolved: (slug: string) => boolean,
  group: string,
  value: string,
): number {
  return items.filter((item) => {
    if (!matches(item, filters, facets, isSolved, group)) return false;
    if (group === "difficulties") return item.difficulty === value;
    if (group === "tags") return item.tags.includes(value);
    if (group === "solved") return (isSolved(item.slug) ? "solved" : "unsolved") === value;
    const facet = facets.find((f) => f.id === group);
    return facet ? facet.valuesOf(item).includes(value) : false;
  }).length;
}

export interface ActiveChip {
  group: string;
  value: string;
  label: string;
}

export function activeChips<T>(
  filters: ProblemFilterState,
  facets: FacetDef<T>[],
): ActiveChip[] {
  const chips: ActiveChip[] = [];

  for (const value of filters.difficulties) {
    chips.push({ group: "difficulties", value, label: value[0].toUpperCase() + value.slice(1) });
  }
  for (const value of filters.tags) {
    chips.push({ group: "tags", value, label: value });
  }
  for (const value of filters.solved) {
    chips.push({ group: "solved", value, label: SOLVED_LABELS[value] });
  }
  for (const facet of facets) {
    for (const value of filters.facets[facet.id] ?? []) {
      const option = facet.options.find((o) => o.value === value);
      chips.push({ group: facet.id, value, label: option?.label ?? value });
    }
  }

  return chips;
}

export function countActive<T>(filters: ProblemFilterState, facets: FacetDef<T>[]): number {
  return activeChips(filters, facets).length + (filters.query.trim() ? 1 : 0);
}

/** Tags in descending frequency, so the common ones are reachable first. */
export function tagOptionsFrom<T extends ProblemItem>(items: T[]): string[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const tag of item.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag]) => tag);
}
