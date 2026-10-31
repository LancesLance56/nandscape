"use client";

import { useMemo, useState, type ReactNode } from "react";
import { arraySteps, gridSteps, type ArrayProblem, type GridProblem } from "@/lib/dp/tables";
import type { TableRun } from "@/lib/dp/types";
import { PlayerDock, useStepPlayer } from "../shared/step-player";
import { WidgetShell, toggleSlots } from "../shared/widget-shell";
import { PanelBox, SideNote, StatReadout, type SegmentedGroup } from "../shared/widget-ui";
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
  /** Detailed-view title: the problem's name. */
  title: string;
  run: TableRun;
  toggles: SegmentedGroup[];
  formatValue?: (value: number) => string;
  /** Rendered under the table: the input, in whatever form suits the problem. */
  inputNote?: ReactNode;
  hint?: string;
}

function TableRunner({ title, run, toggles, formatValue, inputNote, hint }: TableRunnerProps) {
  const player = useStepPlayer(run.steps.length);
  const step = run.steps[Math.min(player.index, run.steps.length - 1)];

  if (!step) {
    return <p className="text-sm text-signal-coral">Table widget: nothing to run.</p>;
  }

  const total = run.rowLabels.length * run.colLabels.length;
  const hasPath = run.steps[run.steps.length - 1].path.length > 0;

  return (
    <WidgetShell
      kind="Dynamic programming"
      title={title}
      singleView
      {...toggleSlots(toggles)}
      stage={
        <div className="flex min-w-0 flex-col gap-2">
          <DpTableCanvas
            step={step}
            rowLabels={run.rowLabels}
            colLabels={run.colLabels}
            rowTitle={run.rowTitle}
            colTitle={run.colTitle}
            formatValue={formatValue}
            maxHeight={270}
          />
          {inputNote}
        </div>
      }
      readout={
        <StatReadout
          stats={[
            { label: `of ${total} filled`, value: Math.min(step.filled, total) },
            ...(step.deps.length > 0 ? [{ label: "read now", value: step.deps.length, tone: "warn" as const }] : []),
          ]}
        />
      }
      legend={<DpTableLegend showPath={hasPath} />}
      side={
        <>
          {/* The arithmetic for one cell, spelled out. The table shows what the
              answer is and the arrows show where it came from; this is the only
              place that says how the two are connected. */}
          <PanelBox title="This cell" bodyClassName="min-h-[1.5rem]">
            {step.formula ? (
              <span className="font-label text-xs font-semibold text-copper-dark">{step.formula}</span>
            ) : (
              <span className="text-xs italic text-slate">nothing being worked out</span>
            )}
          </PanelBox>
          <PanelBox title="Recurrence">
            <div className="flex flex-col gap-0.5 font-label text-[11px] leading-relaxed text-ink-soft">
              {run.recurrence.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </div>
          </PanelBox>
          <PanelBox title="Answer">
            <span className="text-xs font-semibold text-signal-green-strong">{run.answer}</span>
          </PanelBox>
          {hint && <SideNote>{hint}</SideNote>}
        </>
      }
      status={
        run.truncated ? (
          <p className="text-[11px] text-copper-dark">This run hit the frame limit and stopped early.</p>
        ) : undefined
      }
      caption={step.caption}
      dock={<PlayerDock player={player} total={run.steps.length} />}
    />
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
      title={ARRAY_PROBLEMS.find((p) => p.id === problem)?.label ?? "Filling a table"}
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

  return (
    <TableRunner
      title={GRID_PROBLEMS.find((p) => p.id === problem)?.label ?? "Filling a table"}
      run={run}
      toggles={toggles}
      hint={GRID_HINTS[problem]}
    />
  );
}
