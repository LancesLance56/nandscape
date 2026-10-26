"use client";

import { useMemo } from "react";
import { mergeSortRun, quickSortRun } from "@/lib/sorting/recursion";
import { CallTreeCanvas, CallTreeLegend } from "../dp/call-tree-canvas";
import { PlayerDock, useStepPlayer } from "../shared/step-player";
import { WidgetShell } from "../shared/widget-shell";
import { ChipRow, PanelBox, StatReadout } from "../shared/widget-ui";

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
      options={
        <p className="font-label text-[10.5px] leading-relaxed text-slate">{run.recurrence.join("   ·   ")}</p>
      }
      stage={<CallTreeCanvas nodes={run.nodes} step={step} markRepeats={false} maxHeight={270} />}
      readout={<StatReadout stats={[{ label: "calls", value: step.calls }]} />}
      legend={<CallTreeLegend showRepeats={false} showHits={false} />}
      side={
        <>
          <PanelBox title="Call stack">
            <ChipRow items={step.stack} emptyLabel="nothing running" reserveRows={2} />
          </PanelBox>
          <p className="font-label text-xs font-semibold text-signal-green-strong">{run.answer}</p>
        </>
      }
      caption={step.caption}
      captionLabel={player.index + 1}
      dock={<PlayerDock player={player} total={run.steps.length} />}
    />
  );
}
