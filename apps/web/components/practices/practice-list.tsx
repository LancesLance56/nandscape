"use client";

import { useCallback, useMemo } from "react";
import type { PracticeLanguage, PracticeSpec } from "@/types/practice";
import { ProblemBrowser } from "@/components/problems/problem-browser";
import { baseSorts, type FacetDef, type ProblemItem } from "@/lib/problems/problem-filters";

/**
 * Coding problems, on the shared problem browser.
 *
 * The same component the logic problems use (components/problems). Only the
 * adapter differs: how a coding problem reads as a generic problem, the one
 * filter group only this list has (language), and the extra column.
 */

const LANGUAGE_LABELS: Record<PracticeLanguage, string> = {
  python: "Python",
  javascript: "JavaScript",
  cpp: "C++",
};

interface PracticeRow extends ProblemItem {
  languages: PracticeLanguage[];
  hiddenTestCount: number;
}

const FACETS: FacetDef<PracticeRow>[] = [
  {
    id: "languages",
    label: "All languages",
    options: (Object.keys(LANGUAGE_LABELS) as PracticeLanguage[]).map((value) => ({
      value,
      label: LANGUAGE_LABELS[value],
    })),
    valuesOf: (row) => row.languages,
  },
];

const SORTS = baseSorts<PracticeRow>();

export function PracticeList({
  practices,
  solvedSlugs,
  signedOut,
}: {
  practices: PracticeSpec[];
  /** Slugs with an accepted submission, resolved server-side. */
  solvedSlugs: string[];
  signedOut: boolean;
}) {
  const solved = useMemo(() => new Set(solvedSlugs), [solvedSlugs]);
  const isSolved = useCallback((slug: string) => solved.has(slug), [solved]);

  const rows = useMemo<PracticeRow[]>(
    () =>
      practices.map((practice) => ({
        slug: practice.slug,
        title: practice.title,
        description: practice.summary,
        difficulty: practice.difficulty,
        tags: practice.tags,
        languages: practice.languages,
        hiddenTestCount: practice.hiddenTestCount,
      })),
    [practices],
  );

  return (
    <ProblemBrowser<PracticeRow>
      items={rows}
      hrefFor={(row) => `/practices/${row.slug}`}
      facets={FACETS}
      sorts={SORTS}
      isSolved={isSolved}
      // Passed in rather than inferred from an empty solvedSlugs: "solved
      // nothing" and "has no account" look identical from here, and the
      // progress filters should only hide for the second.
      signedOut={signedOut}
      searchLabel="coding problems"
      sortName="practice-sort"
      columns={[
        {
          header: "Languages",
          className: "hidden lg:table-cell",
          render: (row) => row.languages.map((l) => LANGUAGE_LABELS[l]).join(", "),
        },
        {
          header: "Tests",
          className: "hidden xl:table-cell",
          render: (row) => `${row.hiddenTestCount} hidden`,
        },
      ]}
    />
  );
}
