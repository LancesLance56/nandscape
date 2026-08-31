"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ReactFlowProvider } from "@xyflow/react";

import { cn } from "@/lib/cn";
import {
  edgeKey,
  isFlowchartSpec,
  resolveInteractive,
  type FlowStep,
  type FlowchartInteractive,
  type FlowchartSpec,
} from "@/lib/flowchart/types";
import { ALL_CHARTS, STARTER_CHART } from "@/lib/flowchart/charts";
import { WidgetFrame } from "../widget-frame";
import { StepCaption, StepControls, useStepPlayer } from "../shared/step-player";
import { FlowchartCanvas } from "./flowchart-canvas";
import { DownloadButton, FlowchartLegend, FlowchartNotePanel, deriveLegend } from "./flowchart-chrome";
import { FlowchartWorkbench } from "@/components/flowchart/workbench";
import { useFlowchartDoc } from "@/components/flowchart/use-flowchart-doc";

/* -------------------------------------------------------------------------
 * Spec resolution
 * ---------------------------------------------------------------------- */

/**
 * A block either carries a chart inline or names a stored one.
 *
 * Inline wins, and that ordering is load-bearing: a block that names a preset
 * has the stored spec injected into `chart` on the server before it ever
 * reaches here (see lib/diagrams/resolve-block-diagrams). Checking the
 * built-in table first would quietly shadow the database with a stale copy
 * compiled into the bundle - an edit to a diagram would appear to do nothing.
 *
 * ALL_CHARTS remains only as a fallback for surfaces with no server pass,
 * such as the admin editor's live preview.
 */
function resolveSpec(data: Record<string, unknown>): FlowchartSpec {
  if (isFlowchartSpec(data.chart)) return data.chart;
  if (typeof data.preset === "string" && ALL_CHARTS[data.preset]) return ALL_CHARTS[data.preset];
  if (isFlowchartSpec(data)) return data;
  return STARTER_CHART;
}

/** Block-level overrides beat whatever the preset says, so a page can turn a feature on. */
function mergeSpec(spec: FlowchartSpec, data: Record<string, unknown>): FlowchartSpec {
  const overrides: Partial<FlowchartSpec> = {};
  if (typeof data.title === "string") overrides.title = data.title;
  if (typeof data.height === "number") overrides.height = data.height;
  if (data.direction === "TB" || data.direction === "LR") overrides.direction = data.direction;
  if (typeof data.interactive === "object" && data.interactive !== null) {
    overrides.interactive = { ...spec.interactive, ...(data.interactive as FlowchartInteractive) };
  }
  return Object.keys(overrides).length > 0 ? { ...spec, ...overrides } : spec;
}

const EMPTY: ReadonlySet<string> = new Set();
const NO_STEPS: FlowStep[] = [];

/* -------------------------------------------------------------------------
 * Display widget
 * ---------------------------------------------------------------------- */

/**
 * Renders a flowchart with every interactive layer the spec asks for.
 *
 * Nodes carrying a note get a dot in the corner and become clickable. That is
 * deliberate: a flowchart box has room for "swap a[i], a[j]" and nothing else,
 * so the reason a step exists has to live somewhere, and a panel that appears
 * on demand beats cluttering every box with prose.
 */
export function FlowchartWidget({ data }: { data: Record<string, unknown> }) {
  const spec = useMemo(() => mergeSpec(resolveSpec(data), data), [data]);
  return <FlowchartView spec={spec} />;
}

const NO_MOVES: Readonly<Record<string, { x: number; y: number }>> = {};

export function FlowchartView({ spec, className }: { spec: FlowchartSpec; className?: string }) {
  const interactive = useMemo(() => resolveInteractive(spec), [spec]);
  const legend = useMemo(() => deriveLegend(spec), [spec]);

  const [selected, setSelected] = useState<string | null>(null);

  /**
   * Boxes this reader has dragged.
   *
   * Kept here rather than written into the spec, because the spec is the
   * published diagram and a reader moving a box to see it better is not an
   * edit to it. Nothing is saved and a reload brings the chart back as its
   * author drew it.
   *
   * The source spec is stored alongside so that a chart being swapped for
   * another one (the admin preview switching presets) drops the positions
   * with it, rather than applying one diagram's arrangement to the next one
   * because two of the boxes happened to share an id. Comparing during
   * render beats resetting from an effect: there is no frame in between
   * where the wrong positions are on screen.
   */
  const [dragged, setDragged] = useState<{
    source: FlowchartSpec;
    moves: Record<string, { x: number; y: number }>;
  }>(() => ({ source: spec, moves: NO_MOVES }));

  const moves = dragged.source === spec ? dragged.moves : NO_MOVES;
  const hasMoved = Object.keys(moves).length > 0;

  const moveNode = useCallback(
    (id: string, position: { x: number; y: number }) =>
      setDragged((prev) => ({
        source: spec,
        moves: { ...(prev.source === spec ? prev.moves : NO_MOVES), [id]: position },
      })),
    [spec],
  );

  const resetPositions = useCallback(() => setDragged({ source: spec, moves: NO_MOVES }), [spec]);

  // What the canvas actually draws: the author's chart with this reader's
  // boxes moved. The layout re-routes the arrows around wherever they end up,
  // so a rearranged chart is still a chart with no arrow crossing a box.
  const shown = useMemo(
    () =>
      hasMoved
        ? { ...spec, nodes: spec.nodes.map((n) => (moves[n.id] ? { ...n, position: moves[n.id] } : n)) }
        : spec,
    [spec, moves, hasMoved],
  );
  // Tracing starts on. A chart that ships a recorded walkthrough is one where
  // the order of events is the hard part, and making the reader find a button
  // before the diagram explains itself wastes the best thing it has.
  const [tracing, setTracing] = useState(true);
  const [focusOn, setFocusOn] = useState(interactive.focus);
  const [expanded, setExpanded] = useState(false);

  // A stable identity matters here: `steps` feeds the walkthrough memo below,
  // and `spec.walkthrough ?? []` would hand it a fresh array every render.
  const steps = spec.walkthrough ?? NO_STEPS;
  const player = useStepPlayer(Math.max(steps.length, 1));

  const nodeById = useMemo(() => new Map(spec.nodes.map((n) => [n.id, n])), [spec]);
  const notesCount = spec.nodes.filter((n) => n.note).length;
  const selectedNode = selected ? nodeById.get(selected) : undefined;

  /* --- walkthrough state --------------------------------------------- */

  const { visited, activeNodes, activeEdges } = useMemo(() => {
    if (!tracing || steps.length === 0) {
      return { visited: EMPTY, activeNodes: EMPTY, activeEdges: EMPTY };
    }
    const seen = new Set<string>();
    for (let i = 0; i <= player.index && i < steps.length; i++) {
      if (steps[i].node) seen.add(steps[i].node!);
    }
    const current = steps[Math.min(player.index, steps.length - 1)];
    return {
      visited: seen,
      activeNodes: current.node ? new Set([current.node]) : EMPTY,
      activeEdges: current.edge ? new Set([current.edge]) : EMPTY,
    };
  }, [tracing, steps, player.index]);

  /* --- what to fade -------------------------------------------------- */

  const dimmed = useMemo(() => {
    const hide = new Set<string>();
    // Groups are scenery. Fading a container because its children are not
    // the current step just makes the chart look broken.
    const targets = spec.nodes.filter((n) => n.type !== "group").map((n) => n.id);

    if (focusOn && selected) {
      const keep = new Set<string>([selected]);
      for (const e of spec.edges) {
        if (e.from === selected) keep.add(e.to);
        if (e.to === selected) keep.add(e.from);
      }
      for (const id of targets) if (!keep.has(id)) hide.add(id);
    }
    if (tracing && steps.length > 0) {
      for (const id of targets) if (!visited.has(id)) hide.add(id);
    }
    return hide;
  }, [spec, focusOn, selected, tracing, steps.length, visited]);

  const containerRef = useRef<HTMLDivElement>(null);

  // The controls and the legend ride on the canvas rather than in rows of
  // their own. They are small, and a chart always has slack around its own
  // outline for them to sit in; a row each cost roughly eighty pixels of
  // height and bought nothing.
  const controls = (
    <>
      {steps.length > 0 && interactive.walkthrough && (
        <ToggleChip active={tracing} onClick={() => setTracing((v) => !v)}>
          {tracing ? "Tracing" : "Trace it"}
        </ToggleChip>
      )}
      {interactive.focus && (
        <ToggleChip active={focusOn} onClick={() => setFocusOn((v) => !v)}>
          Focus
        </ToggleChip>
      )}
      {interactive.download && <DownloadButton container={containerRef} filename={spec.title ?? "flowchart"} />}
      {hasMoved && (
        <ToggleChip active={false} onClick={resetPositions}>
          Reset layout
        </ToggleChip>
      )}
    </>
  );

  const body = (fullscreen: boolean) => (
    <div className={cn("flex flex-col gap-3", className)} ref={fullscreen ? undefined : containerRef}>
      <FlowchartCanvas
        spec={shown}
        interactive={interactive}
        // Fullscreen gets a fixed tall box; inline lets the canvas size itself.
        height={fullscreen ? Math.max(spec.height ?? 0, 620) : spec.height}
        onNodeMove={interactive.draggable ? moveNode : undefined}
        // Refitting follows the drawing's shape, which is the right default
        // for a chart nobody is touching. Once a reader starts moving boxes
        // it would re-centre the canvas under their hand on every frame.
        autoFit={!hasMoved}
        selectedId={selected}
        onSelectNode={interactive.notes || interactive.focus ? setSelected : undefined}
        dimmed={dimmed}
        activeNodes={activeNodes}
        activeEdges={activeEdges}
        visitedNodes={visited}
        overlayTop={
          <>
            {controls}
            {interactive.fullscreen && !fullscreen && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="rounded-md border border-border-strong bg-surface-card/85 px-2 py-1 text-[10px] font-semibold text-ink-soft backdrop-blur-sm transition-colors hover:bg-surface-2 hover:text-ink"
              >
                Expand
              </button>
            )}
          </>
        }
        overlayBottom={
          interactive.legend ? (
            <div className="rounded-md bg-surface-card/85 px-2 py-1 backdrop-blur-sm">
              <FlowchartLegend items={legend} />
            </div>
          ) : undefined
        }
      />

      {tracing && steps.length > 0 && (
        <div className="flex flex-col gap-3">
          <StepCaption text={steps[Math.min(player.index, steps.length - 1)].caption} />
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
      )}

      {interactive.notes && notesCount > 0 && (
        <FlowchartNotePanel
          title={selectedNode?.text}
          note={selectedNode?.note}
          placeholder={
            selectedNode
              ? "No note for this step."
              : "Click any box with a dot in its corner to see why that step is there."
          }
        />
      )}

    </div>
  );

  const subtitle = [
    `${spec.nodes.filter((n) => n.type !== "group").length} steps`,
    notesCount > 0 ? `${notesCount} annotated` : null,
    steps.length > 0 ? `${steps.length}-step trace` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <WidgetFrame title={spec.title ?? "Flowchart"} subtitle={subtitle}>
        <ReactFlowProvider>{body(false)}</ReactFlowProvider>
      </WidgetFrame>

      {/* No mounted guard: `expanded` only becomes true from a click, so this
          never renders during SSR and `document` is always there by then. */}
      {expanded &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={spec.title ?? "Flowchart"}
            className="fixed inset-0 z-999 flex items-center justify-center bg-ink/40 p-6 backdrop-blur-sm"
            onClick={() => setExpanded(false)}
          >
            <div
              className="flex h-[86vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-surface-card shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2.5 border-b border-border bg-surface-2 px-4 py-2.5">
                <span className="text-[11px] font-semibold text-ink">{spec.title ?? "Flowchart"}</span>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  aria-label="Close"
                  className="ml-auto rounded-md border border-border-strong px-2 py-1 text-[10px] font-semibold text-ink-soft hover:bg-surface-card"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <ReactFlowProvider>{body(true)}</ReactFlowProvider>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        // Translucent rather than flat: these sit on the drawing now, and a
        // solid chip over a diagram reads as a hole punched in it.
        "rounded-md border px-2 py-1 text-[10px] font-semibold backdrop-blur-sm transition-colors",
        active
          ? "border-copper bg-copper text-white"
          : "border-border-strong bg-surface-card/85 text-ink-soft hover:bg-surface-2 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------
 * Maker
 * ---------------------------------------------------------------------- */

/**
 * The reader-facing editable chart, for a tutorial page or an embed.
 *
 * The same editor the studio at /flowchart runs, in its embedded shape: no
 * draft is kept, because several of these can share a page and a chart pulled
 * apart while reading an article is not a document anybody wants back.
 * Readers who want the room are pointed at the studio.
 */
export function FlowchartMakerWidget({ data }: { data: Record<string, unknown> }) {
  const initial = useMemo<FlowchartSpec>(
    () => (isFlowchartSpec(data.chart) ? data.chart : STARTER_CHART),
    [data],
  );

  const doc = useFlowchartDoc(initial);
  const boxes = doc.spec.nodes.filter((n) => n.type !== "group").length;

  return (
    <WidgetFrame
      title="Flowchart maker"
      subtitle={`${boxes} boxes · ${doc.spec.edges.length} arrows`}
      action={
        <Link
          href="/flowchart"
          className="text-[11px] font-semibold text-copper hover:text-copper-dark"
        >
          Open the full studio &rarr;
        </Link>
      }
    >
      <FlowchartWorkbench doc={doc} variant="embedded" />
    </WidgetFrame>
  );
}

export { edgeKey };
