"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { AlgorithmStep, GraphSpec } from "@/lib/graph/types";
import { GraphCanvas } from "./graph-canvas";
import { StepCaption, StepControls, useStepPlayer } from "./step-player";

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
        <div className="mb-3 flex flex-wrap gap-1.5">
          {modes.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onModeChange?.(m.id)}
              aria-pressed={m.id === activeMode}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                m.id === activeMode ? "bg-copper text-white" : "bg-surface-2 text-ink-soft hover:text-ink",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {examples && examples.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-slate">Example:</span>
          {examples.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => onExampleChange?.(ex.id)}
              aria-pressed={ex.id === activeExample}
              className={cn(
                "rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                ex.id === activeExample
                  ? "border-copper bg-copper-bg text-copper-dark"
                  : "border-border-strong text-ink-soft hover:bg-surface-2 hover:text-ink",
              )}
            >
              {ex.label}
            </button>
          ))}
        </div>
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
          {hint && <p className="mt-1 text-center text-[11px] text-slate">{hint}</p>}
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

/** Small labelled box used by the algorithm side panels. */
export function PanelBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/50 p-3">
      <div className="mb-2 text-[11px] font-semibold text-slate">{title}</div>
      {children}
    </div>
  );
}

/** Horizontal row of node chips, used for queues, stacks and candidate sets. */
export function ChipRow({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <span className="text-xs italic text-slate">{emptyLabel}</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span
          key={`${item}-${i}`}
          className="rounded-md bg-copper-bg px-2 py-1 text-xs font-bold text-copper-dark"
        >
          {item}
        </span>
      ))}
    </div>
  );
}
