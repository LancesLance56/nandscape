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
import { WidgetShell, modeTabs } from "../shared/widget-shell";
import { StatReadout } from "../shared/widget-ui";
import { cn } from "@/lib/cn";
import { AuxReadout, SortingBars, SortingLegend, runAuxLabel } from "./sorting-bars";
import {
  CostTopic,
  FactsTopic,
  InputPicker,
  SizeControl,
  SortCounters,
  SortGuide,
  ThisInputTopic,
  type GuideTopic,
} from "./sorting-focused";
import {
  AlgorithmSelect,
  NarrationLog,
  Pseudocode,
  TradeoffTable,
  type CostRow,
} from "./sorting-parts";

/**
 * The sorting visualiser.
 *
 * One run, drawn in WidgetShell as a single view with no Details chip: the
 * algorithms as folder tabs, the input and counters on one row over the bars,
 * and a guide beside them that shows one topic at a time ("Focused v2" on the
 * redesign canvas). `layout` decides which topic a lesson opens on, because a
 * particular lesson needs one particular thing:
 *
 *   - `console` the algorithm's cost, with every algorithm's spend on this
 *               input one tab away (the default).
 *   - `log`     the narration history, clickable, for the recursive sorts
 *               where the order of the splits is the point.
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

/** Input shape and array size, for the race. Speed lives in the dock. */
function InputControls({ input }: { input: SortingInput }) {
  return (
    <>
      <InputPicker value={input.preset} onChange={input.setPreset} />
      <SizeControl value={input.size} onChange={input.setSize} />
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

/**
 * The four sorts every course teaches first get a tab each; the rest wait in
 * a "More" tab, so the row stays short enough to read at a glance. If a block
 * only offers algorithms from the "More" set, they simply become the tabs.
 */
const CORE_SORTS: readonly SortAlgorithmId[] = ["bubble", "insertion", "merge", "quick"];

function algorithmTabs(available: readonly SortAlgorithmId[], value: SortAlgorithmId, onChange: (id: SortAlgorithmId) => void) {
  if (available.length < 2) return undefined;
  // "Bubble sort" reads as "Bubble" on a tab: every tab here is a sort.
  const item = (id: SortAlgorithmId) => ({ id, label: algorithmMeta(id).label.replace(/ sort$/i, "") });
  const core = available.filter((id) => CORE_SORTS.includes(id)).map(item);
  const more = available.filter((id) => !CORE_SORTS.includes(id)).map(item);
  const options = core.length === 0 ? more : more.length === 0 ? core : [...core, { id: "more" as const, label: "More", menu: more }];
  return modeTabs<SortAlgorithmId | "more">(options, value, (id) => id !== "more" && onChange(id));
}

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
  const { meta, total, player, input } = view;
  if (bare || layout === "mini") return <TileShell view={view} layout={layout} bare={bare} />;

  return (
    <WidgetShell
      kind="Sorting"
      title={meta.label}
      singleView
      tabs={algorithmTabs(view.available, view.algorithm, view.setAlgorithm)}
      stage={<FocusedStage view={view} layout={layout} showComparison={showComparison} />}
      // The stage lays out its own columns, so it wants the card's full width.
      stageClassName="self-stretch"
      status={truncatedNote(view.run, meta)}
      dock={<PlayerDock player={player} total={total} onShuffle={input.shuffle} />}
    />
  );
}

/**
 * The bars with their controls above and key below, and the guide beside
 * them. Two columns once the card is wide enough, stacked below that.
 */
function FocusedStage({
  view,
  layout,
  showComparison,
}: {
  view: SortingView;
  layout: "console" | "log" | "compact";
  showComparison: boolean;
}) {
  const { meta, step, index, player, input } = view;
  const { preset, size, seed } = input;

  const rows: CostRow[] = useMemo(
    () =>
      view.available.map((id) => {
        const arr = buildArray(preset, size, seed, maxValueFor(id));
        return { id, meta: algorithmMeta(id), ...sortCost(id, arr) };
      }),
    [view.available, preset, size, seed],
  );

  const auxLabel = useMemo(() => runAuxLabel(view.run), [view.run]);

  const topics: GuideTopic[] = [
    ...(layout === "compact"
      ? [{ id: "code", label: "Code", body: <Pseudocode meta={meta} line={step.line} frameless /> }]
      : []),
    ...(layout === "log"
      ? [{ id: "steps", label: "Steps", body: <NarrationLog steps={view.run.steps} index={index} onJump={player.setIndex} /> }]
      : []),
    { id: "cost", label: "Cost", body: <CostTopic meta={meta} /> },
    { id: "good", label: "Good for", body: <FactsTopic items={meta.goodFor} tone="good" /> },
    { id: "watch", label: "Watch out", body: <FactsTopic items={meta.watchOut} tone="bad" /> },
    ...(showComparison && view.available.length > 1
      ? [{ id: "input", label: "This input", body: <ThisInputTopic rows={rows} current={view.algorithm} /> }]
      : []),
  ];

  return (
    <div className="@container">
      <div className="grid gap-x-7 gap-y-6 @2xl:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="flex min-w-0 flex-col">
          {/* One line where the column allows: the slider and the gaps are
              sized so the counters fit beside the controls at the two-column
              width, and only a phone wraps them under. */}
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <InputPicker value={input.preset} onChange={input.setPreset} />
            <SizeControl value={input.size} onChange={input.setSize} />
            <div className="ml-auto">
              <SortCounters
                items={[
                  { label: "comparisons", value: step.comparisons },
                  { label: "writes", value: step.writes },
                  { label: "in place", value: `${step.sorted.length}/${step.array.length}`, good: true },
                ]}
              />
            </div>
          </div>
          <SortingBars step={step} maxValue={view.maxValue} height={330} run={view.run} frameless />
          <div className="mt-2 flex min-h-5 flex-wrap items-center justify-between gap-x-5 gap-y-2">
            <SortingLegend />
            {auxLabel && <AuxReadout aux={step.aux} label={auxLabel} />}
          </div>
        </div>
        {/* Keyed by algorithm so a new algorithm opens on the lesson's topic again. */}
        <SortGuide key={view.algorithm} meta={meta} topics={topics} defaultTopic={topics[0].id} />
      </div>
    </div>
  );
}

/**
 * The homepage tile (`bare`) and the `mini` stage: no card for tabs to stand
 * on and no room for the guide, so the algorithm is a dropdown and the rest is
 * the bars and the counters.
 */
function TileShell({ view, layout, bare }: { view: SortingView; layout: Exclude<SortLayout, "race">; bare: boolean }) {
  const { meta, step, total, player, input } = view;
  const mini = layout === "mini";

  return (
    <WidgetShell
      kind="Sorting"
      title={meta.label}
      bare={bare}
      singleView
      primary={<AlgorithmSelect ids={view.available} value={view.algorithm} onChange={view.setAlgorithm} />}
      stage={<SortingBars step={step} maxValue={view.maxValue} height={mini ? 110 : 330} run={mini ? undefined : view.run} compact={mini} />}
      readout={<StatReadout stats={runCounters(step)} />}
      legend={mini ? undefined : <SortingLegend />}
      status={truncatedNote(view.run, meta)}
      caption={step.caption}
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
