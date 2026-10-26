"use client";

import { useCallback, useMemo, useState } from "react";
import { runSort, sortCost } from "@/lib/sorting/algorithms";
import {
  ALGORITHMS,
  COUNTING_MAX_VALUE,
  PRESETS,
  algorithmMeta,
  buildArray,
  type AlgorithmMeta,
  type PresetId,
  type SortAlgorithmId,
  type SortRun,
  type SortStep,
} from "@/lib/sorting/types";
import { PlayerDock, useStepPlayer } from "../shared/step-player";
import { OptionGroup, WidgetShell } from "../shared/widget-shell";
import { Segmented, StatReadout } from "../shared/widget-ui";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/cn";
import { SortingBars, SortingLegend } from "./sorting-bars";
import {
  AlgorithmHeading,
  AlgorithmSelect,
  ComplexityRows,
  FactList,
  NarrationLog,
  PanelLabel,
  Pseudocode,
  TradeoffTable,
  type CostRow,
} from "./sorting-parts";

/**
 * The sorting visualiser.
 *
 * One run, drawn in WidgetShell: focused by default (algorithm switch, the
 * bars, the counters, the dock), with the facts panel and the reference
 * material behind the "Details" view. `layout` decides what that reference
 * material is, because a particular lesson needs one particular thing:
 *
 *   - `console` the cost of every algorithm on this input (the default).
 *   - `log`     the whole narration history, clickable, for the recursive
 *               sorts where the order of the splits is the point.
 *   - `compact` the pseudocode, with the executing line lit, for the lessons
 *               that walk through the code.
 *   - `race`    two algorithms on the same input, for the comparisons.
 *   - `mini`    stage only, for the homepage tile. Not selectable from
 *               content; it is what `compact: true` has always meant.
 */

const SPEEDS = [
  { id: "slow", label: "Slow", ms: 700 },
  { id: "normal", label: "Normal", ms: 260 },
  { id: "fast", label: "Fast", ms: 90 },
] as const;

type SpeedId = (typeof SPEEDS)[number]["id"];

export type SortLayout = "console" | "log" | "compact" | "race" | "mini";

const LAYOUTS: SortLayout[] = ["console", "log", "compact", "race", "mini"];

function readAlgorithms(data: Record<string, unknown>): SortAlgorithmId[] {
  const raw = data.algorithms;
  if (!Array.isArray(raw)) return ALGORITHMS.map((a) => a.id);
  const ids = raw.filter((v): v is SortAlgorithmId => ALGORITHMS.some((a) => a.id === v));
  return ids.length > 0 ? ids : ALGORITHMS.map((a) => a.id);
}

function readLayout(data: Record<string, unknown>): SortLayout {
  // `compact: true` predates the layouts and means "stage only", which is the
  // mini arrangement. Kept as its own flag so the homepage tile and the older
  // embeds do not have to be rewritten.
  if (data.compact === true) return "mini";
  const raw = data.layout;
  return LAYOUTS.includes(raw as SortLayout) ? (raw as SortLayout) : "console";
}

/* -------------------------------------------------------------------------- */
/* Shared run state                                                           */
/* -------------------------------------------------------------------------- */

interface SortingInput {
  preset: PresetId;
  setPreset: (p: PresetId) => void;
  size: number;
  setSize: (n: number) => void;
  seed: number;
  shuffle: () => void;
  speed: SpeedId;
  setSpeed: (s: SpeedId) => void;
  intervalMs: number;
}

/** The input shape, its size, and how fast to play it. Layout-independent. */
function useSortingInput(data: Record<string, unknown>, defaultSize: number, defaultSpeed: SpeedId): SortingInput {
  const [preset, setPreset] = useState<PresetId>(
    PRESETS.some((p) => p.id === data.preset) ? (data.preset as PresetId) : "random",
  );
  const [size, setSize] = useState(
    typeof data.size === "number" ? Math.min(40, Math.max(5, data.size)) : defaultSize,
  );
  const [speed, setSpeed] = useState<SpeedId>(defaultSpeed);
  const [seed, setSeed] = useState(typeof data.seed === "number" ? data.seed : 20260816);

  const shuffle = useCallback(() => setSeed(Math.floor(Math.random() * 1e9)), []);
  const intervalMs = SPEEDS.find((s) => s.id === speed)?.ms ?? 260;

  return { preset, setPreset, size, setSize, seed, shuffle, speed, setSpeed, intervalMs };
}

interface SortingView {
  available: SortAlgorithmId[];
  algorithm: SortAlgorithmId;
  setAlgorithm: (id: SortAlgorithmId) => void;
  meta: AlgorithmMeta;
  run: SortRun;
  step: SortStep;
  index: number;
  total: number;
  player: ReturnType<typeof useStepPlayer>;
  maxValue: number;
  input: SortingInput;
}

/**
 * Counting sort allocates one bucket per distinct value, so it only ever runs
 * on a small range. Every layout has to agree on this or the bars and the
 * counters describe different arrays.
 */
function maxValueFor(...ids: SortAlgorithmId[]): number {
  return ids.includes("counting") ? COUNTING_MAX_VALUE : 99;
}

function useSortingView(data: Record<string, unknown>, defaultSize: number, defaultSpeed: SpeedId): SortingView {
  const available = useMemo(() => readAlgorithms(data), [data]);
  const [algorithm, setAlgorithm] = useState<SortAlgorithmId>(
    available.includes(data.algorithm as SortAlgorithmId) ? (data.algorithm as SortAlgorithmId) : available[0],
  );
  const input = useSortingInput(data, defaultSize, defaultSpeed);

  const maxValue = maxValueFor(algorithm);
  const array = useMemo(
    () => buildArray(input.preset, input.size, input.seed, maxValue),
    [input.preset, input.size, input.seed, maxValue],
  );
  const run = useMemo(() => runSort(algorithm, array), [algorithm, array]);
  const player = useStepPlayer(run.steps.length, input.intervalMs);
  const index = Math.min(player.index, run.steps.length - 1);

  return {
    available,
    algorithm,
    setAlgorithm,
    meta: algorithmMeta(algorithm),
    run,
    step: run.steps[index],
    index,
    total: run.steps.length,
    player,
    maxValue,
    input,
  };
}

/* -------------------------------------------------------------------------- */
/* Shared controls                                                            */
/* -------------------------------------------------------------------------- */

/** Input shape and array size: the settings every layout has. Speed lives in the dock. */
function InputControls({ input, showPreset = true }: { input: SortingInput; showPreset?: boolean }) {
  return (
    <>
      {showPreset && (
        <OptionGroup label="Input">
          <Segmented
            value={input.preset}
            onChange={input.setPreset}
            options={PRESETS.map((p) => ({ id: p.id, label: p.label, hint: p.note }))}
          />
        </OptionGroup>
      )}
      <label className="flex items-center gap-2 text-xs font-medium text-slate">
        Size
        <Slider
          min={5}
          max={30}
          value={input.size}
          onChange={input.setSize}
          aria-label="Number of values to sort"
          className="w-24"
        />
        <span className="w-5 tabular-nums text-ink">{input.size}</span>
      </label>
    </>
  );
}

/** The counters, in the order the design reads them. */
function runCounters(step: SortStep) {
  return [
    { label: "comparisons", value: step.comparisons },
    { label: "writes", value: step.writes },
    { label: "in place", value: `${step.sorted.length}/${step.array.length}` },
  ];
}

/** The note shown when a run stopped at the frame cap rather than finishing. */
function truncatedNote(run: SortRun, meta: AlgorithmMeta) {
  if (!run.truncated) return undefined;
  return (
    <p className="text-[11px] text-copper-dark">
      This run hit the frame limit. {meta.label} needs more steps than are watchable at this size, which is itself the
      argument for the O(n log n) sorts.
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/* Single run: console, log and compact                                       */
/* -------------------------------------------------------------------------- */

function SingleShell({
  view,
  layout,
  showComparison,
  bare,
}: {
  view: SortingView;
  layout: Exclude<SortLayout, "race">;
  showComparison: boolean;
  bare: boolean;
}) {
  const { meta, step, index, total, player, input } = view;
  const mini = layout === "mini";

  return (
    <WidgetShell
      kind="Sorting"
      title={meta.label}
      meta={PRESETS.find((p) => p.id === input.preset)?.label}
      bare={bare}
      primary={<AlgorithmSelect ids={view.available} value={view.algorithm} onChange={view.setAlgorithm} />}
      options={mini ? undefined : <InputControls input={input} />}
      stage={<SortingBars step={step} maxValue={view.maxValue} height={mini ? 110 : 170} run={mini ? undefined : view.run} compact={mini} />}
      readout={<StatReadout stats={runCounters(step)} />}
      legend={mini ? undefined : <SortingLegend />}
      sideWidth={240}
      side={
        <>
          <AlgorithmHeading meta={meta} />
          <p className="text-[12px] leading-[1.5] text-ink-soft">{meta.note}</p>
          {layout === "compact" ? (
            <Pseudocode meta={meta} line={step.line} />
          ) : (
            <div>
              <PanelLabel className="mb-1">Complexity</PanelLabel>
              <ComplexityRows meta={meta} />
            </div>
          )}
          <FactList title="Good for" items={meta.goodFor} tone="good" />
          <FactList title="Watch out" items={meta.watchOut} tone="bad" />
        </>
      }
      details={
        layout === "log" ? (
          <NarrationLog steps={view.run.steps} index={index} onJump={player.setIndex} />
        ) : layout === "console" && showComparison && view.available.length > 1 ? (
          <CostComparison view={view} highlight={[view.algorithm]} />
        ) : undefined
      }
      status={truncatedNote(view.run, meta)}
      caption={step.caption}
      captionLabel={index + 1}
      dock={<PlayerDock player={player} total={total} onShuffle={input.shuffle} />}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* 1d - race                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Two algorithms, one input, one transport.
 *
 * Both sides advance by the same number of frames and the shorter run simply
 * finishes first and holds, which is the honest picture: on a reversed array
 * quick sort is done while bubble sort is still on pass four, and the gap
 * between the two step counters is the entire lesson.
 */
function RaceBody({ data, frame }: { data: Record<string, unknown>; frame: boolean }) {
  const available = useMemo(() => readAlgorithms(data), [data]);
  const [left, setLeft] = useState<SortAlgorithmId>(
    available.includes(data.algorithm as SortAlgorithmId) ? (data.algorithm as SortAlgorithmId) : available[0],
  );
  const [right, setRight] = useState<SortAlgorithmId>(available[1] ?? available[0]);
  const input = useSortingInput(data, typeof data.size === "number" ? data.size : 14, "normal");

  const maxValue = maxValueFor(left, right);
  const array = useMemo(
    () => buildArray(input.preset, input.size, input.seed, maxValue),
    [input.preset, input.size, input.seed, maxValue],
  );
  const runA = useMemo(() => runSort(left, array), [left, array]);
  const runB = useMemo(() => runSort(right, array), [right, array]);

  const total = Math.max(runA.steps.length, runB.steps.length);
  const player = useStepPlayer(total, input.intervalMs);
  const index = Math.min(player.index, total - 1);
  const stepA = runA.steps[Math.min(index, runA.steps.length - 1)];
  const stepB = runB.steps[Math.min(index, runB.steps.length - 1)];

  const rows: CostRow[] = useMemo(
    () =>
      available.map((id) => {
        const arr = buildArray(input.preset, input.size, input.seed, maxValueFor(id));
        return { id, meta: algorithmMeta(id), ...sortCost(id, arr) };
      }),
    [available, input.preset, input.size, input.seed],
  );

  return (
    <WidgetShell
      kind="Sorting"
      title="Two sorts, one input"
      meta={`${algorithmMeta(left).label} vs ${algorithmMeta(right).label}`}
      bare={!frame}
      primary={
        <div className="flex flex-wrap items-center gap-2">
          <AlgorithmSelect label="A" ids={available} value={left} onChange={setLeft} />
          <span className="text-[11px] text-slate">vs</span>
          <AlgorithmSelect label="B" ids={available} value={right} onChange={setRight} />
        </div>
      }
      options={<InputControls input={input} />}
      stage={
        <div className="@container">
          <div className="grid gap-4 @xl:grid-cols-2">
            <RaceSide side="A" id={left} run={runA} step={stepA} index={index} maxValue={maxValue} />
            <RaceSide side="B" id={right} run={runB} step={stepB} index={index} maxValue={maxValue} />
          </div>
        </div>
      }
      legend={<SortingLegend />}
      details={
        <TradeoffTable
          rows={rows}
          highlight={[left, right]}
          footnote="Counting sort runs on a smaller value range than the others, since it needs one bucket per distinct value."
        />
      }
      caption={
        <>
          <b className="text-slate">A</b> {stepA.caption}
          <br />
          <b className="text-slate">B</b> {stepB.caption}
        </>
      }
      captionLabel={index + 1}
      dock={<PlayerDock player={player} total={total} onShuffle={input.shuffle} />}
    />
  );
}

function RaceSide({
  side,
  id,
  run,
  step,
  index,
  maxValue,
}: {
  side: "A" | "B";
  id: SortAlgorithmId;
  run: SortRun;
  step: SortStep;
  index: number;
  maxValue: number;
}) {
  const meta = algorithmMeta(id);
  const done = index >= run.steps.length - 1;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <span className="text-[13px] font-semibold text-ink">
          <span className="mr-1.5 font-label text-[11px] text-slate">{side}</span>
          {meta.label}
        </span>
        <span className="font-label text-[10.5px] text-slate">
          {step.comparisons} comparisons · {step.writes} writes
        </span>
      </div>
      <SortingBars step={step} maxValue={maxValue} height={120} compact />
      <div className="flex items-center justify-between text-[10.5px]">
        <span className="font-label text-slate">
          {Math.min(index + 1, run.steps.length)} / {run.steps.length} frames
        </span>
        <span className={cn("font-semibold", done ? "text-signal-green" : "text-transparent")} aria-hidden={!done}>
          finished
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Cost table                                                                 */
/* -------------------------------------------------------------------------- */

/** Every available algorithm's spend on the view's current input. */
function CostComparison({ view, highlight }: { view: SortingView; highlight: SortAlgorithmId[] }) {
  const { preset, size, seed } = view.input;
  const rows: CostRow[] = useMemo(
    () =>
      view.available.map((id) => {
        const arr = buildArray(preset, size, seed, maxValueFor(id));
        return { id, meta: algorithmMeta(id), ...sortCost(id, arr) };
      }),
    [view.available, preset, size, seed],
  );

  return (
    <TradeoffTable
      rows={rows}
      highlight={highlight}
      footnote="Counting sort runs on a smaller value range than the others, since it needs one bucket per distinct value."
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Entry point                                                                */
/* -------------------------------------------------------------------------- */

export function SortingVisualizerWidget({
  data,
  frame = true,
}: {
  data: Record<string, unknown>;
  frame?: boolean;
}) {
  const layout = readLayout(data);
  // The race runs two algorithms rather than one, so it owns its own state
  // instead of `useSortingView`'s. Splitting at the top keeps every hook
  // unconditional in whichever component actually renders.
  if (layout === "race") return <RaceBody data={data} frame={frame} />;
  return <SortingSingle data={data} frame={frame} layout={layout} />;
}

function SortingSingle({
  data,
  frame,
  layout,
}: {
  data: Record<string, unknown>;
  frame: boolean;
  layout: Exclude<SortLayout, "race">;
}) {
  const view = useSortingView(data, layout === "mini" ? 18 : 14, layout === "mini" ? "fast" : "normal");
  const showComparison = data.showComparison !== false;

  if (!view.step) return <p className="text-sm text-signal-coral">Sorting widget: nothing to run.</p>;

  return <SingleShell view={view} layout={layout} showComparison={showComparison} bare={!frame} />;
}
