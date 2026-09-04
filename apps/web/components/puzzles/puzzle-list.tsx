"use client";

import { useCallback, useEffect, useMemo } from "react";
import type { PuzzleSpec } from "@/types/puzzle";
import { usePuzzleProgressStore } from "@/store/puzzle-progress-store";
import { shuffleDeterministic } from "@/lib/puzzles/puzzle-display";
import {
  BUDGET_LABELS,
  RESTRICTION_LABELS,
  budgetOf,
  formatRestriction,
  restrictionOf,
} from "@/lib/puzzles/puzzle-filters";
import { ProblemBrowser } from "@/components/problems/problem-browser";
import { baseSorts, type FacetDef, type ProblemItem } from "@/lib/problems/problem-filters";

/**
 * Logic problems, on the shared problem browser.
 *
 * Everything here is the adapter: what a puzzle looks like as a generic
 * problem, the two filter groups only puzzles have, and the extra column. The
 * search box, chips, pagination, table and sidebar all live in
 * components/problems and are the same ones the coding list uses.
 */

interface PuzzleRow extends ProblemItem {
  puzzle: PuzzleSpec;
}

const FACETS: FacetDef<PuzzleRow>[] = [
  {
    id: "restrictions",
    label: "All constraints",
    options: Object.entries(RESTRICTION_LABELS).map(([value, label]) => ({ value, label })),
    valuesOf: (row) => [restrictionOf(row.puzzle)],
  },
  {
    id: "budgets",
    label: "All budgets",
    options: Object.entries(BUDGET_LABELS).map(([value, label]) => ({ value, label })),
    valuesOf: (row) => [budgetOf(row.puzzle)],
  },
];

const SORTS = [
  ...baseSorts<PuzzleRow>(),
  {
    key: "smallest-budget",
    label: "Tightest budget",
    // Unbudgeted puzzles have no number to rank, so they sort last rather than
    // being treated as budget zero and jumping to the front.
    compare: (a: PuzzleRow, b: PuzzleRow) =>
      (a.puzzle.gateBudget ?? Number.POSITIVE_INFINITY) -
      (b.puzzle.gateBudget ?? Number.POSITIVE_INFINITY),
  },
];

export function PuzzleList({
  puzzles,
  dailyPuzzleSlug,
}: {
  puzzles: PuzzleSpec[];
  dailyPuzzleSlug?: string;
}) {
  const progressStatus = usePuzzleProgressStore((s) => s.status);
  const progressBySlug = usePuzzleProgressStore((s) => s.bySlug);
  const loadAllProgress = usePuzzleProgressStore((s) => s.loadAll);

  useEffect(() => {
    void loadAllProgress();
  }, [loadAllProgress]);

  const isSolved = useCallback(
    (slug: string) => progressBySlug[slug]?.solved === true,
    [progressBySlug],
  );

  // Deliberately not sorted by difficulty: order is scrambled once, based on
  // slug identity, so it looks mixed up but stays put across renders/filters
  // and matches between server and client.
  const rows = useMemo<PuzzleRow[]>(
    () =>
      shuffleDeterministic(puzzles, (p) => p.slug).map((puzzle) => ({
        slug: puzzle.slug,
        title: puzzle.title,
        description: puzzle.description,
        difficulty: puzzle.difficulty,
        tags: puzzle.tags,
        puzzle,
      })),
    [puzzles],
  );

  return (
    <ProblemBrowser<PuzzleRow>
      items={rows}
      hrefFor={(row) => `/puzzles/${row.slug}`}
      facets={FACETS}
      sorts={SORTS}
      isSolved={isSolved}
      signedOut={progressStatus === "signed-out"}
      searchLabel="logic problems"
      sortName="puzzle-sort"
      badge={(row) => (row.slug === dailyPuzzleSlug ? "Today" : null)}
      columns={[
        {
          header: "Constraint",
          className: "hidden lg:table-cell",
          render: (row) => (
            <>
              {formatRestriction(row.puzzle)}
              {row.puzzle.gateBudget !== null && (
                <span className="text-border-strong"> · budget {row.puzzle.gateBudget}</span>
              )}
            </>
          ),
        },
      ]}
    />
  );
}
