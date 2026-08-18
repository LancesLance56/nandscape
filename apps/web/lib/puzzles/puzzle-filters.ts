import { gateTypeToString } from "@nandscape/engine";
import type { PuzzleDifficulty, PuzzleSpec } from "@/types/puzzle";

/**
 * Filtering and sorting for the puzzle list.
 *
 * Kept out of the component because the old version buried three ad-hoc
 * `.filter()` calls inside a `useMemo`, which made it impossible to answer the
 * two questions the UI actually needs: which filters are currently on, and how
 * many puzzles each option would match. Both are derived here instead.
 */

export type RestrictionKind = "unrestricted" | "allowed-only" | "disallowed";
export type BudgetKind = "budgeted" | "unbudgeted";
export type SolvedKind = "solved" | "unsolved";

export type PuzzleSortKey =
  | "default"
  | "easiest"
  | "hardest"
  | "title"
  | "smallest-budget";

export interface PuzzleFilterState {
  query: string;
  tags: string[];
  difficulties: PuzzleDifficulty[];
  restrictions: RestrictionKind[];
  budgets: BudgetKind[];
  solved: SolvedKind[];
  sort: PuzzleSortKey;
}

export const EMPTY_FILTERS: PuzzleFilterState = {
  query: "",
  tags: [],
  difficulties: [],
  restrictions: [],
  budgets: [],
  solved: [],
  sort: "default",
};

export const DIFFICULTY_ORDER: PuzzleDifficulty[] = ["easy", "medium", "hard", "expert"];

const DIFFICULTY_RANK: Record<PuzzleDifficulty, number> = {
  easy: 0,
  medium: 1,
  hard: 2,
  expert: 3,
};

export const SORT_OPTIONS: { key: PuzzleSortKey; label: string }[] = [
  { key: "default", label: "Mixed up" },
  { key: "easiest", label: "Easiest first" },
  { key: "hardest", label: "Hardest first" },
  { key: "title", label: "A to Z" },
  { key: "smallest-budget", label: "Tightest budget" },
];

export function restrictionOf(puzzle: PuzzleSpec): RestrictionKind {
  if (puzzle.allowedGateTypes && puzzle.allowedGateTypes.length > 0) return "allowed-only";
  if (puzzle.disallowedGateTypes && puzzle.disallowedGateTypes.length > 0) return "disallowed";
  return "unrestricted";
}

export function budgetOf(puzzle: PuzzleSpec): BudgetKind {
  return puzzle.gateBudget !== null && puzzle.gateBudget !== undefined ? "budgeted" : "unbudgeted";
}

/** The human-readable constraint, shared by the list and the puzzle page. */
export function formatRestriction(puzzle: PuzzleSpec): string {
  if (puzzle.allowedGateTypes && puzzle.allowedGateTypes.length > 0) {
    return `${puzzle.allowedGateTypes.map(gateTypeToString).join(", ")} only`;
  }
  if (puzzle.disallowedGateTypes && puzzle.disallowedGateTypes.length > 0) {
    return `No ${puzzle.disallowedGateTypes.map(gateTypeToString).join(", ")}`;
  }
  return "No restriction";
}

export const RESTRICTION_LABELS: Record<RestrictionKind, string> = {
  unrestricted: "No restriction",
  "allowed-only": "Only certain gates",
  disallowed: "Some gates banned",
};

export const BUDGET_LABELS: Record<BudgetKind, string> = {
  budgeted: "Has a gate budget",
  unbudgeted: "No budget",
};

export const SOLVED_LABELS: Record<SolvedKind, string> = {
  solved: "Solved",
  unsolved: "Not solved yet",
};

/**
 * True when a puzzle passes every active group.
 *
 * Groups combine with AND, options within a group with OR, which is what makes
 * "easy or medium, tagged arithmetic" expressible. An empty group means the
 * group is off, not that nothing matches.
 */
function matches(
  puzzle: PuzzleSpec,
  filters: PuzzleFilterState,
  isSolved: (slug: string) => boolean,
): boolean {
  const q = filters.query.trim().toLowerCase();
  if (q && !puzzle.title.toLowerCase().includes(q) && !puzzle.description.toLowerCase().includes(q)) {
    return false;
  }
  if (filters.difficulties.length > 0 && !filters.difficulties.includes(puzzle.difficulty)) return false;
  if (filters.tags.length > 0 && !filters.tags.some((t) => puzzle.tags.includes(t))) return false;
  if (filters.restrictions.length > 0 && !filters.restrictions.includes(restrictionOf(puzzle))) return false;
  if (filters.budgets.length > 0 && !filters.budgets.includes(budgetOf(puzzle))) return false;
  if (filters.solved.length > 0) {
    const kind: SolvedKind = isSolved(puzzle.slug) ? "solved" : "unsolved";
    if (!filters.solved.includes(kind)) return false;
  }
  return true;
}

export function applyPuzzleFilters(
  /** Already in the shuffled base order the "Mixed up" sort preserves. */
  puzzles: PuzzleSpec[],
  filters: PuzzleFilterState,
  isSolved: (slug: string) => boolean,
): PuzzleSpec[] {
  const kept = puzzles.filter((p) => matches(p, filters, isSolved));

  switch (filters.sort) {
    case "easiest":
      return [...kept].sort((a, b) => DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty]);
    case "hardest":
      return [...kept].sort((a, b) => DIFFICULTY_RANK[b.difficulty] - DIFFICULTY_RANK[a.difficulty]);
    case "title":
      return [...kept].sort((a, b) => a.title.localeCompare(b.title));
    case "smallest-budget":
      // Unbudgeted puzzles have no tightness to speak of, so they sort last
      // rather than being treated as a budget of zero.
      return [...kept].sort((a, b) => (a.gateBudget ?? Infinity) - (b.gateBudget ?? Infinity));
    default:
      return kept;
  }
}

/**
 * How many puzzles a given option would leave, with that option's own group
 * ignored.
 *
 * Counting against the fully-filtered set would show a zero beside every
 * option the user has not already picked, which reads as "nothing here" when
 * it means "nothing here as well as what you chose".
 */
export function countFor<K extends keyof PuzzleFilterState>(
  puzzles: PuzzleSpec[],
  filters: PuzzleFilterState,
  isSolved: (slug: string) => boolean,
  group: K,
  value: PuzzleFilterState[K] extends (infer T)[] ? T : never,
): number {
  const relaxed: PuzzleFilterState = { ...filters, [group]: [value] } as PuzzleFilterState;
  return puzzles.filter((p) => matches(p, relaxed, isSolved)).length;
}

/** Every active choice, flattened for the "you have these on" chip row. */
export interface ActiveFilterChip {
  group: keyof PuzzleFilterState;
  value: string;
  label: string;
}

export function activeChips(filters: PuzzleFilterState): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];
  for (const d of filters.difficulties) {
    chips.push({ group: "difficulties", value: d, label: d[0].toUpperCase() + d.slice(1) });
  }
  for (const t of filters.tags) chips.push({ group: "tags", value: t, label: t });
  for (const r of filters.restrictions) {
    chips.push({ group: "restrictions", value: r, label: RESTRICTION_LABELS[r] });
  }
  for (const b of filters.budgets) chips.push({ group: "budgets", value: b, label: BUDGET_LABELS[b] });
  for (const s of filters.solved) chips.push({ group: "solved", value: s, label: SOLVED_LABELS[s] });
  return chips;
}

export function countActive(filters: PuzzleFilterState): number {
  return activeChips(filters).length + (filters.query.trim() ? 1 : 0);
}
