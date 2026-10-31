"use client";

import type { ReactNode } from "react";
import type { AlgorithmStep, GraphSpec } from "@/lib/graph/types";
import { GraphCanvas } from "./graph-canvas";
import { PlayerDock, useStepPlayer } from "../shared/step-player";
import { WidgetShell } from "../shared/widget-shell";
import { CompactSelect } from "../shared/widget-ui";

// The graph widgets import these from here rather than from ../shared, so
// they stay re-exported for those callers.
export { ChipRow, PanelBox, SideNote, StatusSlot, ReservedBox } from "../shared/widget-ui";

interface AlgorithmRunnerProps {
  /** Detailed-view title, e.g. "Breadth-first search". */
  title: string;
  /** Detailed-view eyebrow. */
  kind?: string;
  graph: GraphSpec;
  steps: AlgorithmStep[];
  /** Mode switcher (BFS/DFS, Kruskal/Prim), drawn as the shell's folder tabs. */
  modes?: { id: string; label: string; sub?: string }[];
  activeMode?: string;
  onModeChange?: (id: string) => void;
  /** Worked-example switcher, a select on the stage's header row. */
  examples?: { id: string; label: string }[];
  activeExample?: string;
  onExampleChange?: (id: string) => void;
  /** Clickable nodes for choosing a start node. */
  onNodeClick?: (id: string) => void;
  markedNode?: string | null;
  /** Algorithm-specific panels (queue, distance table, edge list), drawn as
   *  the unboxed column beside the stage. */
  panel?: (step: AlgorithmStep) => ReactNode;
  /** A compact readout shown in both views, under the stage. */
  readout?: (step: AlgorithmStep) => ReactNode;
  frame?: boolean;
  className?: string;
  hint?: string;
  /** Drops the example switcher and the hint row, for tight spots like the
   *  homepage bento. */
  compact?: boolean;
  /** Passed through to the canvas: outline each group (used for SCCs). */
  groupHulls?: boolean;
  groupLabel?: string;
}

/**
 * Canvas + transport + narration, wired into WidgetShell. Each algorithm
 * widget supplies its precomputed steps and optional panels; everything about
 * playback, scrubbing and drawing lives here so the widgets stay small.
 */
export function AlgorithmRunner({
  title,
  kind = "Graphs",
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
  readout,
  frame = true,
  className,
  hint,
  compact = false,
  groupHulls,
  groupLabel,
}: AlgorithmRunnerProps) {
  const player = useStepPlayer(steps.length);
  const step = steps[Math.min(player.index, steps.length - 1)];

  if (!step) {
    return <p className="text-sm text-signal-coral">Graph widget: no steps to show (is the graph empty?).</p>;
  }

  return (
    <WidgetShell
      kind={kind}
      title={title}
      bare={!frame}
      singleView
      className={className}
      tabs={
        modes && modes.length > 1
          ? { options: modes, value: activeMode ?? modes[0].id, onChange: (id) => onModeChange?.(id) }
          : undefined
      }
      options={
        !compact && examples && examples.length > 1 ? (
          <CompactSelect
            label="Example"
            options={examples}
            value={activeExample ?? examples[0].id}
            onChange={(id) => onExampleChange?.(id)}
          />
        ) : undefined
      }
      stage={
        <GraphCanvas
          graph={graph}
          step={step}
          onNodeClick={onNodeClick}
          markedNode={markedNode}
          groupHulls={groupHulls}
          groupLabel={groupLabel}
          height={compact ? 130 : undefined}
        />
      }
      side={compact ? undefined : panel?.(step)}
      readout={readout?.(step)}
      legend={!compact && hint ? <p className="text-xs text-slate">{hint}</p> : undefined}
      caption={step.caption}
      dock={<PlayerDock player={player} total={steps.length} />}
    />
  );
}
