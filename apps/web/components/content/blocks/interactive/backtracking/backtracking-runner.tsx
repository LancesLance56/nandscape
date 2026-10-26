"use client";

import { useState, type ReactNode } from "react";
import type { BacktrackRun, BacktrackStep } from "@/lib/backtracking/types";
import { PlayerDock, useStepPlayer } from "../shared/step-player";
import { OptionGroup, WidgetShell, toggleSlots, useWidgetView } from "../shared/widget-shell";
import { ChipRow, PanelBox, Segmented, StatReadout, type SegmentedGroup } from "../shared/widget-ui";
import { SearchTreeCanvas, TreeLegend } from "./search-tree-canvas";

export type TreeView = "tree" | "profile";

interface BacktrackingRunnerProps<P> {
  /** Detailed-view title, e.g. "N-Queens". */
  title: string;
  run: BacktrackRun<P>;
  /** Problem-specific visual (a board, a string with cuts, a coloured graph). */
  visual?: (step: BacktrackStep<P>) => ReactNode;
  /** Extra readouts beside the standard path/solutions/counters. */
  panel?: (step: BacktrackStep<P>) => ReactNode;
  /** Switchers, e.g. mode or size pickers. One becomes the shell's primary
   *  control (see `primaryToggle`); the rest go in the detailed options row. */
  toggles?: SegmentedGroup[];
  /** Id of the toggle shown in both views. Defaults to the first. */
  primaryToggle?: string;
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
  title,
  run,
  visual,
  panel,
  toggles,
  primaryToggle,
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

  const treeToggle = showTree ? (
    <OptionGroup label="Search view">
      <Segmented
        options={[
          { id: "tree", label: "Tree" },
          { id: "profile", label: "Depth profile" },
        ]}
        value={treeView}
        onChange={(id) => setTreeView(id as TreeView)}
      />
    </OptionGroup>
  ) : undefined;
  const slots = toggleSlots(toggles ?? [], primaryToggle, treeToggle);

  return (
    <WidgetShell
      kind="Backtracking"
      title={title}
      bare={!frame}
      className={className}
      primary={slots.primary}
      options={slots.options}
      stage={
        <Stage
          hint={hint}
          visual={visual ? <div className="flex justify-center">{visual(step)}</div> : null}
          tree={showTree ? <TreeBlock run={run} step={step} showDeadInLegend={showDeadInLegend} view={treeView} /> : null}
        />
      }
      readout={
        <StatReadout
          stats={[
            { label: "nodes entered", value: step.visited },
            { label: "branches cut", value: step.pruned, tone: step.pruned > 0 ? "warn" : "default" },
            { label: "found", value: step.solutions.length, tone: "good" },
          ]}
        />
      }
      sideWidth={230}
      side={
        <>
          <PanelBox title="Call stack">
            <ChipRow items={step.path} emptyLabel="back at the root" reserveRows={2} />
          </PanelBox>

          {panel?.(step)}

          <PanelBox title={solutionsLabel}>
            {step.solutions.length === 0 ? (
              <span className="text-xs italic text-slate">none yet</span>
            ) : (
              <div className="flex max-h-32 flex-col gap-1 overflow-y-auto">
                {step.solutions.map((s, i) => (
                  <span key={`${s}-${i}`} className="font-label text-xs font-semibold text-signal-green">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </PanelBox>
        </>
      }
      status={
        run.truncated ? (
          <p className="text-[11px] text-copper-dark">
            This run hit the step limit and stopped early. The tree keeps growing past this point, which is rather the
            lesson: the search space outgrows what is watchable long before it outgrows what is computable.
          </p>
        ) : undefined
      }
      caption={step.caption}
      captionLabel={player.index + 1}
      dock={<PlayerDock player={player} total={run.steps.length} />}
    />
  );
}

/**
 * The board (or the tree, when a problem has no board), plus its hint.
 *
 * With a board, the detailed view puts the search tree *beside* it rather than
 * below: stacked, the two outgrew a laptop screen, and side by side the
 * reader can watch a move on the board and its branch in the tree at once.
 */
function Stage({ hint, visual, tree }: { hint?: string; visual: ReactNode; tree: ReactNode }) {
  const view = useWidgetView();
  const detailed = view === "detailed";
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {detailed && visual && tree ? (
        <div className="grid items-start gap-3 lg:grid-cols-[auto_minmax(0,1fr)]">
          {visual}
          {/* Too much for a phone on top of the board: the tree is for
              screens with room beside it. */}
          <div className="hidden min-w-0 md:block">{tree}</div>
        </div>
      ) : (
        (visual ?? tree)
      )}
      {detailed && hint && <p className="text-center text-[11px] leading-relaxed text-slate">{hint}</p>}
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
