"use client";

import { useMemo } from "react";
import { mergeSortRun, quickSortRun } from "@/lib/sorting/recursion";
import { CallTreeCanvas, CallTreeLegend } from "../dp/call-tree-canvas";
import { StepCaption, StepControls, useStepPlayer } from "../shared/step-player";
import { ChipRow, PanelBox, WidgetFrame } from "../shared/widget-ui";

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
    <WidgetFrame>
      <p className="mb-3 font-mono text-[10.5px] leading-relaxed text-slate">{run.recurrence.join("   ·   ")}</p>

      <div className="grid gap-4 lg:grid-cols-[2fr_minmax(0,1fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-2">
          <CallTreeCanvas nodes={run.nodes} step={step} markRepeats={false} maxHeight={380} />
          <CallTreeLegend showRepeats={false} showHits={false} />
        </div>

        <div className="flex min-w-0 flex-col gap-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[11px] text-slate">
            <span>
              <b className="text-ink">{step.calls}</b> calls
            </span>
            <span className="font-mono font-semibold text-signal-green-strong">{run.answer}</span>
          </div>

          <PanelBox title="Call stack">
            <ChipRow items={step.stack} emptyLabel="nothing running" />
          </PanelBox>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <StepCaption text={step.caption} />
        <StepControls
          index={player.index}
          total={run.steps.length}
          playing={player.playing}
          onPlay={player.play}
          onPause={player.pause}
          onNext={player.next}
          onPrev={player.prev}
          onReset={player.reset}
          onScrub={player.setIndex}
        />
      </div>
    </WidgetFrame>
  );
}
