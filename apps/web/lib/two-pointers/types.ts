/**
 * Shared vocabulary for the two-pointer widgets.
 *
 * Same idea as `lib/sorting/types.ts`: every algorithm records the same shape
 * of frame, so one renderer draws all of them without knowing which problem it
 * is showing. A frame carries the whole array rather than a diff, because the
 * arrays here are tiny and a self-contained frame makes scrubbing backwards
 * free instead of needing the run replayed from the start.
 *
 * The one thing this vocabulary has that the sorting one does not is
 * `dropped`: the whole point of a two-pointer solution is that each step
 * discards a slab of candidates it never has to look at, and a reader can only
 * believe the O(n) claim if they can see that slab go grey.
 */

export type CellTone =
  /** Untouched, still in play. */
  | "idle"
  /** A pointer is sitting on it this frame. */
  | "active"
  /** Inside the current window or candidate range. */
  | "window"
  /** Eliminated. Cannot be part of any answer, and is never revisited. */
  | "dropped"
  /** Committed: written into the answer region, or matched and banked. */
  | "kept"
  /** Part of the match this frame found. */
  | "hit";

export interface PointerLane {
  label: string;
  /** Rendered as-is, so a lane can hold numbers, characters or names. */
  values: string[];
  /** Marker name to index. An index outside the array draws no marker. */
  pointers: Record<string, number>;
  /** Sparse per-cell tone; anything unlisted is `idle`. */
  tones?: Record<number, CellTone>;
}

export interface StepStat {
  label: string;
  value: string | number;
  tone?: "default" | "good" | "warn";
}

/** The `knows` matrix, for the celebrity problem. */
export interface MatrixView {
  labels: string[];
  /** `rows[i][j]` is "i knows j". The diagonal is ignored. */
  rows: boolean[][];
  /** The single cell being queried this frame. */
  query?: [number, number];
}

export interface TwoPointerStep {
  lanes: PointerLane[];
  caption: string;
  /** Every comparison the algorithm has made up to and including this frame. */
  comparisons: number;
  /** Answers banked so far, as display strings. */
  results: string[];
  stats?: StepStat[];
  matrix?: MatrixView;
  /** Colours the caption: a match found, or a candidate rejected. */
  tone?: "hit" | "miss";
}

export interface TwoPointerRun {
  steps: TwoPointerStep[];
  /** True when the run hit the frame cap and stopped early. */
  truncated: boolean;
  /** The one-line answer, shown alongside the transport controls. */
  answer: string;
  /** Big-O of the pass itself, not counting any sort the problem needs first. */
  complexity: string;
}

/**
 * Frame cap. 4Sum on twelve values is the only generator that comes close, and
 * the widgets keep their inputs small enough that nothing else gets near it.
 */
export const MAX_TP_STEPS = 500;

/** Convenience constructor so a generator can build a lane in one expression. */
export function lane(
  label: string,
  values: (string | number)[],
  pointers: Record<string, number> = {},
  extra: { tones?: Record<number, CellTone> } = {},
): PointerLane {
  return { label, values: values.map(String), pointers, tones: extra.tones };
}

/**
 * Marks everything outside `[lo, hi]` as dropped.
 *
 * Converging-pointer solutions all share this: the moment a pointer moves, the
 * cell it left is gone for good. Drawing that is what separates "two loops
 * written as one" from an argument the reader can check.
 */
export function outside(n: number, lo: number, hi: number, tone: CellTone = "dropped"): Record<number, CellTone> {
  const tones: Record<number, CellTone> = {};
  for (let i = 0; i < n; i++) if (i < lo || i > hi) tones[i] = tone;
  return tones;
}

export interface Recorder {
  readonly stopped: boolean;
  countCompare(n?: number): void;
  /** Returns false once the cap is hit, so a generator can bail out early. */
  push(
    caption: string,
    frame: {
      lanes: PointerLane[];
      results?: string[];
      stats?: StepStat[];
      matrix?: MatrixView;
      tone?: "hit" | "miss";
    },
  ): boolean;
  finish(answer: string, complexity: string): TwoPointerRun;
}

export function createRecorder(maxSteps: number = MAX_TP_STEPS): Recorder {
  const steps: TwoPointerStep[] = [];
  let comparisons = 0;
  let stopped = false;

  return {
    get stopped() {
      return stopped;
    },
    countCompare(n = 1) {
      comparisons += n;
    },
    push(caption, frame) {
      if (steps.length >= maxSteps) {
        stopped = true;
        return false;
      }
      steps.push({
        lanes: frame.lanes,
        caption,
        comparisons,
        results: [...(frame.results ?? [])],
        stats: frame.stats,
        matrix: frame.matrix,
        tone: frame.tone,
      });
      return true;
    },
    finish(answer, complexity) {
      return { steps, truncated: stopped, answer, complexity };
    },
  };
}
