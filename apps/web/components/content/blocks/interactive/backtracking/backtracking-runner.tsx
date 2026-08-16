"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { BacktrackRun, BacktrackStep } from "@/lib/backtracking/types";
import { StepCaption, StepControls, useStepPlayer } from "../shared/step-player";
import { ChipRow, PanelBox, StatReadout } from "../shared/panel-ui";
import { SearchTreeCanvas, TreeLegend } from "./search-tree-canvas";

export interface ToggleGroup {
  id: string;
  label: string;
  options: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}

interface BacktrackingRunnerProps<P> {
  run: BacktrackRun<P>;
  /** Problem-specific visual (a board, a string with cuts, a coloured graph). */
  visual?: (step: BacktrackStep<P>) => ReactNode;
  /** Extra readouts beside the standard path/solutions/counters. */
  panel?: (step: BacktrackStep<P>) => ReactNode;
  /** Switchers rendered above the visual, e.g. mode or size pickers. */
  toggles?: ToggleGroup[];
  showTree?: boolean;
  /** Label for the solutions box, e.g. "Subsets found". */
  solutionsLabel?: string;
  /** Hidden when a problem has no meaningful "explored but empty" branch. */
  showDeadInLegend?: boolean;
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
  hint,
  frame = true,
  className,
}: BacktrackingRunnerProps<P>) {
  const player = useStepPlayer(run.steps.length);
  const step = run.steps[Math.min(player.index, run.steps.length - 1)];

  if (!step) {
    return <p className="text-sm text-signal-coral">Backtracking widget: nothing to run.</p>;
  }

  return (
    <div className={cn(frame && "rounded-xl border border-border bg-surface-card p-5", className)}>
      {toggles && toggles.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          {toggles.map((group) => (
            <div key={group.id} className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate">{group.label}</span>
              {group.options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => group.onChange(opt.id)}
                  aria-pressed={opt.id === group.active}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                    opt.id === group.active
                      ? "border-copper bg-copper-bg text-copper-dark"
                      : "border-border-strong text-ink-soft hover:bg-surface-2 hover:text-ink",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className={cn("grid gap-4", visual && showTree ? "lg:grid-cols-[1fr_1fr]" : "lg:grid-cols-[1.7fr_1fr]")}>
        <div className="flex flex-col gap-3">
          {visual && <div>{visual(step)}</div>}
          {showTree && (
            <div>
              <SearchTreeCanvas nodes={run.nodes} step={step as BacktrackStep<unknown>} />
              <div className="mt-2">
                <TreeLegend showDead={showDeadInLegend} />
              </div>
            </div>
          )}
          {hint && <p className="text-[11px] text-slate">{hint}</p>}
        </div>

        <div className="flex flex-col gap-3">
          <PanelBox title="Call stack (root to current)">
            <ChipRow items={step.path} emptyLabel="back at the root" />
          </PanelBox>

          {panel?.(step)}

          <PanelBox title={solutionsLabel}>
            {step.solutions.length === 0 ? (
              <span className="text-xs italic text-slate">none yet</span>
            ) : (
              <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
                {step.solutions.map((s, i) => (
                  <span key={`${s}-${i}`} className="font-mono text-xs font-semibold text-signal-green">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </PanelBox>

          <PanelBox title="Work done">
            <StatReadout
              stats={[
                { label: "nodes entered", value: step.visited },
                { label: "branches cut", value: step.pruned, tone: step.pruned > 0 ? "warn" : "default" },
                { label: solutionsLabel.toLowerCase().includes("solution") ? "solutions" : "found", value: step.solutions.length, tone: "good" },
              ]}
            />
          </PanelBox>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
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
    </div>
  );
}
