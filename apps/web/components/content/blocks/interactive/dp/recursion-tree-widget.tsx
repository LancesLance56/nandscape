"use client";

import { useMemo, useState } from "react";
import { recursionSteps, type RecursionMode, type RecursionProblem } from "@/lib/dp/recursion";
import type { CallNode } from "@/lib/dp/types";
import { StepCaption, StepControls, useStepPlayer } from "../shared/step-player";
import { ChipRow, PanelBox, SegmentedRow, WidgetFrame, type SegmentedGroup } from "../shared/widget-ui";
import { CallTreeCanvas, CallTreeLegend } from "./call-tree-canvas";

/**
 * The recursion tree, with and without a memo.
 *
 * This widget carries two arguments at once, and both are meant to land. The
 * first is the induction reading: a recursive function is correct when its base
 * case is right and every other case is right *given* that its own calls are,
 * and the side panel says which of those two things the current frame is
 * showing. The second is the cost: switch the mode and the same tree collapses,
 * because the repeated questions stop being asked twice.
 *
 * They are in one widget because they are the same picture. The subtrees a memo
 * deletes are exactly the ones the induction argument said were interchangeable
 * with something computed earlier.
 */

interface SizeOption {
  id: string;
  label: string;
  n: number;
  k?: number;
}

const SIZES: Record<RecursionProblem, SizeOption[]> = {
  factorial: [
    { id: "4", label: "4!", n: 4 },
    { id: "5", label: "5!", n: 5 },
    { id: "6", label: "6!", n: 6 },
  ],
  fib: [
    { id: "5", label: "fib(5)", n: 5 },
    { id: "6", label: "fib(6)", n: 6 },
    { id: "7", label: "fib(7)", n: 7 },
    { id: "9", label: "fib(9)", n: 9 },
  ],
  binomial: [
    { id: "4-2", label: "C(4,2)", n: 4, k: 2 },
    { id: "5-2", label: "C(5,2)", n: 5, k: 2 },
    { id: "6-3", label: "C(6,3)", n: 6, k: 3 },
  ],
};

/**
 * The induction reading of each recurrence, in the widget's own words.
 *
 * `step` takes the labels straight from the tree rather than rebuilding them
 * from numbers, so the sentence always names the calls actually on screen and
 * cannot drift out of step with what the reader is looking at.
 */
const INDUCTION: Record<
  RecursionProblem,
  { base: string; step: (self: string, kids: string[]) => string; idea: string }
> = {
  factorial: {
    base: "fact(0) and fact(1) are both 1. You can check that by hand and be done with it.",
    idea: "Multiply the smaller answer by n.",
    step: (self, kids) =>
      kids.length > 0
        ? `${self} is correct as long as ${kids[0]} is correct, because all it does to that answer is multiply it.`
        : `${self} has not made its call yet. It is about to hand the smaller problem off and trust the result.`,
  },
  fib: {
    base: "fib(0) is 0 and fib(1) is 1. Both are given, and neither needs an argument.",
    idea: "Add the two smaller answers.",
    step: (self, kids) =>
      kids.length === 2
        ? `${self} is correct as long as ${kids[0]} and ${kids[1]} are, because all it does is add them.`
        : `${self} is waiting on smaller calls, and it will add whatever they report back.`,
  },
  binomial: {
    base: "Choosing none of the items, or all of them, can be done exactly one way.",
    idea: "Split on the first item and add the two cases.",
    step: (self, kids) =>
      kids.length === 2
        ? `${self} is correct as long as ${kids[0]} and ${kids[1]} are. Every group either uses the first item or leaves it, and nothing is counted twice.`
        : `${self} is about to split into the take-it case and the leave-it case.`,
  },
};

function readProblem(value: unknown): RecursionProblem | null {
  return value === "factorial" || value === "fib" || value === "binomial" ? value : null;
}

export function RecursionTreeWidget({ data }: { data: Record<string, unknown> }) {
  // `problem` and `mode` choose what the widget opens on; the lock flags decide
  // whether the reader may then change it. Keeping those separate matters,
  // because a page usually wants to start somewhere specific and still let the
  // reader wander, and an early page wants the memo toggle hidden entirely
  // until memoisation has been introduced.
  const lockProblem = data.lockProblem === true;
  const lockMode = data.lockMode === true;

  const [problem, setProblem] = useState<RecursionProblem>(readProblem(data.problem) ?? "fib");
  const [mode, setMode] = useState<RecursionMode>(data.mode === "memo" ? "memo" : "naive");
  const [sizeById, setSizeById] = useState<Partial<Record<RecursionProblem, string>>>({});

  const sizes = SIZES[problem];
  const size = sizes.find((s) => s.id === sizeById[problem]) ?? sizes[Math.min(1, sizes.length - 1)];

  const run = useMemo(
    () => recursionSteps({ problem, mode, n: size.n, k: size.k }),
    [problem, mode, size.n, size.k],
  );

  const player = useStepPlayer(run.steps.length);
  const step = run.steps[Math.min(player.index, run.steps.length - 1)];

  const kidsOf = useMemo(() => {
    const map = new Map<string, CallNode[]>();
    for (const n of run.nodes) {
      if (!n.parentId) continue;
      const list = map.get(n.parentId);
      if (list) list.push(n);
      else map.set(n.parentId, [n]);
    }
    return map;
  }, [run.nodes]);

  if (!step) {
    return <p className="text-sm text-signal-coral">Recursion widget: nothing to run.</p>;
  }

  const activeNode = step.activeId ? run.nodes.find((n) => n.id === step.activeId) : null;
  const activeStatus = step.activeId ? step.status[step.activeId] : undefined;
  const revealedKeys = new Set(run.nodes.filter((n) => step.revealed.includes(n.id)).map((n) => n.key));
  const induction = INDUCTION[problem];

  const toggles: SegmentedGroup[] = [];
  if (!lockProblem) {
    toggles.push({
      id: "problem",
      label: "Function",
      active: problem,
      onChange: (id) => {
        setProblem(id as RecursionProblem);
        player.reset();
      },
      options: [
        { id: "factorial", label: "Factorial", hint: "One call per level, so the tree is a straight chain" },
        { id: "fib", label: "Fibonacci", hint: "Two calls per level, so the tree branches" },
        { id: "binomial", label: "Choose", hint: "Two arguments, so the memo needs a pair for a key" },
      ],
    });
  }
  toggles.push({
    id: "size",
    label: "Input",
    active: size.id,
    onChange: (id) => {
      setSizeById((prev) => ({ ...prev, [problem]: id }));
      player.reset();
    },
    options: sizes.map((s) => ({ id: s.id, label: s.label })),
  });
  if (!lockMode) {
    toggles.push({
      id: "mode",
      label: "Memo",
      active: mode,
      onChange: (id) => {
        setMode(id as RecursionMode);
        player.reset();
      },
      options: [
        { id: "naive", label: "Off", hint: "Every call recurses, however many times the same one comes up" },
        { id: "memo", label: "On", hint: "Answers are written down the first time and read back after that" },
      ],
    });
  }

  return (
    <WidgetFrame>
      <SegmentedRow groups={toggles} className="mb-2" />

      {/* The recurrence, as a single reference line rather than a boxed panel.
          It does not change frame to frame, so it does not deserve the same
          weight as the panels that do. */}
      <p className="mb-3 font-mono text-[10.5px] leading-relaxed text-slate">{run.recurrence.join("   ·   ")}</p>

      <div className="grid gap-4 lg:grid-cols-[2fr_minmax(0,1fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-2">
          <CallTreeCanvas nodes={run.nodes} step={step} markRepeats={mode === "naive"} maxHeight={380} />
          <CallTreeLegend showRepeats={mode === "naive"} showHits={mode === "memo"} />
        </div>

        <div className="flex min-w-0 flex-col gap-2.5">
          {/* Stats and the answer share one slim, unboxed strip instead of two
              separate panels, so the reasoning panel below gets the room. */}
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[11px] text-slate">
            <span>
              <b className="text-ink">{step.calls}</b> calls
              {mode === "naive" && (
                <>
                  {" "}
                  &middot; <b className="text-ink">{revealedKeys.size}</b> distinct
                </>
              )}
              {mode === "memo" && step.hits > 0 && (
                <>
                  {" "}
                  &middot; <b className="text-copper-dark">{step.hits}</b> from memo
                </>
              )}
            </span>
            <span className="font-mono font-semibold text-signal-green-strong">{run.answer}</span>
          </div>

          {/* The panel the whole widget is built around: reading a recursion as
              an induction proof, for whichever call is on screen right now. */}
          <PanelBox title="Why this is correct">
            <div className="flex flex-col gap-2 text-xs leading-relaxed">
              <div>
                <span className="font-semibold text-signal-green-strong">Base case. </span>
                <span className="text-ink-soft">{induction.base}</span>
              </div>
              <div>
                <span className="font-semibold text-copper-dark">This call. </span>
                <span className="text-ink-soft">
                  {activeNode
                    ? induction.step(activeNode.label, (kidsOf.get(activeNode.id) ?? []).map((k) => k.label))
                    : "Nothing is running just now."}
                </span>
              </div>
            </div>
          </PanelBox>

          <PanelBox title="Call stack">
            <ChipRow items={step.stack} emptyLabel="nothing running" />
          </PanelBox>

          {mode === "memo" && (
            <PanelBox title="Memo">
              {step.memo.length === 0 ? (
                <span className="text-xs italic text-slate">still empty</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {step.memo.map((m) => (
                    <span key={m.key} className="rounded-md bg-copper-bg px-2 py-1 font-mono text-[11px] font-bold text-copper-dark">
                      {m.key} to {m.value}
                    </span>
                  ))}
                </div>
              )}
            </PanelBox>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <StepCaption
          text={
            activeStatus === "cacheHit"
              ? `${step.caption} Nothing was computed here, and the subtree that used to hang below it is simply gone.`
              : step.caption
          }
        />
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
        {run.truncated && (
          <p className="text-[11px] text-copper-dark">
            This run hit the frame limit and stopped early: without a memo the tree outgrows what is watchable long
            before it outgrows what a computer would attempt.
          </p>
        )}
      </div>
    </WidgetFrame>
  );
}
