/**
 * Shared vocabulary for the sorting widgets.
 *
 * Every algorithm records the same shape of frame, so one bar-chart renderer
 * can draw bubble sort and heap sort without knowing anything about either.
 * The frame carries the whole array rather than a diff: these arrays are
 * small, and a self-contained frame means scrubbing backwards is free
 * instead of needing the run replayed from the start.
 */

export interface AuxView {
  label: string;
  /** null renders as an empty slot, which is what a half-filled merge buffer is. */
  values: (number | null)[];
  highlight?: number[];
}

export interface SortStep {
  array: number[];
  /** Indices being compared this frame. */
  comparing: number[];
  /** Indices written to this frame (a swap writes two). */
  writing: number[];
  /** Indices known to be in their final position. */
  sorted: number[];
  /** The subrange currently being worked on, for divide-and-conquer. */
  range?: { start: number; end: number };
  /** Named index markers drawn under the bars, e.g. { i: 2, j: 7, pivot: 9 }. */
  pointers?: Record<string, number>;
  /** A merge buffer, a heap view, or counting buckets. */
  aux?: AuxView;
  /**
   * Index into the algorithm's `pseudocode`, for the layouts that show the
   * source beside the bars. Optional: a frame that narrates a phase rather
   * than a statement ("the array is now a max-heap") has no single line.
   */
  line?: number;
  caption: string;
  comparisons: number;
  writes: number;
}

export interface SortRun {
  steps: SortStep[];
  /** True when the run hit the frame cap and stopped early. */
  truncated: boolean;
}

/**
 * Frame cap. Bubble sort on 40 elements is already ~1600 comparisons, and
 * nobody scrubs through that; the widgets keep arrays small enough that this
 * is rarely hit, and say so plainly when it is.
 */
export const MAX_SORT_STEPS = 900;

export type SortAlgorithmId =
  | "bubble"
  | "selection"
  | "insertion"
  | "merge"
  | "quick"
  | "heap"
  | "counting";

export interface AlgorithmMeta {
  id: SortAlgorithmId;
  label: string;
  /** Best / average / worst, as display strings. */
  time: [string, string, string];
  space: string;
  stable: boolean;
  inPlace: boolean;
  /** One line on when you would actually reach for it. */
  note: string;
  /** The family it belongs to, shown next to the name. */
  tagline: string;
  /** Reasons to reach for it, one clause each. */
  goodFor: string[];
  /** Reasons not to, same shape. */
  watchOut: string[];
  /**
   * The algorithm as source, one entry per line. `SortStep.line` indexes into
   * this, so the two have to be edited together: renumbering a line here
   * without updating the recorder calls in `algorithms.ts` silently
   * highlights the wrong statement.
   */
  pseudocode: string[];
}

export const ALGORITHMS: AlgorithmMeta[] = [
  {
    id: "bubble",
    label: "Bubble sort",
    time: ["O(n)", "O(n²)", "O(n²)"],
    space: "O(1)",
    stable: true,
    inPlace: true,
    note: "Only worth knowing as a starting point. The early-exit version is O(n) on already-sorted input.",
    tagline: "exchange sort",
    goodFor: [
      "Showing what a loop invariant buys you, on the smallest possible example",
      "Noticing an already-sorted array in a single pass",
    ],
    watchOut: [
      "About n²/2 comparisons on anything genuinely shuffled",
      "Moves data far more than selection sort does for the same result",
    ],
    pseudocode: [
      "for pass in 0 .. n-2:",
      "  swapped = false",
      "  for i in 0 .. n-2-pass:",
      "    if a[i] > a[i+1]:",
      "      swap a[i], a[i+1];  swapped = true",
      "  if not swapped: stop",
    ],
  },
  {
    id: "selection",
    label: "Selection sort",
    time: ["O(n²)", "O(n²)", "O(n²)"],
    space: "O(1)",
    stable: false,
    inPlace: true,
    note: "Does the fewest writes of any simple sort: exactly n-1 swaps, which matters if writing is expensive.",
    tagline: "selection",
    goodFor: [
      "Exactly n-1 swaps, whatever the input looks like",
      "Sorting where a write costs far more than a read",
    ],
    watchOut: [
      "Always n²/2 comparisons, even on sorted input",
      "Not stable: the long swap jumps equal keys past each other",
    ],
    pseudocode: [
      "for i in 0 .. n-2:",
      "  min = i",
      "  for j in i+1 .. n-1:",
      "    if a[j] < a[min]: min = j",
      "  swap a[i], a[min]",
    ],
  },
  {
    id: "insertion",
    label: "Insertion sort",
    time: ["O(n)", "O(n²)", "O(n²)"],
    space: "O(1)",
    stable: true,
    inPlace: true,
    note: "Genuinely useful. Fast on small or nearly-sorted arrays, which is why real sorts fall back to it.",
    tagline: "incremental",
    goodFor: [
      "Small arrays, which is why real sorts fall back to it",
      "Nearly sorted input: linear in the number of inversions",
    ],
    watchOut: [
      "Quadratic the moment the input is properly shuffled",
      "Every insert shifts a whole run one slot right",
    ],
    pseudocode: [
      "for i in 1 .. n-1:",
      "  value = a[i]",
      "  j = i - 1",
      "  while j >= 0 and a[j] > value:",
      "    a[j+1] = a[j];  j -= 1",
      "  a[j+1] = value",
    ],
  },
  {
    id: "merge",
    label: "Merge sort",
    time: ["O(n log n)", "O(n log n)", "O(n log n)"],
    space: "O(n)",
    stable: true,
    inPlace: false,
    note: "Predictable and stable, at the cost of a scratch array. The basis of external and parallel sorting.",
    tagline: "divide and conquer",
    goodFor: [
      "A guaranteed O(n log n): the input shape changes nothing",
      "Stability, and the basis of external and parallel sorting",
    ],
    watchOut: [
      "Needs an O(n) scratch buffer the other sorts do without",
      "Loses to quick sort in cache-bound benchmarks",
    ],
    pseudocode: [
      "sort(lo, hi):",
      "  if lo >= hi: return",
      "  mid = (lo + hi) / 2",
      "  sort(lo, mid);  sort(mid+1, hi)",
      "  merge(lo, mid, hi):",
      "    while both halves have values:",
      "      take the smaller into buf",
      "    copy leftovers, then buf back",
    ],
  },
  {
    id: "quick",
    label: "Quick sort",
    time: ["O(n log n)", "O(n log n)", "O(n²)"],
    space: "O(log n)",
    stable: false,
    inPlace: true,
    note: "Usually the fastest in practice thanks to cache behaviour, but the worst case is real without a good pivot.",
    tagline: "divide and conquer",
    goodFor: [
      "Usually fastest in practice: sequential access, no scratch array",
      "Each pass settles one pivot permanently",
    ],
    watchOut: [
      "O(n²) when the pivot keeps splitting one-against-the-rest",
      "Sorted input is that worst case, for a last-element pivot",
    ],
    pseudocode: [
      "sort(lo, hi):",
      "  if lo >= hi: return",
      "  p = partition(lo, hi)",
      "  sort(lo, p-1);  sort(p+1, hi)",
      "partition(lo, hi):",
      "  pivot = a[hi];  i = lo - 1",
      "  for j in lo .. hi-1:",
      "    if a[j] < pivot: i += 1; swap a[i], a[j]",
      "  swap a[i+1], a[hi];  return i+1",
    ],
  },
  {
    id: "heap",
    label: "Heap sort",
    time: ["O(n log n)", "O(n log n)", "O(n log n)"],
    space: "O(1)",
    stable: false,
    inPlace: true,
    note: "The only common sort that is both O(n log n) worst case and in place. Poor cache locality keeps it off the podium.",
    tagline: "selection, with a heap",
    goodFor: [
      "O(n log n) worst case and O(1) extra space at once",
      "The safety net quick sort falls back to, which is introsort",
    ],
    watchOut: [
      "Sift-down jumps around memory, so cache misses dominate",
      "Not stable",
    ],
    pseudocode: [
      "for i = n/2 - 1 down to 0:",
      "  siftDown(i, n-1)",
      "for end = n-1 down to 1:",
      "  swap a[0], a[end]",
      "  siftDown(0, end-1)",
      "siftDown(root, end):",
      "  largest = bigger of root and its children",
      "  if largest != root: swap, continue down",
    ],
  },
  {
    id: "counting",
    label: "Counting sort",
    time: ["O(n + k)", "O(n + k)", "O(n + k)"],
    space: "O(n + k)",
    stable: true,
    inPlace: false,
    note: "Not a comparison sort, so the n log n bound does not apply. Needs a small integer range k.",
    tagline: "not a comparison sort",
    goodFor: [
      "Linear time when the value range k is small",
      "Stable, and the inner loop of radix sort",
    ],
    watchOut: [
      "Needs k buckets, so a wide value range is fatal",
      "Only works on integer-like keys",
    ],
    pseudocode: [
      "k = max(a) + 1",
      "counts = k zeros",
      "for v in a:",
      "  counts[v] += 1",
      "for value in 0 .. k-1:",
      "  write value, counts[value] times",
    ],
  },
];

export function algorithmMeta(id: SortAlgorithmId): AlgorithmMeta {
  return ALGORITHMS.find((a) => a.id === id) ?? ALGORITHMS[0];
}

/**
 * Records frames while an algorithm runs.
 *
 * Counters live here rather than in each algorithm so "comparison" and
 * "write" mean the same thing across all of them, which is the entire point
 * of putting the numbers on screen next to each other.
 */
export function createSortRecorder(initial: number[], maxSteps = MAX_SORT_STEPS) {
  const steps: SortStep[] = [];
  let comparisons = 0;
  let writes = 0;
  let stopped = false;

  function push(
    array: number[],
    caption: string,
    extra: Partial<Omit<SortStep, "array" | "caption" | "comparisons" | "writes">> = {},
  ): boolean {
    if (steps.length >= maxSteps) {
      stopped = true;
      return false;
    }
    steps.push({
      array: [...array],
      comparing: extra.comparing ?? [],
      writing: extra.writing ?? [],
      sorted: extra.sorted ?? [],
      range: extra.range,
      pointers: extra.pointers,
      aux: extra.aux,
      line: extra.line,
      caption,
      comparisons,
      writes,
    });
    return true;
  }

  return {
    get stopped() {
      return stopped;
    },
    countCompare(n = 1) {
      comparisons += n;
    },
    countWrite(n = 1) {
      writes += n;
    },
    push,
    finish(): SortRun {
      return { steps, truncated: stopped };
    },
    initial: [...initial],
  };
}

/* -------------------------------------------------------------------------
 * Input presets
 * ---------------------------------------------------------------------- */

export type PresetId = "random" | "nearly" | "reversed" | "fewUnique" | "sorted";

export const PRESETS: { id: PresetId; label: string; note: string }[] = [
  { id: "random", label: "Random", note: "The usual case." },
  { id: "nearly", label: "Nearly sorted", note: "Insertion sort shines; quick sort with a naive pivot suffers." },
  { id: "reversed", label: "Reversed", note: "The worst case for several of the simple sorts." },
  { id: "fewUnique", label: "Few unique", note: "Lots of equal keys, which is where three-way partitioning wins." },
  { id: "sorted", label: "Already sorted", note: "Shows which algorithms notice and which plough on regardless." },
];

/** Deterministic PRNG so a given seed always produces the same array. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Counting sort allocates one bucket per distinct value, so it is only
 * shown on a small range. This is not a rendering compromise, it is the
 * algorithm's actual precondition.
 */
export const COUNTING_MAX_VALUE = 9;

export function buildArray(preset: PresetId, size: number, seed: number, maxValue = 99): number[] {
  const rand = mulberry32(seed);

  switch (preset) {
    case "sorted":
      return Array.from({ length: size }, (_, i) => Math.round(((i + 1) / size) * maxValue));
    case "reversed":
      return Array.from({ length: size }, (_, i) => Math.round(((size - i) / size) * maxValue));
    case "nearly": {
      const arr = Array.from({ length: size }, (_, i) => Math.round(((i + 1) / size) * maxValue));
      // A handful of adjacent swaps: enough to break sortedness without
      // destroying the run structure insertion sort exploits.
      const swaps = Math.max(1, Math.floor(size / 8));
      for (let s = 0; s < swaps; s++) {
        const i = Math.floor(rand() * (size - 1));
        [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
      }
      return arr;
    }
    case "fewUnique": {
      const distinct = [0.15, 0.4, 0.65, 0.9].map((f) => Math.max(1, Math.round(f * maxValue)));
      return Array.from({ length: size }, () => distinct[Math.floor(rand() * distinct.length)]);
    }
    case "random":
    default:
      return Array.from({ length: size }, () => 1 + Math.floor(rand() * maxValue));
  }
}
