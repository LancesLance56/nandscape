/**
 * Step generators for the collection-building backtracking problems:
 * subsets, combination sum, and permutations.
 *
 * All three are the same loop with a different set of choices and a
 * different stopping rule, which is exactly the point the tutorials make.
 * Keeping them in one file makes that similarity checkable rather than
 * asserted.
 */

import {
  TREE_ROW_HEIGHT,
  TREE_WIDTH,
  createRecorder,
  formatList,
  formatSet,
  type BacktrackRun,
} from "./types";

/**
 * Every node is a subset, so the tree has no separate "answer" layer. That
 * is the difference worth seeing before permutations, where only the leaves
 * count.
 */
export function subsetsSteps(items: string[]): BacktrackRun {
  const rec = createRecorder();
  const current: string[] = [];

  rec.enter("{ }", formatSet(current));
  rec.solution(formatSet(current));
  rec.snapshot("Start at the empty subset. Unlike most backtracking problems, every node here is already a valid answer.");

  const walk = (start: number): void => {
    for (let i = start; i < items.length; i++) {
      current.push(items[i]);
      rec.enter(items[i], formatSet(current));
      rec.solution(formatSet(current));
      if (!rec.snapshot(`Choose ${items[i]}. The subset is now ${formatSet(current)}, which counts as an answer.`)) return;

      walk(i + 1);
      if (rec.stopped) return;

      rec.leave("solution");
      current.pop();
      if (!rec.snapshot(`Un-choose ${items[i]}. Back to ${formatSet(current)}, ready to try the next candidate.`)) return;
    }
  };

  walk(0);
  if (!rec.stopped) {
    rec.leave("solution");
    rec.snapshot(`Finished. ${2 ** items.length} subsets from ${items.length} items, which is every node in the tree.`);
  }

  return rec.finish(TREE_WIDTH, TREE_ROW_HEIGHT);
}

/**
 * Combination sum over distinct candidates, each usable at most once.
 *
 * `prune: false` is deliberately the naive generate-and-test version: it
 * builds the entire subset tree and checks each node's total. `prune: true`
 * adds the one comparison that makes it backtracking. Candidates are assumed
 * sorted ascending, which is what lets the pruned version `break` out of the
 * loop instead of skipping a single candidate: if this one already overshoots,
 * every later one overshoots too.
 */
export function combinationSumSteps(candidates: number[], target: number, prune: boolean): BacktrackRun {
  const rec = createRecorder();
  const current: number[] = [];
  let sum = 0;

  rec.enter("[ ]", "sum 0");
  rec.snapshot(
    prune
      ? `Looking for combinations summing to ${target}, rejecting any branch that overshoots.`
      : `Looking for combinations summing to ${target} by building every subset and testing its total.`,
  );

  const walk = (start: number): void => {
    if (sum === target) {
      rec.solution(formatList(current));
      rec.snapshot(`${formatList(current)} sums to ${target}. Record it and stop, since every candidate is positive.`);
      return;
    }

    for (let i = start; i < candidates.length; i++) {
      const c = candidates[i];

      if (prune && sum + c > target) {
        rec.prune(
          String(c),
          `${sum} + ${c} > ${target}`,
          `${sum} + ${c} overshoots ${target}. The list is sorted, so every remaining candidate overshoots too. Cut the whole branch.`,
        );
        return;
      }

      current.push(c);
      sum += c;
      rec.enter(String(c), `${formatList(current)} = ${sum}`);
      if (!rec.snapshot(`Add ${c}. Running total ${sum}${sum > target ? `, already past ${target}` : ""}.`)) return;

      walk(i + 1);
      if (rec.stopped) return;

      rec.leave(sum === target ? "solution" : "dead");
      current.pop();
      sum -= c;
      if (!rec.snapshot(`Remove ${c}. Total is back to ${sum}.`)) return;
    }
  };

  walk(0);
  if (!rec.stopped) {
    rec.leave("explored");
    rec.snapshot(
      prune
        ? "Finished. Compare the node count with the unpruned run: the answers are identical, the work is not."
        : "Finished. Every subset was built and tested, including the ones that were hopeless several levels earlier.",
    );
  }

  return rec.finish(TREE_WIDTH, TREE_ROW_HEIGHT);
}

export type PermutationMode = "used" | "swap";

/**
 * Permutations, either by tracking which indices are already spoken for or by
 * swapping the chosen element into place.
 *
 * `dedupe` handles repeated characters, and the two modes need genuinely
 * different tests for it, which is the main reason both are here. The used
 * version relies on the input being sorted so equal characters sit next to
 * each other; the swap version cannot, because swapping destroys that order,
 * so it keeps a per-level set of values it has already tried instead.
 */
export function permutationsSteps(input: string[], mode: PermutationMode, dedupe: boolean): BacktrackRun {
  const items = dedupe && mode === "used" ? [...input].sort() : [...input];
  const n = items.length;
  const rec = createRecorder();

  rec.enter("·", mode === "used" ? "[ ]" : items.join(""));
  rec.snapshot(
    mode === "used"
      ? `Build a permutation of ${items.join("")} one position at a time, skipping characters already used.`
      : `Permute ${items.join("")} in place. At each depth, swap one of the remaining characters into the current slot.`,
  );

  if (mode === "used") {
    const used = new Array(n).fill(false);
    const current: string[] = [];

    const walk = (): void => {
      if (current.length === n) {
        rec.solution(current.join(""));
        rec.snapshot(`All ${n} positions filled: ${current.join("")}. Record it and back out.`);
        return;
      }

      for (let i = 0; i < n; i++) {
        if (used[i]) continue;

        if (dedupe && i > 0 && items[i] === items[i - 1] && !used[i - 1]) {
          rec.prune(
            items[i],
            current.join("") || "[ ]",
            `Skip this ${items[i]}: the identical ${items[i]} beside it is unused, so this branch would repeat one already built.`,
          );
          continue;
        }

        used[i] = true;
        current.push(items[i]);
        rec.enter(items[i], current.join(""));
        if (!rec.snapshot(`Place ${items[i]} at position ${current.length}. Partial: ${current.join("")}.`)) return;

        walk();
        if (rec.stopped) return;

        rec.leave(current.length === n ? "solution" : "explored");
        current.pop();
        used[i] = false;
        if (!rec.snapshot(`Take ${items[i]} back out. Partial: ${current.join("") || "[ ]"}, and ${items[i]} is free again.`)) return;
      }
    };

    walk();
  } else {
    const arr = [...items];
    const swap = (a: number, b: number) => {
      [arr[a], arr[b]] = [arr[b], arr[a]];
    };

    const walk = (k: number): void => {
      if (k === n) {
        rec.solution(arr.join(""));
        rec.snapshot(`Reached the end of the array: ${arr.join("")}. Record it.`);
        return;
      }

      const seen = new Set<string>();
      for (let i = k; i < n; i++) {
        if (dedupe && seen.has(arr[i])) {
          rec.prune(
            arr[i],
            arr.join(""),
            `Another ${arr[i]} has already sat at position ${k + 1} on this level. Swapping it in would rebuild the same subtree.`,
          );
          continue;
        }
        seen.add(arr[i]);

        swap(k, i);
        rec.enter(arr[k], arr.join(""));
        if (
          !rec.snapshot(
            i === k
              ? `Leave ${arr[k]} where it is and fix position ${k + 1}. Array: ${arr.join("")}.`
              : `Swap ${arr[k]} into position ${k + 1}. Array: ${arr.join("")}.`,
          )
        )
          return;

        walk(k + 1);
        if (rec.stopped) return;

        rec.leave(k + 1 === n ? "solution" : "explored");
        swap(k, i);
        if (!rec.snapshot(`Swap back to restore ${arr.join("")}. Without this undo the next branch would start from the wrong array.`)) return;
      }
    };

    walk(0);
  }

  if (!rec.stopped) {
    rec.leave("explored");
    rec.snapshot("Finished. Only the bottom row counts as an answer here, unlike the subsets tree.");
  }

  return rec.finish(TREE_WIDTH, TREE_ROW_HEIGHT);
}
