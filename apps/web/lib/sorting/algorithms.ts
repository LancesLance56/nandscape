/**
 * Traced sorting algorithms.
 *
 * Each one is written the way it would be written normally, with recorder
 * calls added at the points where something happens worth seeing. The goal
 * is that reading the code here teaches the same algorithm the tutorial
 * describes, rather than a visualisation-shaped variant of it.
 */

import {
  createSortRecorder,
  type SortAlgorithmId,
  type SortRun,
} from "./types";

/* -------------------------------------------------------------------------
 * Elementary sorts
 * ---------------------------------------------------------------------- */

export function bubbleSortSteps(input: number[]): SortRun {
  const a = [...input];
  const rec = createSortRecorder(a);
  const n = a.length;
  const sorted: number[] = [];

  rec.push(a, "Bubble sort: repeatedly walk the array, swapping any pair that is out of order.");

  for (let pass = 0; pass < n - 1; pass++) {
    let swappedThisPass = false;

    for (let i = 0; i < n - 1 - pass; i++) {
      rec.countCompare();
      if (!rec.push(a, `Compare ${a[i]} and ${a[i + 1]}.`, { comparing: [i, i + 1], sorted: [...sorted] })) {
        return rec.finish();
      }

      if (a[i] > a[i + 1]) {
        [a[i], a[i + 1]] = [a[i + 1], a[i]];
        rec.countWrite(2);
        swappedThisPass = true;
        if (!rec.push(a, `${a[i + 1]} was larger, so swap them.`, { writing: [i, i + 1], sorted: [...sorted] })) {
          return rec.finish();
        }
      }
    }

    // After pass p, the largest p+1 values have bubbled to the end for good.
    sorted.unshift(n - 1 - pass);

    if (!swappedThisPass) {
      // No swaps in a whole pass means the array is already ordered. This
      // early exit is what makes bubble sort O(n) on sorted input.
      for (let k = 0; k < n - 1 - pass; k++) sorted.unshift(k);
      rec.push(a, "A full pass with no swaps, so the array is sorted. Stop early.", { sorted: [...sorted] });
      return rec.finish();
    }
  }

  rec.push(a, "Sorted.", { sorted: Array.from({ length: n }, (_, i) => i) });
  return rec.finish();
}

export function selectionSortSteps(input: number[]): SortRun {
  const a = [...input];
  const rec = createSortRecorder(a);
  const n = a.length;
  const sorted: number[] = [];

  rec.push(a, "Selection sort: find the smallest remaining value and put it in place.");

  for (let i = 0; i < n - 1; i++) {
    let minIndex = i;

    for (let j = i + 1; j < n; j++) {
      rec.countCompare();
      if (
        !rec.push(a, `Is ${a[j]} smaller than the current smallest, ${a[minIndex]}?`, {
          comparing: [j, minIndex],
          pointers: { start: i, min: minIndex },
          sorted: [...sorted],
        })
      ) {
        return rec.finish();
      }
      if (a[j] < a[minIndex]) minIndex = j;
    }

    if (minIndex !== i) {
      [a[i], a[minIndex]] = [a[minIndex], a[i]];
      rec.countWrite(2);
    }
    sorted.push(i);
    if (
      !rec.push(a, `${a[i]} is the smallest of what was left, so it belongs at position ${i}.`, {
        writing: minIndex !== i ? [i, minIndex] : [],
        sorted: [...sorted],
      })
    ) {
      return rec.finish();
    }
  }

  rec.push(a, "Sorted. Selection sort always does exactly n-1 swaps, however jumbled the input.", {
    sorted: Array.from({ length: n }, (_, i) => i),
  });
  return rec.finish();
}

export function insertionSortSteps(input: number[]): SortRun {
  const a = [...input];
  const rec = createSortRecorder(a);
  const n = a.length;

  rec.push(a, "Insertion sort: grow a sorted prefix by inserting each new value into it.", { sorted: [0] });

  for (let i = 1; i < n; i++) {
    const value = a[i];
    let j = i - 1;
    const prefix = () => Array.from({ length: i }, (_, k) => k);
    // While the shifting loop runs, `value` is held in a register and its
    // old slot has been overwritten, so the array genuinely contains a
    // duplicate for a moment. Surfacing the held value keeps that legible
    // rather than looking like a rendering glitch.
    const holding = { label: "holding", values: [value] };

    if (!rec.push(a, `Take ${value} out and slide it back into the sorted prefix.`, {
      comparing: [i],
      pointers: { current: i },
      sorted: prefix(),
      aux: holding,
    })) {
      return rec.finish();
    }

    while (j >= 0) {
      rec.countCompare();
      if (a[j] <= value) break;

      a[j + 1] = a[j];
      rec.countWrite();
      if (
        !rec.push(a, `${a[j]} is bigger than ${value}, so shift it right.`, {
          writing: [j + 1],
          pointers: { current: j },
          sorted: prefix(),
          aux: holding,
        })
      ) {
        return rec.finish();
      }
      j--;
    }

    a[j + 1] = value;
    rec.countWrite();
    if (
      !rec.push(a, `${value} settles at position ${j + 1}.`, {
        writing: [j + 1],
        sorted: Array.from({ length: i + 1 }, (_, k) => k),
      })
    ) {
      return rec.finish();
    }
  }

  rec.push(a, "Sorted.", { sorted: Array.from({ length: n }, (_, i) => i) });
  return rec.finish();
}

/* -------------------------------------------------------------------------
 * Merge sort
 * ---------------------------------------------------------------------- */

export function mergeSortSteps(input: number[]): SortRun {
  const a = [...input];
  const rec = createSortRecorder(a);
  const n = a.length;

  rec.push(a, "Merge sort: split until the pieces are trivially sorted, then merge them back together.");

  const sortRange = (start: number, end: number): void => {
    if (start >= end || rec.stopped) return;

    const mid = Math.floor((start + end) / 2);
    rec.push(a, `Split [${start}..${end}] into [${start}..${mid}] and [${mid + 1}..${end}].`, {
      range: { start, end },
      pointers: { mid },
    });

    sortRange(start, mid);
    sortRange(mid + 1, end);
    if (rec.stopped) return;

    merge(start, mid, end);
  };

  const merge = (start: number, mid: number, end: number): void => {
    const left = a.slice(start, mid + 1);
    const right = a.slice(mid + 1, end + 1);
    const buffer: (number | null)[] = new Array(end - start + 1).fill(null);

    let i = 0;
    let j = 0;
    let k = 0;

    while (i < left.length && j < right.length) {
      rec.countCompare();
      // <= rather than < is what makes merge sort stable: on a tie the value
      // from the left half, which started earlier, is taken first.
      const takeLeft = left[i] <= right[j];
      buffer[k] = takeLeft ? left[i] : right[j];

      if (
        !rec.push(a, `Compare ${left[i]} and ${right[j]}; take ${buffer[k]}.`, {
          range: { start, end },
          comparing: [start + i, mid + 1 + j],
          aux: { label: "merge buffer", values: [...buffer], highlight: [k] },
        })
      ) {
        return;
      }

      if (takeLeft) i++;
      else j++;
      k++;
    }

    while (i < left.length) {
      buffer[k] = left[i];
      if (!rec.push(a, `Right half is empty, so copy the rest of the left half.`, {
        range: { start, end },
        aux: { label: "merge buffer", values: [...buffer], highlight: [k] },
      })) {
        return;
      }
      i++;
      k++;
    }
    while (j < right.length) {
      buffer[k] = right[j];
      if (!rec.push(a, `Left half is empty, so copy the rest of the right half.`, {
        range: { start, end },
        aux: { label: "merge buffer", values: [...buffer], highlight: [k] },
      })) {
        return;
      }
      j++;
      k++;
    }

    for (let t = 0; t < buffer.length; t++) {
      a[start + t] = buffer[t] as number;
      rec.countWrite();
    }

    rec.push(a, `Copy the merged run back into [${start}..${end}].`, {
      range: { start, end },
      writing: Array.from({ length: buffer.length }, (_, t) => start + t),
    });
  };

  sortRange(0, n - 1);
  if (!rec.stopped) {
    rec.push(a, "Sorted. Every merge was O(n) and there are log n levels of them.", {
      sorted: Array.from({ length: n }, (_, i) => i),
    });
  }
  return rec.finish();
}

/* -------------------------------------------------------------------------
 * Quick sort (Lomuto partition, last element as pivot)
 * ---------------------------------------------------------------------- */

export function quickSortSteps(input: number[]): SortRun {
  const a = [...input];
  const rec = createSortRecorder(a);
  const n = a.length;
  const settled: number[] = [];

  rec.push(a, "Quick sort: pick a pivot, move everything smaller to its left, then recurse on each side.");

  const partition = (low: number, high: number): number => {
    const pivot = a[high];
    let i = low - 1;

    rec.push(a, `Partition [${low}..${high}] around the pivot ${pivot}.`, {
      range: { start: low, end: high },
      pointers: { pivot: high },
      sorted: [...settled],
    });

    for (let j = low; j < high; j++) {
      rec.countCompare();
      if (
        !rec.push(a, `Is ${a[j]} below the pivot ${pivot}?`, {
          range: { start: low, end: high },
          comparing: [j, high],
          pointers: { i: Math.max(i, low), j, pivot: high },
          sorted: [...settled],
        })
      ) {
        return i + 1;
      }

      if (a[j] < pivot) {
        i++;
        if (i !== j) {
          [a[i], a[j]] = [a[j], a[i]];
          rec.countWrite(2);
          if (
            !rec.push(a, `Yes, so swap it into the "smaller than pivot" region.`, {
              range: { start: low, end: high },
              writing: [i, j],
              pointers: { i, j, pivot: high },
              sorted: [...settled],
            })
          ) {
            return i + 1;
          }
        }
      }
    }

    [a[i + 1], a[high]] = [a[high], a[i + 1]];
    rec.countWrite(2);
    settled.push(i + 1);
    rec.push(a, `Drop the pivot into position ${i + 1}. It is now in its final place for good.`, {
      range: { start: low, end: high },
      writing: [i + 1, high],
      sorted: [...settled],
    });
    return i + 1;
  };

  const sortRange = (low: number, high: number): void => {
    if (low >= high || rec.stopped) {
      // A range of one is already sorted; mark it so the bars settle.
      if (low === high && !settled.includes(low)) settled.push(low);
      return;
    }
    const p = partition(low, high);
    if (rec.stopped) return;
    sortRange(low, p - 1);
    sortRange(p + 1, high);
  };

  sortRange(0, n - 1);
  if (!rec.stopped) {
    rec.push(a, "Sorted. Each pivot landed in its final position the moment it was placed.", {
      sorted: Array.from({ length: n }, (_, i) => i),
    });
  }
  return rec.finish();
}

/* -------------------------------------------------------------------------
 * Heap sort
 * ---------------------------------------------------------------------- */

export function heapSortSteps(input: number[]): SortRun {
  const a = [...input];
  const rec = createSortRecorder(a);
  const n = a.length;
  const sorted: number[] = [];

  rec.push(a, "Heap sort: turn the array into a max-heap, then repeatedly move the root to the end.");

  const siftDown = (start: number, end: number): void => {
    let root = start;

    while (true) {
      const left = 2 * root + 1;
      const right = left + 1;
      let largest = root;

      if (left <= end) {
        rec.countCompare();
        if (a[left] > a[largest]) largest = left;
      }
      if (right <= end) {
        rec.countCompare();
        if (a[right] > a[largest]) largest = right;
      }

      if (largest === root) return;

      if (
        !rec.push(a, `${a[largest]} is bigger than its parent ${a[root]}, so swap them down the heap.`, {
          comparing: [root, largest],
          pointers: { root, child: largest },
          sorted: [...sorted],
        })
      ) {
        return;
      }

      [a[root], a[largest]] = [a[largest], a[root]];
      rec.countWrite(2);
      root = largest;
      if (rec.stopped) return;
    }
  };

  // Build the heap bottom-up. Leaves are already valid heaps, so start at
  // the last internal node; this is the O(n) build, not n inserts.
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    rec.push(a, `Sift node ${i} down to restore the heap property below it.`, { pointers: { root: i } });
    siftDown(i, n - 1);
    if (rec.stopped) return rec.finish();
  }

  rec.push(a, "The array is now a max-heap: every parent is at least as large as its children.");

  for (let end = n - 1; end > 0; end--) {
    [a[0], a[end]] = [a[end], a[0]];
    rec.countWrite(2);
    sorted.unshift(end);
    if (
      !rec.push(a, `The root ${a[end]} is the largest remaining value, so move it to position ${end}.`, {
        writing: [0, end],
        sorted: [...sorted],
      })
    ) {
      return rec.finish();
    }
    siftDown(0, end - 1);
    if (rec.stopped) return rec.finish();
  }

  rec.push(a, "Sorted, in place, with an O(n log n) worst case.", {
    sorted: Array.from({ length: n }, (_, i) => i),
  });
  return rec.finish();
}

/* -------------------------------------------------------------------------
 * Counting sort (not a comparison sort)
 * ---------------------------------------------------------------------- */

export function countingSortSteps(input: number[]): SortRun {
  const a = [...input];
  const rec = createSortRecorder(a);
  const n = a.length;
  if (n === 0) return rec.finish();

  // One bucket per distinct value. Bucketing by a digit instead would be a
  // radix pass, not a counting sort: values sharing a bucket would come
  // back out in whatever order they went in, which is only sorted if you
  // then sort within the bucket. The k buckets are why counting sort needs
  // a small integer range, and why the widget feeds it small values.
  const k = Math.max(...a) + 1;
  const counts = new Array(k).fill(0);

  rec.push(a, `Counting sort: no comparisons at all. One bucket per distinct value, then read the buckets out in order.`, {
    aux: { label: "counts", values: [...counts] },
  });

  for (let i = 0; i < n; i++) {
    counts[a[i]]++;
    if (
      !rec.push(a, `${a[i]} goes in bucket ${a[i]}.`, {
        comparing: [i],
        aux: { label: "counts", values: [...counts], highlight: [a[i]] },
      })
    ) {
      return rec.finish();
    }
  }

  // Bucket contents are captured from a snapshot taken before any writing
  // starts. Reading them out of `a` as it is overwritten would sample
  // values that have already been replaced.
  const source = [...a];
  const byBucket: number[][] = Array.from({ length: k }, () => []);
  // Pushing in input order is exactly what makes counting sort stable:
  // equal keys leave the bucket in the order they entered it.
  for (const v of source) byBucket[v].push(v);

  let write = 0;
  for (let bucket = 0; bucket < k; bucket++) {
    for (let c = 0; c < byBucket[bucket].length; c++) {
      a[write] = byBucket[bucket][c];
      rec.countWrite();
      if (
        !rec.push(a, `Bucket ${bucket} holds ${byBucket[bucket].length} value(s); write out ${byBucket[bucket][c]}.`, {
          writing: [write],
          sorted: Array.from({ length: write }, (_, i) => i),
          aux: { label: "counts", values: [...counts], highlight: [bucket] },
        })
      ) {
        return rec.finish();
      }
      write++;
    }
  }

  rec.push(a, `Sorted in O(n + k) with zero comparisons, so the n log n bound simply does not apply.`, {
    sorted: Array.from({ length: n }, (_, i) => i),
    aux: { label: "counts", values: [...counts] },
  });
  return rec.finish();
}

/* -------------------------------------------------------------------------
 * Dispatch
 * ---------------------------------------------------------------------- */

export function runSort(id: SortAlgorithmId, input: number[]): SortRun {
  switch (id) {
    case "bubble":
      return bubbleSortSteps(input);
    case "selection":
      return selectionSortSteps(input);
    case "insertion":
      return insertionSortSteps(input);
    case "merge":
      return mergeSortSteps(input);
    case "quick":
      return quickSortSteps(input);
    case "heap":
      return heapSortSteps(input);
    case "counting":
      return countingSortSteps(input);
    default:
      return bubbleSortSteps(input);
  }
}

/** Final counters without recording frames, for the comparison table. */
export function sortCost(id: SortAlgorithmId, input: number[]): { comparisons: number; writes: number } {
  const run = runSort(id, input);
  const last = run.steps[run.steps.length - 1];
  return { comparisons: last?.comparisons ?? 0, writes: last?.writes ?? 0 };
}
