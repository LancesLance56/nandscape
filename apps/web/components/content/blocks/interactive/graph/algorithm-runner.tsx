"use client";

import type { ReactNode } from "react";
import type { AlgorithmStep, GraphSpec } from "@/lib/graph/types";
import { GraphCanvas } from "./graph-canvas";
import { PlayerDock, useStepPlayer } from "../shared/step-player";
import { OptionGroup, WidgetShell, useWidgetView } from "../shared/widget-shell";

// The graph widgets import these from here rather than from ../shared, so
// they stay re-exported for those callers.
import { Segmented } from "../shared/widget-ui";

export { ChipRow, PanelBox, StatusSlot, ReservedBox } from "../shared/widget-ui";

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
  /** Worked-example switcher, in the detailed options row. */
  examples?: { id: string; label: string }[];
  activeExample?: string;
  onExampleChange?: (id: string) => void;
  /** Clickable nodes for choosing a start node. */
  onNodeClick?: (id: string) => void;
  markedNode?: string | null;
  /** Algorithm-specific side panels (queue, distance table, edge list). Detailed view. */
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
      className={className}
      tabs={
        modes && modes.length > 1
          ? { options: modes, value: activeMode ?? modes[0].id, onChange: (id) => onModeChange?.(id) }
          : undefined
      }
      options={
        !compact && examples && examples.length > 1 ? (
          <OptionGroup label="Example">
            <Segmented
              options={examples}
              value={activeExample ?? examples[0].id}
              onChange={(id) => onExampleChange?.(id)}
            />
          </OptionGroup>
        ) : undefined
      }
      stage={
        <Stage hint={compact ? undefined : hint}>
          <GraphCanvas
            graph={graph}
            step={step}
            onNodeClick={onNodeClick}
            markedNode={markedNode}
            groupHulls={groupHulls}
            groupLabel={groupLabel}
            height={compact ? 130 : undefined}
          />
        </Stage>
      }
      side={panel ? panel(step) : undefined}
      sideWidth={230}
      readout={readout?.(step)}
      caption={step.caption}
      captionLabel={player.index + 1}
      dock={<PlayerDock player={player} total={steps.length} />}
    />
  );
}

/** The canvas, plus its "click a node" hint in the detailed view only. */
function Stage({ hint, children }: { hint?: string; children: ReactNode }) {
  const view = useWidgetView();
  return (
    <div>
      {children}
      {view === "detailed" && hint && <p className="mt-1 text-center text-[11px] text-slate">{hint}</p>}
    </div>
  );
}
