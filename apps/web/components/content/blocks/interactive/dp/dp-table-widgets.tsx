"use client";

import { useMemo, useState, type ReactNode } from "react";
import { arraySteps, gridSteps, type ArrayProblem, type GridProblem } from "@/lib/dp/tables";
import type { TableRun } from "@/lib/dp/types";
import { StepCaption, StepControls, useStepPlayer } from "../shared/step-player";
import { PanelBox, SegmentedRow, StatusSlot, WidgetFrame, type SegmentedGroup } from "../shared/widget-ui";
import { DpTableCanvas, DpTableLegend } from "./dp-table-canvas";

/**
 * The two table widgets, and the shell they share.
 *
 * They are split by shape rather than by topic on purpose. Every
 * one-dimensional problem answers "what is the best answer ending here", and
 * every two-dimensional one answers "what is the best answer for this pair of
 * prefixes". A student who has seen four problems of one shape recognises the
 * fifth, which is most of what learning this topic amounts to.
 */

interface TableRunnerProps {
  run: TableRun;
  toggles: SegmentedGroup[];
  formatValue?: (value: number) => string;
  /** Rendered under the table: the input, in whatever form suits the problem. */
  inputNote?: ReactNode;
  hint?: string;
}

function TableRunner({ run, toggles, formatValue, inputNote, hint }: TableRunnerProps) {
  const player = useStepPlayer(run.steps.length);
  const step = run.steps[Math.min(player.index, run.steps.length - 1)];

  if (!step) {
    return <p className="text-sm text-signal-coral">Table widget: nothing to run.</p>;
  }

  const total = run.rowLabels.length * run.colLabels.length;
  const hasPath = run.steps[run.steps.length - 1].path.length > 0;

  return (
    <WidgetFrame>
      <SegmentedRow groups={toggles} className="mb-2" />

      {/* The recurrence, as a single reference line rather than a boxed panel:
          it never changes frame to frame, so it should not compete for space
          with the panel that does. */}
      <p className="mb-3 font-mono text-[10.5px] leading-relaxed text-slate">{run.recurrence.join("   ·   ")}</p>

      <div className="grid gap-4 lg:grid-cols-[2fr_minmax(0,1fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-2">
          <DpTableCanvas
            step={step}
            rowLabels={run.rowLabels}
            colLabels={run.colLabels}
            rowTitle={run.rowTitle}
            colTitle={run.colTitle}
            formatValue={formatValue}
            maxHeight={380}
          />
          {inputNote}
          <DpTableLegend showPath={hasPath} />
        </div>

        <div className="flex min-w-0 flex-col gap-2.5">
          {/* Stats and the answer share one slim, unboxed strip instead of two
              separate panels, so "This cell" gets the room instead. */}
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[11px] text-slate">
            <span>
              <b className="text-ink">{Math.min(step.filled, total)}</b> of {total} filled
              {step.deps.length > 0 && (
                <>
                  {" "}
                  &middot; <b className="text-copper-dark">{step.deps.length}</b> read now
                </>
              )}
            </span>
            <span className="font-semibold text-signal-green-strong">{run.answer}</span>
          </div>

          {/* The arithmetic for one cell, spelled out. The table shows what the
              answer is and the arrows show where it came from; this is the only
              place that says how the two are connected. */}
          <PanelBox title="This cell" bodyClassName="min-h-[1.5rem]">
            {step.formula ? (
              <span className="font-mono text-xs font-semibold text-copper-dark">{step.formula}</span>
            ) : (
              <span className="text-xs italic text-slate">nothing being worked out</span>
            )}
          </PanelBox>

          <p className="min-h-[1.25rem] text-[11px] leading-relaxed text-slate">{hint}</p>
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
        <StatusSlot lines={1}>
          {run.truncated && (
            <p className="text-[11px] text-copper-dark">This run hit the frame limit and stopped early.</p>
          )}
        </StatusSlot>
      </div>
    </WidgetFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* One row                                                                    */
/* -------------------------------------------------------------------------- */

const ARRAY_PROBLEMS: { id: ArrayProblem; label: string; hint: string }[] = [
  { id: "stairs", label: "Climbing stairs", hint: "Count the routes up a staircase, one or two steps at a time" },
  { id: "rob", label: "No two in a row", hint: "Pick the largest total from a line of values, skipping neighbors" },
  { id: "coins", label: "Fewest coins", hint: "Hit a target with as few coins as possible" },
  { id: "lis", label: "Longest rising run", hint: "Find the longest increasing subsequence" },
];

const ARRAY_HINTS: Record<ArrayProblem, string> = {
  stairs:
    "Each cell needs only the two before it, so the whole table is filled in one left-to-right sweep and never revisited.",
  rob: "Every cell is a two-way decision: take this one and skip its neighbor, or skip it and keep the better running total.",
  coins:
    "This one scans several candidates per cell, so watch the arrows move before a number is committed. Greedy fails here, which is why the table is needed.",
  lis: "The number of cells this reads grows with how far along it is, which is what makes this rule cost n squared rather than n.",
};

function readNumbers(value: unknown, fallback: number[]): number[] {
  if (!Array.isArray(value)) return fallback;
  const out = value.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  return out.length > 0 ? out.slice(0, 12) : fallback;
}

function readProblem<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

/** Four one-dimensional problems that share a single row of cells. */
export function DpArrayWidget({ data }: { data: Record<string, unknown> }) {
  // data.problem picks the opening problem; data.lockProblem decides whether
  // the reader is then allowed to move off it.
  const locked = data.lockProblem === true;
  const [problem, setProblem] = useState<ArrayProblem>(
    readProblem<ArrayProblem>(data.problem, ARRAY_PROBLEMS.map((p) => p.id)) ?? "stairs",
  );

  const run = useMemo(
    () =>
      arraySteps({
        problem,
        n: typeof data.n === "number" ? data.n : undefined,
        values: readNumbers(data.values, problem === "rob" ? [2, 7, 9, 3, 1] : [3, 1, 4, 1, 5, 9, 2, 6]),
        coins: readNumbers(data.coins, [1, 3, 4]),
        amount: typeof data.amount === "number" ? data.amount : undefined,
      }),
    [problem, data.n, data.values, data.coins, data.amount],
  );

  const toggles: SegmentedGroup[] = locked
    ? []
    : [
        {
          id: "problem",
          label: "Problem",
          active: problem,
          onChange: (id) => setProblem(id as ArrayProblem),
          options: ARRAY_PROBLEMS.map((p) => ({ id: p.id, label: p.label, hint: p.hint })),
        },
      ];

  return (
    <TableRunner
      run={run}
      toggles={toggles}
      formatValue={problem === "coins" ? (v) => (v === -1 ? "none" : String(v)) : undefined}
      hint={ARRAY_HINTS[problem]}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Two dimensions                                                             */
/* -------------------------------------------------------------------------- */

const GRID_PROBLEMS: { id: GridProblem; label: string; hint: string }[] = [
  { id: "minpath", label: "Cheapest route", hint: "Cross a grid of tolls for as little as possible" },
  { id: "lcs", label: "Shared letters", hint: "Longest run of letters two words have in common, in order" },
  { id: "edit", label: "Edit distance", hint: "Fewest single-letter changes from one word to another" },
  { id: "knapsack", label: "Packing a bag", hint: "Most value that fits, each item taken at most once" },
];

const GRID_HINTS: Record<GridProblem, string> = {
  minpath:
    "Once the table is full, walking backwards from the corner turns a cost into an actual route. The table says what the trip costs; the walk back says which way to go.",
  lcs: "A match steps diagonally and adds one. A mismatch has to give up one letter or the other, so it copies the better neighbor.",
  edit: "Three neighbors, three edits: above is a deletion, left is an insertion, diagonal is a substitution. Matching letters cost nothing at all.",
  knapsack:
    "Each row adds one more item to the shelf. A cell either matches the row above it, meaning the item was left behind, or beats it, meaning the item went in.",
};

/** Four two-dimensional problems, all filled row by row. */
export function DpTableWidget({ data }: { data: Record<string, unknown> }) {
  const locked = data.lockProblem === true;
  const [problem, setProblem] = useState<GridProblem>(
    readProblem<GridProblem>(data.problem, GRID_PROBLEMS.map((p) => p.id)) ?? "lcs",
  );

  const run = useMemo(
    () =>
      gridSteps({
        problem,
        a: typeof data.a === "string" ? data.a.slice(0, 10) : undefined,
        b: typeof data.b === "string" ? data.b.slice(0, 10) : undefined,
        capacity: typeof data.capacity === "number" ? data.capacity : undefined,
      }),
    [problem, data.a, data.b, data.capacity],
  );

  const toggles: SegmentedGroup[] = locked
    ? []
    : [
        {
          id: "problem",
          label: "Problem",
          active: problem,
          onChange: (id) => setProblem(id as GridProblem),
          options: GRID_PROBLEMS.map((p) => ({ id: p.id, label: p.label, hint: p.hint })),
        },
      ];

  return <TableRunner run={run} toggles={toggles} hint={GRID_HINTS[problem]} />;
}
