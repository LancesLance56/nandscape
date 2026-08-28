"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { AlgorithmStep, GraphSpec } from "@/lib/graph/types";
import { GraphCanvas } from "./graph-canvas";
import { StepCaption, StepControls, useStepPlayer } from "../shared/step-player";

// The graph widgets import these from here rather than from ../shared, so
// they stay re-exported for those callers.
import { Segmented } from "../shared/widget-ui";

export { ChipRow, PanelBox, StatusSlot, ReservedBox } from "../shared/widget-ui";

interface AlgorithmRunnerProps {
  graph: GraphSpec;
  steps: AlgorithmStep[];
  /** Mode switcher (BFS/DFS, Kruskal/Prim) rendered above the canvas. */
  modes?: { id: string; label: string }[];
  activeMode?: string;
  onModeChange?: (id: string) => void;
  /** Worked-example switcher, rendered as a quieter row below the modes. */
  examples?: { id: string; label: string }[];
  activeExample?: string;
  onExampleChange?: (id: string) => void;
  /** Clickable nodes for choosing a start node. */
  onNodeClick?: (id: string) => void;
  markedNode?: string | null;
  /** Algorithm-specific readout (queue, distance table, edge list). */
  panel?: (step: AlgorithmStep) => ReactNode;
  frame?: boolean;
  className?: string;
  hint?: string;
  /** Passed through to the canvas: outline each group (used for SCCs). */
  groupHulls?: boolean;
  groupLabel?: string;
}

/**
 * Canvas + transport + narration, wired together. Each algorithm widget
 * supplies its precomputed steps and an optional side panel; everything
 * about playback, scrubbing and drawing lives here so the widgets stay
 * small enough to read.
 */
export function AlgorithmRunner({
  graph,
  steps,
  modes,
  activeMode,
  onModeChange,
  examples,
  activeExample,
  onExampleChange,
  onNodeClick,
  markedNode,
  panel,
  frame = true,
  className,
  hint,
  groupHulls,
  groupLabel,
}: AlgorithmRunnerProps) {
  const player = useStepPlayer(steps.length);
  const step = steps[Math.min(player.index, steps.length - 1)];

  if (!step) {
    return <p className="text-sm text-signal-coral">Graph widget: no steps to show (is the graph empty?).</p>;
  }

  return (
    <div className={cn(frame && "rounded-xl border border-border bg-surface-card p-5", className)}>
      {modes && modes.length > 1 && (
        <Segmented
          className="mb-3"
          variant="solid"
          options={modes}
          value={activeMode ?? modes[0].id}
          onChange={(id) => onModeChange?.(id)}
        />
      )}

      {examples && examples.length > 1 && (
        <Segmented
          className="mb-3"
          label="Example"
          options={examples}
          value={activeExample ?? examples[0].id}
          onChange={(id) => onExampleChange?.(id)}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <GraphCanvas
            graph={graph}
            step={step}
            onNodeClick={onNodeClick}
            markedNode={markedNode}
            groupHulls={groupHulls}
            groupLabel={groupLabel}
          />
          {/* Reserved whether or not a hint is passed, so its presence never
              shifts the canvas. */}
          <p className="mt-1 min-h-[1.25rem] text-center text-[11px] text-slate">{hint}</p>
        </div>
        {panel && <div className="flex flex-col gap-3">{panel(step)}</div>}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <StepCaption text={step.caption} />
        <StepControls
          index={player.index}
          total={steps.length}
          playing={player.playing}
          onPlay={player.play}
          onPause={player.pause}
          onNext={player.next}
          onPrev={player.prev}
          onReset={player.reset}
          onScrub={player.setIndex}
        />
      </div>
    </div>
  );
}

