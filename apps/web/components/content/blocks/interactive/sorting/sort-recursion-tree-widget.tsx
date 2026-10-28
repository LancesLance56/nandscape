"use client";

import { useMemo } from "react";
import { mergeSortRun, quickSortRun } from "@/lib/sorting/recursion";
import { CallTreeCanvas, CallTreeLegend } from "../dp/call-tree-canvas";
import { PlayerDock, useStepPlayer } from "../shared/step-player";
import { WidgetShell } from "../shared/widget-shell";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

type SortAlgo = "merge" | "quick";

const DEFAULTS: Record<SortAlgo, number[]> = {
  merge: [38, 27, 43, 3, 9, 82, 10],
  quick: [7, 2, 9, 4, 3, 7, 6],
};

function readAlgo(data: Record<string, unknown>): SortAlgo {
  return data.algorithm === "quick" ? "quick" : "merge";
}

function readArray(data: Record<string, unknown>, algo: SortAlgo): number[] {
  const raw = data.array;
  if (Array.isArray(raw) && raw.every((v) => typeof v === "number") && raw.length > 0) return raw as number[];
  return DEFAULTS[algo];
}

/**
 * The merge sort / quick sort recursion, as a call tree instead of three
 * separate hand-typed blocks (the split, the call order, the stack).
 *
 * Reuses the DP section's recursion-tree recorder and canvas wholesale. The
 * recorder does not know or care that a "value" here is an array rather than
 * a number - `enter` and `ret` sit exactly where the real split and the real
 * merge (or the real partition) happen, so the tree, the call order and the
 * stack panel all fall out of the same recorded run instead of being three
 * separate claims about it.
 */
export function SortRecursionTreeWidget({ data }: { data: Record<string, unknown> }) {
  const algorithm = readAlgo(data);
  const array = useMemo(() => readArray(data, algorithm), [data, algorithm]);

  const run = useMemo(() => (algorithm === "quick" ? quickSortRun(array) : mergeSortRun(array)), [algorithm, array]);

  const player = useStepPlayer(run.steps.length);
  const step = run.steps[Math.min(player.index, run.steps.length - 1)];

  if (!step) {
    return <p className="text-sm text-signal-coral">Sort recursion widget: nothing to run.</p>;
  }

  return (
    <WidgetShell
      kind="Sorting"
      title={algorithm === "quick" ? "Quicksort, call by call" : "Merge sort, call by call"}
      singleView
      // The widget lays out its own reading order under the tree (key, then
      // what just happened, then the stack), so everything is in the stage.
      stage={
        <div className="flex flex-col">
          <CallTreeCanvas nodes={run.nodes} step={step} markRepeats={false} maxHeight={310} frameless />
          <div className="flex justify-center pb-1 pt-2">
            <CallTreeLegend showRepeats={false} showHits={false} />
          </div>

          <div className="mt-3 grid gap-x-6 gap-y-3 border-t border-border pt-4 sm:grid-cols-[minmax(0,1fr)_auto]">
            {/* Two lines reserved, so a short step after a long one does not
                pull the dock up. */}
            <p aria-live="polite" className="m-0 min-h-[2.75rem] text-[15px] font-medium leading-snug text-ink">
              {step.caption}
            </p>
            <div className="flex items-baseline gap-1.5 sm:flex-col sm:items-end sm:gap-0">
              <span className="font-display text-2xl font-bold leading-none tabular-nums text-ink">{step.calls}</span>
              <span className="text-xs text-slate">{step.calls === 1 ? "call" : "calls"}</span>
            </div>
          </div>

          <CallStackTrail stack={step.stack} />
        </div>
      }
      dock={<PlayerDock player={player} total={run.steps.length} />}
    />
  );
}

/**
 * The call stack as one line, root first: every call still waiting on a
 * child, then the one running now in copper. A trail rather than a panel, so
 * it reads as "how we got here" and costs a single line.
 */
function CallStackTrail({ stack }: { stack: string[] }) {
  return (
    <div className="mt-3 flex min-h-7 flex-wrap items-center gap-x-1 gap-y-1.5">
      <span className="mr-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate">Call stack</span>
      {stack.length === 0 ? (
        <span className="text-xs italic text-slate">nothing running</span>
      ) : (
        stack.map((label, i) => {
          const tip = i === stack.length - 1;
          return (
            <span key={`${label}-${i}`} className="inline-flex items-center gap-1">
              {i > 0 && <ChevronRight aria-hidden className="size-3 text-slate/70" />}
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 font-mono text-[11.5px] font-semibold",
                  tip ? "bg-copper-bg text-copper-dark" : "text-ink-soft",
                )}
              >
                {label}
              </span>
            </span>
          );
        })
      )}
    </div>
  );
}
