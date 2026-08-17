/**
 * The problem patterns that sit on top of sorting.
 *
 * These are grouped by the technique rather than by the problem, because the
 * technique is the transferable part: once "partition with two pointers" or
 * "sort by end time then sweep" is in your hands, the individual problems
 * stop being separate things to memorise.
 */

import { createSortRecorder, type SortRun } from "./types";

/* =========================================================================
 * Partition patterns: one pass, pointers from the ends
 * ====================================================================== */

export type PartitionMode = "binary" | "zeroes" | "ternary";

/**
 * Segregate 0s and 1s, move zeroes to the end, and the Dutch national flag
 * problem (0s, 1s and 2s) are the same two-or-three pointer sweep.
 *
 * The three-way version is Dijkstra's: `low` marks the end of the 0s, `high`
 * marks the start of the 2s, and `mid` scans. The subtlety is that after
 * swapping with `high` you must not advance `mid`, because the value you
 * just pulled in from the right has not been looked at yet.
 */
export function partitionSteps(input: number[], mode: PartitionMode): SortRun {
  const a = [...input];
  const rec = createSortRecorder(a);
  const n = a.length;

  if (mode === "ternary") {
    let low = 0;
    let mid = 0;
    let high = n - 1;

    rec.push(a, "Dutch national flag: everything below low is 0, above high is 2, and mid scans the unknown middle.", {
      pointers: { low, mid, high },
    });

    while (mid <= high) {
      rec.countCompare();
      if (
        !rec.push(a, `Look at ${a[mid]} under the mid pointer.`, {
          comparing: [mid],
          pointers: { low, mid, high },
        })
      ) {
        return rec.finish();
      }

      if (a[mid] === 0) {
        [a[low], a[mid]] = [a[mid], a[low]];
        rec.countWrite(2);
        rec.push(a, `A 0, so swap it down to the low boundary and advance both.`, {
          writing: [low, mid],
          pointers: { low, mid, high },
        });
        low++;
        mid++;
      } else if (a[mid] === 2) {
        [a[mid], a[high]] = [a[high], a[mid]];
        rec.countWrite(2);
        rec.push(a, `A 2, so swap it up to the high boundary. Do not advance mid: the value swapped in is still unseen.`, {
          writing: [mid, high],
          pointers: { low, mid, high },
        });
        high--;
      } else {
        rec.push(a, `A 1, which is already in the right region. Just advance mid.`, {
          pointers: { low, mid, high },
        });
        mid++;
      }
      if (rec.stopped) return rec.finish();
    }

    rec.push(a, "Done in a single pass, with no sorting and no counting.", {
      sorted: Array.from({ length: n }, (_, i) => i),
    });
    return rec.finish();
  }

  if (mode === "zeroes") {
    // Stable: non-zero values keep their relative order, which is what the
    // problem asks for and what a naive swap-from-both-ends version breaks.
    let write = 0;
    rec.push(a, "Move zeroes to the end, keeping the other values in their original order.", {
      pointers: { write },
    });

    for (let read = 0; read < n; read++) {
      rec.countCompare();
      if (
        !rec.push(a, `Is ${a[read]} non-zero?`, { comparing: [read], pointers: { write, read } })
      ) {
        return rec.finish();
      }
      if (a[read] !== 0) {
        if (write !== read) {
          [a[write], a[read]] = [a[read], a[write]];
          rec.countWrite(2);
          rec.push(a, `Yes, so move it to position ${write}.`, {
            writing: [write, read],
            pointers: { write, read },
          });
        }
        write++;
      }
      if (rec.stopped) return rec.finish();
    }

    rec.push(a, `Every non-zero value is packed to the front in its original order, and the zeroes fell to the back.`, {
      sorted: Array.from({ length: n }, (_, i) => i),
    });
    return rec.finish();
  }

  // binary: 0s and 1s, pointers converging from both ends
  let left = 0;
  let right = n - 1;
  rec.push(a, "Segregate 0s and 1s: walk in from both ends and swap any mismatched pair.", {
    pointers: { left, right },
  });

  while (left < right) {
    while (left < right && a[left] === 0) {
      rec.countCompare();
      if (!rec.push(a, `${a[left]} is already on the correct side.`, { comparing: [left], pointers: { left, right } })) {
        return rec.finish();
      }
      left++;
    }
    while (left < right && a[right] === 1) {
      rec.countCompare();
      if (!rec.push(a, `${a[right]} is already on the correct side.`, { comparing: [right], pointers: { left, right } })) {
        return rec.finish();
      }
      right--;
    }
    if (left < right) {
      [a[left], a[right]] = [a[right], a[left]];
      rec.countWrite(2);
      if (!rec.push(a, `A 1 on the left and a 0 on the right, so swap them.`, {
        writing: [left, right],
        pointers: { left, right },
      })) {
        return rec.finish();
      }
      left++;
      right--;
    }
  }

  rec.push(a, "One pass, no extra memory.", { sorted: Array.from({ length: n }, (_, i) => i) });
  return rec.finish();
}

/* =========================================================================
 * Merge patterns: two sorted arrays, one sweep
 * ====================================================================== */

export type MergeMode = "merge" | "union" | "intersection" | "inversions";

export interface MergeStep {
  left: number[];
  right: number[];
  i: number;
  j: number;
  output: number[];
  caption: string;
  comparisons: number;
  /** Highlighted output positions for the frame. */
  emitted?: number;
  /** Inversion count so far, for that mode. */
  inversions?: number;
  /** Elements of the left half still pending, for the inversion explanation. */
  creditedFrom?: number[];
  done?: boolean;
}

export interface MergeRun {
  steps: MergeStep[];
  result: number[];
  inversions: number;
}

/**
 * The two-pointer sweep, in its four common disguises.
 *
 * Union, intersection and inversion counting are all the merge step with a
 * different rule for what to emit. Inversion counting is the one worth
 * dwelling on: when the right element is taken first, every element still
 * pending in the left half is greater than it, so they all form inversions
 * with it, and that whole batch is counted in one go. That batching is what
 * turns an O(n²) count into O(n log n).
 */
export function mergeSweepSteps(leftInput: number[], rightInput: number[], mode: MergeMode): MergeRun {
  const left = [...leftInput].sort((x, y) => x - y);
  const right = [...rightInput].sort((x, y) => x - y);
  const steps: MergeStep[] = [];
  const output: number[] = [];
  let i = 0;
  let j = 0;
  let comparisons = 0;
  let inversions = 0;

  const intro =
    mode === "merge"
      ? "Merge two sorted arrays by always taking the smaller of the two front values."
      : mode === "union"
        ? "Union: take the smaller front value, and skip anything already emitted."
        : mode === "intersection"
          ? "Intersection: advance the smaller side, and emit only when both fronts match."
          : "Inversion count: merge, and every time a right value is taken, all remaining left values were greater than it.";

  steps.push({ left, right, i, j, output: [], caption: intro, comparisons, inversions: mode === "inversions" ? 0 : undefined });

  const emit = (value: number, caption: string, extra: Partial<MergeStep> = {}) => {
    output.push(value);
    steps.push({
      left,
      right,
      i,
      j,
      output: [...output],
      caption,
      comparisons,
      emitted: output.length - 1,
      inversions: mode === "inversions" ? inversions : undefined,
      ...extra,
    });
  };

  while (i < left.length && j < right.length) {
    comparisons++;

    if (left[i] < right[j]) {
      if (mode === "intersection") {
        steps.push({
          left,
          right,
          i,
          j,
          output: [...output],
          caption: `${left[i]} is smaller and has no match, so skip it.`,
          comparisons,
        });
        i++;
      } else if (mode === "union" && output[output.length - 1] === left[i]) {
        steps.push({ left, right, i, j, output: [...output], caption: `${left[i]} is a duplicate, skip it.`, comparisons });
        i++;
      } else {
        emit(left[i], `${left[i]} < ${right[j]}, so take from the left.`);
        i++;
      }
    } else if (left[i] > right[j]) {
      if (mode === "inversions") {
        const pending = left.slice(i);
        inversions += pending.length;
        emit(right[j], `${right[j]} < ${left[i]}, so all ${pending.length} remaining left value(s) are inversions with it.`, {
          creditedFrom: pending,
        });
        j++;
      } else if (mode === "intersection") {
        steps.push({
          left,
          right,
          i,
          j,
          output: [...output],
          caption: `${right[j]} is smaller and has no match, so skip it.`,
          comparisons,
        });
        j++;
      } else if (mode === "union" && output[output.length - 1] === right[j]) {
        steps.push({ left, right, i, j, output: [...output], caption: `${right[j]} is a duplicate, skip it.`, comparisons });
        j++;
      } else {
        emit(right[j], `${right[j]} < ${left[i]}, so take from the right.`);
        j++;
      }
    } else {
      // Equal fronts.
      if (mode === "intersection") {
        emit(left[i], `${left[i]} appears in both, so it belongs in the intersection.`);
        i++;
        j++;
      } else if (mode === "union") {
        if (output[output.length - 1] !== left[i]) emit(left[i], `${left[i]} is in both; emit it once.`);
        else steps.push({ left, right, i, j, output: [...output], caption: `${left[i]} already emitted.`, comparisons });
        i++;
        j++;
      } else {
        // Ties take from the left, which keeps the merge stable and means
        // equal values are not counted as inversions.
        emit(left[i], `Equal values, so take the left one first to stay stable.`);
        i++;
      }
    }
  }

  while (i < left.length) {
    if (mode === "intersection") {
      i++;
      continue;
    }
    if (mode === "union" && output[output.length - 1] === left[i]) {
      i++;
      continue;
    }
    emit(left[i], `Right side is exhausted; take the rest of the left.`);
    i++;
  }
  while (j < right.length) {
    if (mode === "intersection") {
      j++;
      continue;
    }
    if (mode === "union" && output[output.length - 1] === right[j]) {
      j++;
      continue;
    }
    emit(right[j], `Left side is exhausted; take the rest of the right.`);
    j++;
  }

  steps.push({
    left,
    right,
    i,
    j,
    output: [...output],
    caption:
      mode === "inversions"
        ? `Done. ${inversions} inversion${inversions === 1 ? "" : "s"} counted across this merge.`
        : `Done in one pass over both arrays: O(n + m).`,
    comparisons,
    inversions: mode === "inversions" ? inversions : undefined,
    done: true,
  });

  return { steps, result: output, inversions };
}

/** Total inversions in an array, via merge sort. The reference answer. */
export function countInversions(input: number[]): number {
  const a = [...input];
  let count = 0;

  const sortRange = (lo: number, hi: number): void => {
    if (hi - lo < 1) return;
    const mid = Math.floor((lo + hi) / 2);
    sortRange(lo, mid);
    sortRange(mid + 1, hi);

    const left = a.slice(lo, mid + 1);
    const right = a.slice(mid + 1, hi + 1);
    let i = 0;
    let j = 0;
    let k = lo;
    while (i < left.length && j < right.length) {
      if (left[i] <= right[j]) a[k++] = left[i++];
      else {
        count += left.length - i;
        a[k++] = right[j++];
      }
    }
    while (i < left.length) a[k++] = left[i++];
    while (j < right.length) a[k++] = right[j++];
  };

  sortRange(0, a.length - 1);
  return count;
}

/* =========================================================================
 * Interval patterns: sort by an endpoint, then sweep
 * ====================================================================== */

export interface Interval {
  start: number;
  end: number;
  label?: string;
}

export interface IntervalStep {
  /** Intervals in the order the algorithm processes them. */
  ordered: Interval[];
  /** Index being considered. */
  active: number;
  /** Merged output so far (merge mode). */
  merged: Interval[];
  /** Concurrent count and running max (platforms mode). */
  concurrent?: number;
  maxConcurrent?: number;
  caption: string;
  done?: boolean;
}

export interface IntervalRun {
  steps: IntervalStep[];
  merged: Interval[];
  maxConcurrent: number;
}

/**
 * Merging overlapping intervals: sort by start, then extend or emit.
 *
 * Sorting by start is what makes a single pass sufficient. Without it you
 * would have to compare every interval against every other, and the whole
 * problem is really "sorting turns an O(n²) pairwise question into an O(n)
 * sweep".
 */
export function mergeIntervalsSteps(input: Interval[]): IntervalRun {
  const ordered = [...input].sort((a, b) => a.start - b.start || a.end - b.end);
  const steps: IntervalStep[] = [];
  const merged: Interval[] = [];

  steps.push({
    ordered,
    active: -1,
    merged: [],
    caption: "Sort by start time. After that, one pass is enough: each interval either extends the last or starts a new one.",
  });

  for (let idx = 0; idx < ordered.length; idx++) {
    const cur = ordered[idx];
    const last = merged[merged.length - 1];

    if (!last || cur.start > last.end) {
      merged.push({ ...cur });
      steps.push({
        ordered,
        active: idx,
        merged: merged.map((m) => ({ ...m })),
        caption: last
          ? `${cur.start} starts after the last merged interval ends at ${last.end}, so begin a new one.`
          : `Start the first merged interval at ${cur.start}.`,
      });
    } else {
      const before = last.end;
      last.end = Math.max(last.end, cur.end);
      steps.push({
        ordered,
        active: idx,
        merged: merged.map((m) => ({ ...m })),
        caption:
          last.end > before
            ? `Overlaps the current interval, and reaches further, so extend the end from ${before} to ${last.end}.`
            : `Overlaps and is fully contained, so nothing changes.`,
      });
    }
  }

  steps.push({
    ordered,
    active: -1,
    merged: merged.map((m) => ({ ...m })),
    caption: `Done: ${input.length} interval${input.length === 1 ? "" : "s"} collapsed into ${merged.length}.`,
    done: true,
  });

  return { steps, merged, maxConcurrent: 0 };
}

/**
 * Minimum platforms: the classic "how many rooms/platforms do you need"
 * sweep. Sort arrivals and departures separately and walk both, which is the
 * same two-pointer merge again in different clothing.
 */
export function minimumPlatformsSteps(input: Interval[]): IntervalRun {
  const arrivals = [...input].map((i) => i.start).sort((a, b) => a - b);
  const departures = [...input].map((i) => i.end).sort((a, b) => a - b);
  const ordered = [...input].sort((a, b) => a.start - b.start);
  const steps: IntervalStep[] = [];

  let i = 0;
  let j = 0;
  let concurrent = 0;
  let maxConcurrent = 0;

  steps.push({
    ordered,
    active: -1,
    merged: [],
    concurrent: 0,
    maxConcurrent: 0,
    caption: "Sort arrivals and departures separately, then walk both lists in time order.",
  });

  while (i < arrivals.length) {
    if (arrivals[i] <= departures[j]) {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      const activeIdx = ordered.findIndex((iv) => iv.start === arrivals[i]);
      steps.push({
        ordered,
        active: activeIdx,
        merged: [],
        concurrent,
        maxConcurrent,
        caption: `An arrival at ${arrivals[i]} before the next departure at ${departures[j]}: ${concurrent} in use at once.`,
      });
      i++;
    } else {
      concurrent--;
      steps.push({
        ordered,
        active: -1,
        merged: [],
        concurrent,
        maxConcurrent,
        caption: `A departure at ${departures[j]} frees one up: ${concurrent} still in use.`,
      });
      j++;
    }
  }

  steps.push({
    ordered,
    active: -1,
    merged: [],
    concurrent,
    maxConcurrent,
    caption: `The peak was ${maxConcurrent}, so that many platforms are needed.`,
    done: true,
  });

  return { steps, merged: [], maxConcurrent };
}

/* =========================================================================
 * Sort-then-pair patterns
 * ====================================================================== */

export type PairingMode = "minDiff" | "tywin" | "moves" | "maxIndexSum" | "wave";

export interface PairingStep {
  /** The working array for this frame. */
  values: number[];
  /** Optional second array, for the two-list problems. */
  other?: number[];
  highlight: number[];
  otherHighlight?: number[];
  caption: string;
  /** Running result, meaning depends on the mode. */
  running?: string;
  done?: boolean;
}

export interface PairingRun {
  steps: PairingStep[];
  answer: string;
  /** Numeric answer where one exists, for verification. */
  value: number;
}

/**
 * The problems where sorting is not the answer but the setup for it.
 *
 * All of these are "sort, then a single obvious pass". The interesting part
 * is always the exchange argument for why the sorted pairing is optimal,
 * which the tutorials cover; the code afterwards is trivial, which is
 * exactly the point.
 */
export function pairingSteps(a: number[], b: number[], mode: PairingMode): PairingRun {
  const steps: PairingStep[] = [];

  if (mode === "minDiff") {
    const sorted = [...a].sort((x, y) => x - y);
    let best = Infinity;
    let bestPair: [number, number] = [sorted[0], sorted[1]];

    steps.push({
      values: sorted,
      highlight: [],
      caption: "Sort first. The closest pair must end up adjacent, so only n-1 pairs need checking instead of all n(n-1)/2.",
    });

    for (let i = 0; i < sorted.length - 1; i++) {
      const diff = sorted[i + 1] - sorted[i];
      if (diff < best) {
        best = diff;
        bestPair = [sorted[i], sorted[i + 1]];
      }
      steps.push({
        values: sorted,
        highlight: [i, i + 1],
        caption: `${sorted[i + 1]} - ${sorted[i]} = ${diff}${diff === best ? ", the smallest so far" : ""}.`,
        running: `best = ${best}`,
      });
    }

    steps.push({
      values: sorted,
      highlight: [],
      caption: `The minimum difference is ${best}, between ${bestPair[0]} and ${bestPair[1]}.`,
      running: `best = ${best}`,
      done: true,
    });
    return { steps, answer: `${best} (${bestPair[0]} and ${bestPair[1]})`, value: best };
  }

  if (mode === "tywin") {
    // Pair the strongest of one army against the weakest of the other, to
    // maximise the number of matchups won.
    const mine = [...a].sort((x, y) => x - y);
    const theirs = [...b].sort((x, y) => x - y);
    let wins = 0;
    let i = 0;

    steps.push({
      values: mine,
      other: theirs,
      highlight: [],
      caption: "Sort both armies. Then spend your weakest unit that can still beat their weakest, and never waste a strong one.",
    });

    for (let j = 0; j < theirs.length && i < mine.length; j++) {
      while (i < mine.length && mine[i] <= theirs[j]) {
        steps.push({
          values: mine,
          other: theirs,
          highlight: [i],
          otherHighlight: [j],
          caption: `${mine[i]} cannot beat ${theirs[j]}, so it is spent as a sacrifice.`,
          running: `wins = ${wins}`,
        });
        i++;
      }
      if (i < mine.length) {
        wins++;
        steps.push({
          values: mine,
          other: theirs,
          highlight: [i],
          otherHighlight: [j],
          caption: `${mine[i]} beats ${theirs[j]}. That is a win, and it used the cheapest unit that could do the job.`,
          running: `wins = ${wins}`,
        });
        i++;
      }
    }

    steps.push({
      values: mine,
      other: theirs,
      highlight: [],
      caption: `${wins} matchup${wins === 1 ? "" : "s"} won.`,
      running: `wins = ${wins}`,
      done: true,
    });
    return { steps, answer: `${wins} wins`, value: wins };
  }

  if (mode === "moves") {
    // Minimum total movement to seat passengers in chairs: sort both and
    // pair in order. Any crossing pair can be uncrossed without increasing
    // the total, which is the exchange argument.
    const people = [...a].sort((x, y) => x - y);
    const chairs = [...b].sort((x, y) => x - y);
    let total = 0;

    steps.push({
      values: people,
      other: chairs,
      highlight: [],
      caption: "Sort both lists and pair them in order. Crossed assignments can always be uncrossed without costing more.",
    });

    for (let i = 0; i < people.length; i++) {
      const cost = Math.abs(people[i] - chairs[i]);
      total += cost;
      steps.push({
        values: people,
        other: chairs,
        highlight: [i],
        otherHighlight: [i],
        caption: `Seat ${people[i]} in chair ${chairs[i]}: |${people[i]} - ${chairs[i]}| = ${cost}.`,
        running: `total = ${total}`,
      });
    }

    steps.push({
      values: people,
      other: chairs,
      highlight: [],
      caption: `Minimum total movement is ${total}.`,
      running: `total = ${total}`,
      done: true,
    });
    return { steps, answer: `${total} moves`, value: total };
  }

  if (mode === "maxIndexSum") {
    // Maximum of sum(i * arr[i]) over all rotations. Sorting ascending is
    // optimal for the non-rotating version: pair the largest value with the
    // largest index.
    const sorted = [...a].sort((x, y) => x - y);
    let total = 0;

    steps.push({
      values: sorted,
      highlight: [],
      caption: "To maximise the sum of i × arr[i], give the biggest values the biggest indices. That means sorting ascending.",
    });

    for (let i = 0; i < sorted.length; i++) {
      total += i * sorted[i];
      steps.push({
        values: sorted,
        highlight: [i],
        caption: `${i} × ${sorted[i]} = ${i * sorted[i]}.`,
        running: `sum = ${total}`,
      });
    }

    steps.push({
      values: sorted,
      highlight: [],
      caption: `The maximum is ${total}. Any swap of two values would trade a larger index away from a larger value.`,
      running: `sum = ${total}`,
      done: true,
    });
    return { steps, answer: String(total), value: total };
  }

  // wave: arrange so a[0] >= a[1] <= a[2] >= a[3] ...
  const arr = [...a].sort((x, y) => x - y);
  steps.push({
    values: [...arr],
    highlight: [],
    caption: "Wave form: sort, then swap each adjacent pair. That alone guarantees the up-down-up pattern.",
  });

  for (let i = 0; i + 1 < arr.length; i += 2) {
    [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
    steps.push({
      values: [...arr],
      highlight: [i, i + 1],
      caption: `Swap positions ${i} and ${i + 1}, so ${arr[i]} sits above its neighbours.`,
    });
  }

  steps.push({
    values: [...arr],
    highlight: [],
    caption: "Every even index now holds a value at least as large as both its neighbours.",
    done: true,
  });
  return { steps, answer: arr.join(", "), value: 0 };
}

/** Is this array in valid wave form? Used to verify the generator. */
export function isWaveForm(arr: number[]): boolean {
  for (let i = 0; i < arr.length; i++) {
    if (i % 2 === 0) {
      if (i > 0 && arr[i] < arr[i - 1]) return false;
      if (i + 1 < arr.length && arr[i] < arr[i + 1]) return false;
    }
  }
  return true;
}
