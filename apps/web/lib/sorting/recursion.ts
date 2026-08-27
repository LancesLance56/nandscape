/**
 * Merge sort and quick sort, recorded as call trees.
 *
 * The DP section's recorder was built for functions that return a number.
 * These two return an array, and the recorder does not care: a node's "value"
 * is just whatever the real function handed back, string or number, and the
 * tree, the stack panel and the step player all fall out of the same recorder
 * calls for free. Nothing here is a retelling of the algorithm - `enter` and
 * `ret` sit exactly where the real recursive calls and returns happen, so a
 * frame cannot claim the sort did something it did not.
 */

import { createCallRecorder, type CallRun } from "@/lib/dp/types";

function fmt(a: number[]): string {
  return `[${a.join(",")}]`;
}

/**
 * Merge sort, split-then-merge, depth-first.
 *
 * Matches the article's own trace: the left half runs to completion, all the
 * way down and all the way back up, before the right half is even entered.
 */
export function mergeSortRun(array: number[]): CallRun {
  const rec = createCallRecorder();
  let idCounter = 0;

  function go(a: number[]): number[] {
    const label = fmt(a);
    const key = `${label}#${idCounter++}`; // positional: two equal-looking calls are still different calls

    if (a.length <= 1) {
      rec.enter(label, key, `${label} is already sorted. Base case, return it unchanged.`);
      rec.ret(label, `${label} is the base case. Return it as-is.`, true);
      return a;
    }

    rec.enter(label, key, `${label} splits into two halves, and waits on the left one first.`);

    const mid = Math.floor(a.length / 2);
    const left = go(a.slice(0, mid));
    const right = go(a.slice(mid));

    const merged = merge(left, right);
    rec.ret(
      fmt(merged),
      `${fmt(left)} and ${fmt(right)} are both back. Merge them and ${label} returns ${fmt(merged)}.`,
    );
    return merged;
  }

  function merge(left: number[], right: number[]): number[] {
    const out: number[] = [];
    let i = 0;
    let j = 0;
    while (i < left.length && j < right.length) {
      if (left[i] <= right[j]) out.push(left[i++]);
      else out.push(right[j++]);
    }
    while (i < left.length) out.push(left[i++]);
    while (j < right.length) out.push(right[j++]);
    return out;
  }

  const answer = go(array);
  return rec.finish(
    ["mergeSort(a) = a, when a has at most one element", "mergeSort(a) = merge(mergeSort(left), mergeSort(right))"],
    `sorted: ${fmt(answer)}`,
  );
}

/**
 * Quick sort, Lomuto partition, last element as the pivot.
 *
 * The work happens before the recursive calls, in partition, not after. Each
 * node's label is the range as it is handed in; the caption on entry reports
 * where the pivot landed once partition has run, since that is what decides
 * the two recursive calls.
 */
export function quickSortRun(array: number[]): CallRun {
  const rec = createCallRecorder();
  const a = [...array];
  let idCounter = 0;

  function partition(low: number, high: number): number {
    const pivot = a[high];
    let i = low - 1;
    for (let j = low; j < high; j++) {
      if (a[j] < pivot) {
        i++;
        [a[i], a[j]] = [a[j], a[i]];
      }
    }
    [a[i + 1], a[high]] = [a[high], a[i + 1]];
    return i + 1;
  }

  function go(low: number, high: number): void {
    const label = fmt(a.slice(low, high + 1));
    const key = `${label}#${idCounter++}`;

    if (low >= high) {
      rec.enter(label, key, `${label} has at most one element. Base case, nothing to do.`);
      rec.ret(fmt(a.slice(low, high + 1)), `${label} is already sorted. Return.`, true);
      return;
    }

    rec.enter(label, key, `${label} is called. Partition it around a pivot before recursing.`);

    const p = partition(low, high);
    const pivotValue = a[p];
    const afterLabel = fmt(a.slice(low, high + 1));

    rec.snapshot(
      `Partitioning ${label} around pivot ${pivotValue}: it lands at its final position, giving ${afterLabel}.`,
      undefined,
    );

    go(low, p - 1);
    go(p + 1, high);

    // Recompute after both recursive calls: they have gone on mutating `a`
    // within this range since afterLabel was captured, so reusing that
    // string here would report the state right after partitioning instead
    // of the fully sorted range this call actually hands back.
    const finalLabel = fmt(a.slice(low, high + 1));
    rec.ret(finalLabel, `Both sides of pivot ${pivotValue} are sorted. ${label} returns ${finalLabel}.`);
  }

  go(0, array.length - 1);
  return rec.finish(
    ["partition picks a pivot and places it; everything smaller ends up left of it, everything larger right"],
    `sorted: ${fmt(a)}`,
  );
}
