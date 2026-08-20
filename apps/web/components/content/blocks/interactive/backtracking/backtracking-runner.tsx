"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { BacktrackRun, BacktrackStep } from "@/lib/backtracking/types";
import { StepCaption, StepControls, useStepPlayer } from "../shared/step-player";
import { ChipRow, PanelBox, SegmentedRow, StatReadout, type SegmentedGroup } from "../shared/widget-ui";
import { SearchTreeCanvas, TreeLegend } from "./search-tree-canvas";

export type TreeView = "tree" | "profile";

interface BacktrackingRunnerProps<P> {
  run: BacktrackRun<P>;
  /** Problem-specific visual (a board, a string with cuts, a coloured graph). */
  visual?: (step: BacktrackStep<P>) => ReactNode;
  /** Extra readouts beside the standard path/solutions/counters. */
  panel?: (step: BacktrackStep<P>) => ReactNode;
  /** Switchers rendered above the visual, e.g. mode or size pickers. */
  toggles?: SegmentedGroup[];
  showTree?: boolean;
  /** Label for the solutions box, e.g. "Subsets found". */
  solutionsLabel?: string;
  /** Hidden when a problem has no meaningful "explored but empty" branch. */
  showDeadInLegend?: boolean;
  /**
   * Which view the tree area opens on.
   *
   * Set by the widget rather than inferred from the node count. Inferring it
   * meant the view silently flipped between a drawn tree and a depth profile
   * as the search happened to get luckier or unluckier on different inputs,
   * which reads as the component behaving at random. A widget knows its own
   * problem sizes and can make the choice predictable.
   */
  defaultTreeView?: TreeView;
  hint?: string;
  frame?: boolean;
  className?: string;
}

/**
 * Visual + tree + transport + narration, wired together. Mirrors the graph
 * widgets' AlgorithmRunner: each problem supplies precomputed steps and its
 * own drawing, and everything about playback lives here so the widgets stay
 * small enough to read.
 */
export function BacktrackingRunner<P>({
  run,
  visual,
  panel,
  toggles,
  showTree = true,
  solutionsLabel = "Solutions found",
  showDeadInLegend = true,
  defaultTreeView = "tree",
  hint,
  frame = true,
  className,
}: BacktrackingRunnerProps<P>) {
  const player = useStepPlayer(run.steps.length);
  const [treeView, setTreeView] = useState<TreeView>(defaultTreeView);
  const step = run.steps[Math.min(player.index, run.steps.length - 1)];

  if (!step) {
    return <p className="text-sm text-signal-coral">Backtracking widget: nothing to run.</p>;
  }

  const treeToggle: SegmentedGroup | null = showTree
    ? {
        id: "tree-view",
        label: "Search view",
        active: treeView,
        onChange: (id) => setTreeView(id as TreeView),
        options: [
          { id: "tree", label: "Tree" },
          { id: "profile", label: "Depth profile" },
        ],
      }
    : null;
  const allToggles = treeToggle ? [...(toggles ?? []), treeToggle] : (toggles ?? []);

  return (
    <div className={cn(frame && "rounded-xl border border-border bg-surface-card p-5", className)}>
      <SegmentedRow groups={allToggles} className="mb-4" />

      {/* The board sits in an `auto` column so the panels start right beside
          it instead of leaving dead space, and the tree moves out of this
          grid entirely (below) because it is a wide element and was being
          squeezed into half the width.

          min-w-0 on the panel column is load-bearing: grid and flex children
          default to min-width:auto and refuse to shrink below their content,
          which previously let the tree stretch the page to tens of thousands
          of pixels instead of scrolling inside its own box. */}
      <div
        className={cn(
          "grid gap-4 lg:items-start",
          visual ? "lg:grid-cols-[auto_minmax(0,1fr)]" : "lg:grid-cols-[1.7fr_minmax(0,1fr)]",
        )}
      >
        <div className="flex min-w-0 flex-col gap-2">
          {/* Centred because a small board (4x4) is narrower than the hint
              beneath it, and left-aligning it leaves all the slack on one
              side. */}
          {visual && <div className="flex justify-center">{visual(step)}</div>}
          {/* With no board to show, the tree is the visual, so it stays in
              the left column rather than dropping below an empty space. */}
          {!visual && showTree && <TreeBlock run={run} step={step} showDeadInLegend={showDeadInLegend} view={treeView} />}
          {/* Capped to the widest a board gets. An `auto` grid column is
              sized by its widest child, so a roomier cap here would widen
              the column and reopen the gap between board and panels. */}
          {hint && <p className="max-w-[21rem] text-[11px] leading-relaxed text-slate">{hint}</p>}
        </div>

        <div className="flex min-w-0 flex-col gap-2.5">
          {/* Unboxed rather than another titled panel: this is the one readout
              that never has anything problem-specific in it, so it does not
              need the same weight as the panels that do. */}
          <StatReadout
            stats={[
              { label: "nodes entered", value: step.visited },
              { label: "branches cut", value: step.pruned, tone: step.pruned > 0 ? "warn" : "default" },
              { label: solutionsLabel.toLowerCase().includes("solution") ? "solutions" : "found", value: step.solutions.length, tone: "good" },
            ]}
          />

          <PanelBox title="Call stack">
            <ChipRow items={step.path} emptyLabel="back at the root" />
          </PanelBox>

          {panel?.(step)}

          <PanelBox title={solutionsLabel}>
            {step.solutions.length === 0 ? (
              <span className="text-xs italic text-slate">none yet</span>
            ) : (
              <div className="flex max-h-32 flex-col gap-1 overflow-y-auto">
                {step.solutions.map((s, i) => (
                  <span key={`${s}-${i}`} className="font-mono text-xs font-semibold text-signal-green">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </PanelBox>
        </div>
      </div>

      {/* Narration and transport sit directly under the board rather than
          below the tree. Driving the widget is the main interaction, and it
          was previously pushed a full screen down by a block of secondary
          reference material. */}
      <div className="mt-4 flex flex-col gap-2.5">
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
        {run.truncated && (
          <p className="text-[11px] text-copper-dark">
            This run hit the step limit and stopped early. The tree keeps growing past this point, which is rather the
            lesson: the search space outgrows what is watchable long before it outgrows what is computable.
          </p>
        )}
      </div>

      {/* Last, and collapsible: the search view is reference material you
          consult, not something you drive, so it should not stand between
          the board and its controls. */}
      {visual && showTree && (
        <details open className="group mt-4">
          <summary className="mb-2 cursor-pointer list-none text-[11px] font-semibold text-slate marker:hidden hover:text-ink">
            <span className="inline-flex items-center gap-1.5">
              <span className="transition-transform group-open:rotate-90">&rsaquo;</span>
              Search view
            </span>
          </summary>
          <TreeBlock run={run} step={step} showDeadInLegend={showDeadInLegend} view={treeView} />
        </details>
      )}
    </div>
  );
}

/** The tree (or its depth-profile stand-in) plus the legend that belongs with it. */
function TreeBlock<P>({
  run,
  step,
  showDeadInLegend,
  view,
}: {
  run: BacktrackRun<P>;
  step: BacktrackStep<P>;
  showDeadInLegend: boolean;
  view: TreeView;
}) {
  return (
    <div>
      <SearchTreeCanvas nodes={run.nodes} step={step as BacktrackStep<unknown>} view={view} />
      {/* The legend names node colours, so it only belongs alongside an
          actual tree, not the depth profile. */}
      {view === "tree" && (
        <div className="mt-2">
          <TreeLegend showDead={showDeadInLegend} />
        </div>
      )}
    </div>
  );
}
