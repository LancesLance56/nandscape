/**
 * Every named flowchart preset, in one place.
 *
 * The widgets look charts up by name from here, so adding a chart to either
 * family makes it available to tutorial content and to the maker's template
 * picker without touching either component.
 */

import { SORTING_CHARTS, STARTER_CHART } from "./sorting-charts";
import { BACKTRACKING_CHARTS } from "./backtracking-charts";
import type { FlowchartSpec } from "./types";

export const ALL_CHARTS: Record<string, FlowchartSpec> = {
  ...SORTING_CHARTS,
  ...BACKTRACKING_CHARTS,
};

export { STARTER_CHART };

/** Grouped for the maker's template picker. */
export const CHART_GROUPS: { label: string; charts: { id: string; label: string }[] }[] = [
  {
    label: "Sorting",
    charts: [
      { id: "bubble", label: "Bubble sort" },
      { id: "selection", label: "Selection sort" },
      { id: "insertion", label: "Insertion sort" },
      { id: "merge", label: "Merge sort" },
      { id: "merge-step", label: "The merge step" },
      { id: "quick", label: "Quick sort" },
      { id: "partition", label: "Lomuto partition" },
      { id: "heap", label: "Heap sort" },
      { id: "counting", label: "Counting sort" },
    ],
  },
  {
    label: "Backtracking",
    charts: [
      { id: "backtracking-template", label: "Backtracking template" },
      { id: "subsets", label: "Subsets" },
      { id: "permutations", label: "Permutations" },
      { id: "n-queens", label: "N-Queens" },
      { id: "palindrome", label: "Palindrome partitioning" },
      { id: "m-coloring", label: "Graph m-coloring" },
      { id: "sudoku", label: "Sudoku solver" },
    ],
  },
];
