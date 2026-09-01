/**
 * The problem catalogue behind the `two-pointer-explorer` widget.
 *
 * A tutorial block names a mode and, optionally, its own input; everything
 * else - the label, the one-line reason the technique applies, the default
 * example - lives here rather than in the JSON, so a page stays readable and
 * a fix to an example reaches every page that uses it.
 */

import {
  celebritySteps,
  closestPairSteps,
  closestTripletSteps,
  commonInThreeSteps,
  containerWaterSteps,
  countTripletsSteps,
  fourSumSteps,
  policeThievesSteps,
  reverseWordsSteps,
  sentencePalindromeSteps,
  smallestSubarraySteps,
  threeSumSteps,
  twoSumSortedSteps,
  uniqueElementsSteps,
} from "./algorithms";
import type { TwoPointerRun } from "./types";

export type TwoPointerModeId =
  | "two-sum"
  | "palindrome"
  | "container"
  | "unique"
  | "window"
  | "reverse-words"
  | "three-sum"
  | "count-triplets"
  | "closest-triplet"
  | "four-sum"
  | "closest-pair"
  | "common-three"
  | "police-thieves"
  | "celebrity";

export type PointerShape = "converging" | "same-direction" | "k-sum" | "two-sequence";

export interface TwoPointerModeMeta {
  id: TwoPointerModeId;
  label: string;
  shape: PointerShape;
  /** Why two pointers are allowed here at all - the elimination argument. */
  blurb: string;
  build: (data: Record<string, unknown>) => TwoPointerRun;
}

/* -------------------------------------------------------------------------
 * Reading widget data, with a sane example when the block does not supply one
 * ---------------------------------------------------------------------- */

function nums(raw: unknown, fallback: number[]): number[] {
  return Array.isArray(raw) && raw.every((v) => typeof v === "number") ? (raw as number[]) : fallback;
}

function num(raw: unknown, fallback: number): number {
  return typeof raw === "number" ? raw : fallback;
}

function str(raw: unknown, fallback: string): string {
  return typeof raw === "string" && raw.length > 0 ? raw : fallback;
}

/** The default guest list: everybody knows Cleo, and Cleo knows nobody. */
const CELEBRITY_NAMES = ["Ana", "Ben", "Cleo", "Dev", "Eve"];
const CELEBRITY_KNOWS: boolean[][] = [
  //        Ana    Ben    Cleo   Dev    Eve
  /* Ana */ [false, true, true, false, true],
  /* Ben */ [false, false, true, true, false],
  /* Cleo*/ [false, false, false, false, false],
  /* Dev */ [true, false, true, false, true],
  /* Eve */ [false, true, true, false, false],
];

function celebrityMatrix(data: Record<string, unknown>): { names: string[]; knows: boolean[][] } {
  const names = Array.isArray(data.names) && data.names.every((v) => typeof v === "string")
    ? (data.names as string[])
    : CELEBRITY_NAMES;
  const raw = data.knows;
  const knows =
    Array.isArray(raw) && raw.length === names.length && raw.every((row) => Array.isArray(row))
      ? (raw as boolean[][])
      : CELEBRITY_KNOWS;
  return { names, knows };
}

export const TWO_POINTER_MODES: readonly TwoPointerModeMeta[] = [
  {
    id: "two-sum",
    label: "2 Sum in a sorted array",
    shape: "converging",
    blurb:
      "A sum that is too small rules out the left value against every remaining partner at once, not just against the right one.",
    build: (d) => twoSumSortedSteps(nums(d.values, [-3, 1, 2, 4, 6, 8, 11, 15]), num(d.target, 12)),
  },
  {
    id: "palindrome",
    label: "Sentence palindrome",
    shape: "converging",
    blurb: "Compare the ends inward, skipping anything that is not a letter or digit. Each pointer skips on its own.",
    build: (d) => sentencePalindromeSteps(str(d.text, "A man, a plan, a canal: Panama")),
  },
  {
    id: "container",
    label: "Container with most water",
    shape: "converging",
    blurb: "Only the shorter wall is worth moving: moving the taller one loses width and cannot gain height.",
    build: (d) => containerWaterSteps(nums(d.values, [1, 8, 6, 2, 5, 4, 8, 3, 7])),
  },
  {
    id: "unique",
    label: "Unique elements",
    shape: "same-direction",
    blurb: "A read pointer that never stops and a write pointer that advances only on a value it has not seen.",
    build: (d) => uniqueElementsSteps(nums(d.values, [1, 1, 2, 3, 3, 3, 5, 7, 7])),
  },
  {
    id: "window",
    label: "Smallest subarray with sum ≥ target",
    shape: "same-direction",
    blurb: "Grow right, shrink left. Both pointers only move forward, so the nested loop is still linear overall.",
    build: (d) => smallestSubarraySteps(nums(d.values, [2, 1, 5, 2, 3, 2]), num(d.target, 7)),
  },
  {
    id: "reverse-words",
    label: "Reverse the words",
    shape: "same-direction",
    blurb: "Reverse the whole string, then reverse each word back. Both phases are the same swap loop.",
    build: (d) => reverseWordsSteps(str(d.text, "the sky is blue")),
  },
  {
    id: "three-sum",
    label: "3 Sum",
    shape: "k-sum",
    blurb: "Fix the leftmost value, then run the Two Sum pass on everything to its right.",
    build: (d) => threeSumSteps(nums(d.values, [-4, -1, -1, 0, 1, 2]), num(d.target, 0)),
  },
  {
    id: "count-triplets",
    label: "Count triplets under a target",
    shape: "k-sum",
    blurb: "When a sum lands under the target, every partner between the two pointers works, so a whole block counts at once.",
    build: (d) => countTripletsSteps(nums(d.values, [-2, 0, 1, 3, 5]), num(d.target, 4)),
  },
  {
    id: "closest-triplet",
    label: "Closest triplet",
    shape: "k-sum",
    blurb: "The same pass, but tracking the smallest distance seen instead of an exact match.",
    build: (d) => closestTripletSteps(nums(d.values, [-1, 2, 1, -4, 5]), num(d.target, 1)),
  },
  {
    id: "four-sum",
    label: "4 Sum",
    shape: "k-sum",
    blurb: "Two fixed indices instead of one, then the same converging pair. The pattern generalises to k-Sum.",
    build: (d) => fourSumSteps(nums(d.values, [-2, -1, 0, 0, 1, 2]), num(d.target, 0)),
  },
  {
    id: "closest-pair",
    label: "Closest pair from two arrays",
    shape: "two-sequence",
    blurb: "Walk one array upward and the other downward, and the sum becomes a dial the two pointers turn opposite ways.",
    build: (d) => closestPairSteps(nums(d.left, [1, 4, 5, 7]), nums(d.right, [10, 20, 30, 40]), num(d.target, 32)),
  },
  {
    id: "common-three",
    label: "Common in three arrays",
    shape: "two-sequence",
    blurb: "Advance whichever pointer reads the smallest value: it cannot appear later in the other two.",
    build: (d) =>
      commonInThreeSteps(
        nums(d.first, [1, 5, 10, 20, 40, 80]),
        nums(d.second, [6, 7, 20, 80, 100]),
        nums(d.third, [3, 4, 15, 20, 30, 70, 80, 120]),
      ),
  },
  {
    id: "police-thieves",
    label: "Policemen catch thieves",
    shape: "two-sequence",
    blurb: "Pair the nearest officer and thief when they are in range; whoever comes first when they are not can never match.",
    build: (d) => {
      const raw = d.cells;
      const cells =
        Array.isArray(raw) && raw.every((v) => typeof v === "string")
          ? (raw as string[])
          : ["P", "T", "T", "P", "T", ".", "T", "P"];
      return policeThievesSteps(cells, num(d.k, 2));
    },
  },
  {
    id: "celebrity",
    label: "The celebrity problem",
    shape: "two-sequence",
    blurb: "One question always eliminates one person, so n-1 questions leave a single candidate to verify.",
    build: (d) => {
      const { names, knows } = celebrityMatrix(d);
      return celebritySteps(knows, names);
    },
  },
];

export function findMode(id: string | undefined): TwoPointerModeMeta {
  return TWO_POINTER_MODES.find((m) => m.id === id) ?? TWO_POINTER_MODES[0];
}

export const SHAPE_LABELS: Record<PointerShape, string> = {
  converging: "Converging from both ends",
  "same-direction": "Both pointers moving forward",
  "k-sum": "Fixed prefix plus a converging pair",
  "two-sequence": "One pointer per sequence",
};
