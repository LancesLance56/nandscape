/**
 * Flowcharts for each sorting algorithm.
 *
 * Each one is written to match the code shown in that algorithm's tutorial
 * page line for line, so a reader can hold the two side by side. Where the
 * code has a loop, the chart has a back edge; where the code has an `if`,
 * the chart has a labelled decision.
 *
 * The recursive algorithms are the awkward ones. A flowchart has no way to
 * express "call yourself", so merge and quick sort are drawn as the shape of
 * a single call, with the recursive steps marked as process boxes. That
 * limitation is worth naming in the lesson rather than papering over.
 */

import type { FlowchartSpec } from "./types";

export const BUBBLE_SORT_CHART: FlowchartSpec = {
  title: "Bubble sort",
  nodes: [
    { id: "start", type: "start", text: "Start" },
    { id: "init", type: "process", text: "pass = 0", note: "One pass per element, minus one." },
    { id: "outer", type: "decision", text: "pass < n-1 ?" },
    { id: "reset", type: "process", text: "i = 0\nswapped = false", note: "swapped is what allows the early exit." },
    { id: "inner", type: "decision", text: "i < n-1-pass ?", note: "The tail is already sorted, so each pass looks at one fewer element." },
    { id: "cmp", type: "decision", text: "a[i] > a[i+1] ?" },
    { id: "swap", type: "process", text: "swap a[i], a[i+1]\nswapped = true" },
    { id: "inc-i", type: "process", text: "i = i + 1" },
    { id: "check", type: "decision", text: "swapped ?", note: "A whole pass with no swaps means the array is already ordered." },
    { id: "inc-pass", type: "process", text: "pass = pass + 1" },
    { id: "end", type: "end", text: "Sorted" },
  ],
  edges: [
    { from: "start", to: "init" },
    { from: "init", to: "outer" },
    { from: "outer", to: "reset", label: "yes" },
    { from: "outer", to: "end", label: "no" },
    { from: "reset", to: "inner" },
    { from: "inner", to: "cmp", label: "yes" },
    { from: "inner", to: "check", label: "no" },
    { from: "cmp", to: "swap", label: "yes" },
    { from: "cmp", to: "inc-i", label: "no" },
    { from: "swap", to: "inc-i" },
    { from: "inc-i", to: "inner" },
    { from: "check", to: "inc-pass", label: "yes" },
    { from: "check", to: "end", label: "no" },
    { from: "inc-pass", to: "outer" },
  ],
};

export const SELECTION_SORT_CHART: FlowchartSpec = {
  title: "Selection sort",
  nodes: [
    { id: "start", type: "start", text: "Start" },
    { id: "init", type: "process", text: "i = 0" },
    { id: "outer", type: "decision", text: "i < n-1 ?" },
    { id: "setmin", type: "process", text: "min = i\nj = i + 1", note: "Assume the first unsorted element is the smallest until proven otherwise." },
    { id: "inner", type: "decision", text: "j < n ?" },
    { id: "cmp", type: "decision", text: "a[j] < a[min] ?" },
    { id: "newmin", type: "process", text: "min = j", note: "Only the index is recorded. Nothing moves during the scan." },
    { id: "inc-j", type: "process", text: "j = j + 1" },
    { id: "swap", type: "process", text: "swap a[i], a[min]", note: "Exactly one swap per outer iteration, which is the algorithm's whole selling point." },
    { id: "inc-i", type: "process", text: "i = i + 1" },
    { id: "end", type: "end", text: "Sorted" },
  ],
  edges: [
    { from: "start", to: "init" },
    { from: "init", to: "outer" },
    { from: "outer", to: "setmin", label: "yes" },
    { from: "outer", to: "end", label: "no" },
    { from: "setmin", to: "inner" },
    { from: "inner", to: "cmp", label: "yes" },
    { from: "inner", to: "swap", label: "no" },
    { from: "cmp", to: "newmin", label: "yes" },
    { from: "cmp", to: "inc-j", label: "no" },
    { from: "newmin", to: "inc-j" },
    { from: "inc-j", to: "inner" },
    { from: "swap", to: "inc-i" },
    { from: "inc-i", to: "outer" },
  ],
};

export const INSERTION_SORT_CHART: FlowchartSpec = {
  title: "Insertion sort",
  nodes: [
    { id: "start", type: "start", text: "Start" },
    { id: "init", type: "process", text: "i = 1", note: "A single element is already a sorted prefix, so start at the second." },
    { id: "outer", type: "decision", text: "i < n ?" },
    { id: "take", type: "process", text: "value = a[i]\nj = i - 1", note: "value is held outside the array while the shifting happens." },
    { id: "inner", type: "decision", text: "j >= 0 and\na[j] > value ?" },
    { id: "shift", type: "process", text: "a[j+1] = a[j]\nj = j - 1", note: "Shifting, not swapping. Each step moves one element right by one." },
    { id: "place", type: "process", text: "a[j+1] = value", note: "The gap left by shifting is exactly where value belongs." },
    { id: "inc-i", type: "process", text: "i = i + 1" },
    { id: "end", type: "end", text: "Sorted" },
  ],
  edges: [
    { from: "start", to: "init" },
    { from: "init", to: "outer" },
    { from: "outer", to: "take", label: "yes" },
    { from: "outer", to: "end", label: "no" },
    { from: "take", to: "inner" },
    { from: "inner", to: "shift", label: "yes" },
    { from: "inner", to: "place", label: "no" },
    { from: "shift", to: "inner" },
    { from: "place", to: "inc-i" },
    { from: "inc-i", to: "outer" },
  ],
};

export const MERGE_SORT_CHART: FlowchartSpec = {
  title: "Merge sort (one call)",
  nodes: [
    { id: "start", type: "start", text: "mergeSort(a)" },
    { id: "base", type: "decision", text: "length <= 1 ?", note: "The base case. A single element is already sorted, and this is what stops the recursion." },
    { id: "ret", type: "end", text: "return a", note: "Returning here is what lets the level above start merging." },
    { id: "split", type: "process", text: "mid = length / 2", note: "The split is positional and never looks at the values, which is why merge sort's cost is the same for every input." },
    { id: "left", type: "process", text: "left = mergeSort(a[0..mid])", note: "This call runs to completion, all the way down, before the right half is touched at all." },
    { id: "right", type: "process", text: "right = mergeSort(a[mid..])", note: "Only reached once the entire left subtree has finished and returned." },
    { id: "merge", type: "process", text: "return merge(left, right)", note: "Both halves are sorted by now, so one linear pass combines them." },
  ],
  edges: [
    { from: "start", to: "base" },
    { from: "base", to: "ret", label: "yes" },
    { from: "base", to: "split", label: "no" },
    { from: "split", to: "left" },
    { from: "left", to: "right" },
    { from: "right", to: "merge" },
  ],
};

export const MERGE_STEP_CHART: FlowchartSpec = {
  title: "The merge step",
  nodes: [
    { id: "start", type: "start", text: "merge(left, right)" },
    { id: "init", type: "process", text: "i = 0, j = 0\nout = []" },
    { id: "both", type: "decision", text: "i < left.len and\nj < right.len ?" },
    { id: "cmp", type: "decision", text: "left[i] <= right[j] ?", note: "<= and not <. On a tie the left value is taken first, which is exactly what makes merge sort stable." },
    { id: "takeL", type: "process", text: "out.push(left[i])\ni = i + 1" },
    { id: "takeR", type: "process", text: "out.push(right[j])\nj = j + 1" },
    { id: "drainL", type: "process", text: "append rest of left", note: "At most one of these two runs: whichever side still has elements." },
    { id: "drainR", type: "process", text: "append rest of right" },
    { id: "end", type: "end", text: "return out" },
  ],
  edges: [
    { from: "start", to: "init" },
    { from: "init", to: "both" },
    { from: "both", to: "cmp", label: "yes" },
    { from: "both", to: "drainL", label: "no" },
    { from: "cmp", to: "takeL", label: "yes" },
    { from: "cmp", to: "takeR", label: "no" },
    { from: "takeL", to: "both" },
    { from: "takeR", to: "both" },
    { from: "drainL", to: "drainR" },
    { from: "drainR", to: "end" },
  ],
};

export const QUICK_SORT_CHART: FlowchartSpec = {
  title: "Quick sort (one call)",
  nodes: [
    { id: "start", type: "start", text: "quickSort(a, low, high)" },
    { id: "base", type: "decision", text: "low >= high ?", note: "A range of zero or one element is already sorted." },
    { id: "ret", type: "end", text: "return" },
    { id: "part", type: "process", text: "p = partition(a, low, high)", note: "All the work happens here. After it returns, a[p] is in its final position permanently." },
    { id: "left", type: "process", text: "quickSort(a, low, p-1)" },
    { id: "right", type: "process", text: "quickSort(a, p+1, high)", note: "Note that p itself is excluded from both calls: it is already done." },
    { id: "end", type: "end", text: "return" },
  ],
  edges: [
    { from: "start", to: "base" },
    { from: "base", to: "ret", label: "yes" },
    { from: "base", to: "part", label: "no" },
    { from: "part", to: "left" },
    { from: "left", to: "right" },
    { from: "right", to: "end" },
  ],
};

export const PARTITION_CHART: FlowchartSpec = {
  title: "Lomuto partition",
  nodes: [
    { id: "start", type: "start", text: "partition(a, low, high)" },
    { id: "init", type: "process", text: "pivot = a[high]\ni = low - 1\nj = low", note: "i marks the end of the 'smaller than pivot' region, which starts empty." },
    { id: "loop", type: "decision", text: "j < high ?" },
    { id: "cmp", type: "decision", text: "a[j] < pivot ?" },
    { id: "grow", type: "process", text: "i = i + 1\nswap a[i], a[j]", note: "Grow the smaller region by one and move this element into it." },
    { id: "inc", type: "process", text: "j = j + 1" },
    { id: "final", type: "process", text: "swap a[i+1], a[high]", note: "Drop the pivot into the boundary between the two regions." },
    { id: "end", type: "end", text: "return i + 1" },
  ],
  edges: [
    { from: "start", to: "init" },
    { from: "init", to: "loop" },
    { from: "loop", to: "cmp", label: "yes" },
    { from: "loop", to: "final", label: "no" },
    { from: "cmp", to: "grow", label: "yes" },
    { from: "cmp", to: "inc", label: "no" },
    { from: "grow", to: "inc" },
    { from: "inc", to: "loop" },
    { from: "final", to: "end" },
  ],
};

export const HEAP_SORT_CHART: FlowchartSpec = {
  title: "Heap sort",
  nodes: [
    { id: "start", type: "start", text: "Start" },
    { id: "buildinit", type: "process", text: "i = n/2 - 1", note: "The last internal node. Everything after it is a leaf, and a leaf is already a valid heap." },
    { id: "buildloop", type: "decision", text: "i >= 0 ?" },
    { id: "sift1", type: "process", text: "siftDown(a, i, n-1)" },
    { id: "dec-i", type: "process", text: "i = i - 1" },
    { id: "endinit", type: "process", text: "end = n - 1", note: "The heap is built. Now repeatedly extract the maximum." },
    { id: "sortloop", type: "decision", text: "end > 0 ?" },
    { id: "swap", type: "process", text: "swap a[0], a[end]", note: "a[0] is the largest remaining value, and a[end] is exactly where it belongs." },
    { id: "sift2", type: "process", text: "siftDown(a, 0, end-1)", note: "Restore the heap over the shrunken range." },
    { id: "dec-end", type: "process", text: "end = end - 1" },
    { id: "end", type: "end", text: "Sorted" },
  ],
  edges: [
    { from: "start", to: "buildinit" },
    { from: "buildinit", to: "buildloop" },
    { from: "buildloop", to: "sift1", label: "yes" },
    { from: "buildloop", to: "endinit", label: "no" },
    { from: "sift1", to: "dec-i" },
    { from: "dec-i", to: "buildloop" },
    { from: "endinit", to: "sortloop" },
    { from: "sortloop", to: "swap", label: "yes" },
    { from: "sortloop", to: "end", label: "no" },
    { from: "swap", to: "sift2" },
    { from: "sift2", to: "dec-end" },
    { from: "dec-end", to: "sortloop" },
  ],
};

export const COUNTING_SORT_CHART: FlowchartSpec = {
  title: "Counting sort",
  nodes: [
    { id: "start", type: "start", text: "Start" },
    { id: "alloc", type: "process", text: "counts = array of k zeros", note: "One bucket per possible value. This is why k must be small." },
    { id: "countinit", type: "process", text: "i = 0" },
    { id: "countloop", type: "decision", text: "i < n ?" },
    { id: "tally", type: "process", text: "counts[a[i]] += 1\ni = i + 1", note: "No comparison happens anywhere in this algorithm. The value is used directly as an index." },
    { id: "writeinit", type: "process", text: "write = 0\nvalue = 0" },
    { id: "outer", type: "decision", text: "value < k ?" },
    { id: "inner", type: "decision", text: "counts[value] > 0 ?" },
    { id: "emit", type: "process", text: "a[write] = value\nwrite += 1\ncounts[value] -= 1" },
    { id: "next", type: "process", text: "value = value + 1" },
    { id: "end", type: "end", text: "Sorted" },
  ],
  edges: [
    { from: "start", to: "alloc" },
    { from: "alloc", to: "countinit" },
    { from: "countinit", to: "countloop" },
    { from: "countloop", to: "tally", label: "yes" },
    { from: "countloop", to: "writeinit", label: "no" },
    { from: "tally", to: "countloop" },
    { from: "writeinit", to: "outer" },
    { from: "outer", to: "inner", label: "yes" },
    { from: "outer", to: "end", label: "no" },
    { from: "inner", to: "emit", label: "yes" },
    { from: "inner", to: "next", label: "no" },
    { from: "emit", to: "inner" },
    { from: "next", to: "outer" },
  ],
};

export const SORTING_CHARTS: Record<string, FlowchartSpec> = {
  bubble: BUBBLE_SORT_CHART,
  selection: SELECTION_SORT_CHART,
  insertion: INSERTION_SORT_CHART,
  merge: MERGE_SORT_CHART,
  "merge-step": MERGE_STEP_CHART,
  quick: QUICK_SORT_CHART,
  partition: PARTITION_CHART,
  heap: HEAP_SORT_CHART,
  counting: COUNTING_SORT_CHART,
};

/** A small starting chart for the maker tool. */
export const STARTER_CHART: FlowchartSpec = {
  title: "Untitled flowchart",
  nodes: [
    { id: "start", type: "start", text: "Start" },
    { id: "step", type: "process", text: "Do something" },
    { id: "check", type: "decision", text: "Condition ?" },
    { id: "again", type: "process", text: "Try again" },
    { id: "end", type: "end", text: "End" },
  ],
  edges: [
    { from: "start", to: "step" },
    { from: "step", to: "check" },
    { from: "check", to: "end", label: "yes" },
    { from: "check", to: "again", label: "no" },
    { from: "again", to: "step" },
  ],
};
