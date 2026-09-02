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
import { WidgetFrame } from "../widget-frame";
import { StepCaption, StepControls, StepTransport, useStepPlayer } from "../shared/step-player";
import { Segmented, Stat, StatusSlot } from "../shared/widget-ui";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/cn";
import { SortingBars, SortingLegend } from "./sorting-bars";
import {
  AlgorithmHeading,
  AlgorithmRail,
  AlgorithmSelect,
  ComplexityChips,
  ComplexityRows,
  CounterPills,
  FactList,
  Narration,
  NarrationLog,
  PanelLabel,
  ProgressRail,
  Pseudocode,
  TradeoffTable,
  type CostRow,
} from "./sorting-parts";

/**
 * The sorting visualiser.
 *
 * One run, four arrangements of it. `console` is the default and the one used
 * almost everywhere: a picker rail, the stage, and a facts panel, so the
 * reader can switch algorithms and see the trade-off that explains what they
 * just watched. The other three exist because a particular lesson needs one
 * particular thing bigger:
 *
 *   - `log`     the whole narration history, clickable, for the recursive
 *               sorts where the order of the splits is the point.
 *   - `compact` the pseudocode beside the bars, with the executing line lit,
 *               for the lessons that walk through the code.
 *   - `race`    two algorithms on the same input, for the comparisons.
 *   - `mini`    stage only, for the homepage tile. Not selectable from
 *               content; it is what `compact: true` has always meant.
 *
 * The layouts share `useSortingView` and the panels in `sorting-parts.tsx`,
 * so a change to how a run is set up or how a fact is drawn lands in all four.
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

/** Input shape, array size and playback speed: the settings every layout has. */
function InputControls({
  input,
  showPreset = true,
  className,
}: {
  input: SortingInput;
  showPreset?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
      {showPreset && (
        <Segmented
          label="Input"
          value={input.preset}
          onChange={input.setPreset}
          options={PRESETS.map((p) => ({ id: p.id, label: p.label, hint: p.note }))}
        />
      )}
      <label className="flex items-center gap-2 text-[11px] font-semibold text-slate">
        Size
        <Slider
          min={5}
          max={30}
          value={input.size}
          onChange={input.setSize}
          aria-label="Number of values to sort"
          className="w-20"
        />
        <span className="w-5 tabular-nums text-ink">{input.size}</span>
      </label>
      <Segmented
        label="Speed"
        size="xs"
        value={input.speed}
        onChange={input.setSpeed}
        options={SPEEDS.map((s) => ({ id: s.id, label: s.label }))}
      />
    </div>
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
function TruncatedNote({ run, meta }: { run: SortRun; meta: AlgorithmMeta }) {
  return (
    <StatusSlot lines={2}>
      {run.truncated && (
        <p className="text-[11px] text-copper-dark">
          This run hit the frame limit. {meta.label} needs more steps than are watchable at this size, which is itself
          the argument for the O(n log n) sorts.
        </p>
      )}
    </StatusSlot>
  );
}

/* -------------------------------------------------------------------------- */
/* 1a - console                                                               */
/* -------------------------------------------------------------------------- */

function ConsoleBody({ view, showComparison }: { view: SortingView; showComparison: boolean }) {
  const { meta, step, index, total, player, input } = view;

  return (
    <div className="@container flex flex-col gap-4">
      <InputControls input={input} />

      <div className="flex flex-col gap-4 @3xl:flex-row @3xl:gap-5">
        <AlgorithmRail
          ids={view.available}
          value={view.algorithm}
          onChange={view.setAlgorithm}
          className="@3xl:w-[172px] @3xl:shrink-0 @3xl:border-r @3xl:border-border @3xl:pr-4"
        />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <SortingBars step={step} maxValue={view.maxValue} height={210} />
          <SortingLegend />
          <Narration index={index} total={total} text={step.caption} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <StepTransport
              index={player.index}
              total={total}
              playing={player.playing}
              onPlay={player.play}
              onPause={player.pause}
              onNext={player.next}
              onPrev={player.prev}
              onReset={player.reset}
              onShuffle={input.shuffle}
            />
            <CounterPills items={runCounters(step)} />
          </div>
          <ProgressRail index={index} total={total} />
        </div>

        <div className="flex flex-col gap-3 @3xl:w-[228px] @3xl:shrink-0 @3xl:border-l @3xl:border-border @3xl:pl-4">
          <AlgorithmHeading meta={meta} />
          <p className="text-[12px] leading-[1.5] text-ink-soft">{meta.note}</p>
          <div>
            <PanelLabel className="mb-1">Complexity</PanelLabel>
            <ComplexityRows meta={meta} />
          </div>
          <FactList title="Good for" items={meta.goodFor} tone="good" />
          <FactList title="Watch out" items={meta.watchOut} tone="bad" />
        </div>
      </div>

      <TruncatedNote run={view.run} meta={meta} />

      {showComparison && view.available.length > 1 && (
        <CostComparison view={view} highlight={[view.algorithm]} />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 1b - stage over a narration log                                            */
/* -------------------------------------------------------------------------- */

function LogBody({ view }: { view: SortingView }) {
  const { meta, step, index, total, player, input } = view;

  return (
    <div className="@container flex flex-col gap-4">
      <Segmented
        label="Algorithm"
        variant="solid"
        value={view.algorithm}
        onChange={view.setAlgorithm}
        options={view.available.map((id) => ({ id, label: algorithmMeta(id).label.replace(" sort", "") }))}
      />

      <SortingBars step={step} maxValue={view.maxValue} height={240} />
      <SortingLegend />

      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
        <StepTransport
          index={player.index}
          total={total}
          playing={player.playing}
          onPlay={player.play}
          onPause={player.pause}
          onNext={player.next}
          onPrev={player.prev}
          onReset={player.reset}
          onShuffle={input.shuffle}
        />
        <InputControls input={input} />
      </div>

      <ProgressRail index={index} total={total} />

      <div className="flex flex-col gap-4 border-t border-border pt-4 @2xl:flex-row @2xl:gap-5">
        <NarrationLog
          steps={view.run.steps}
          index={index}
          onJump={player.setIndex}
          className="min-w-0 @2xl:flex-[1.15] @2xl:border-r @2xl:border-border @2xl:pr-5"
        />
        <div className="flex min-w-0 flex-col gap-3 @2xl:flex-1">
          <AlgorithmHeading meta={meta} />
          <ComplexityChips meta={meta} />
          <div className="flex flex-col gap-4 @xl:flex-row">
            <FactList title="Pros" items={meta.goodFor} tone="good" className="flex-1" />
            <FactList title="Cons" items={meta.watchOut} tone="bad" className="flex-1" />
          </div>
        </div>
      </div>

      <TruncatedNote run={view.run} meta={meta} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 1c - compact split, with the pseudocode                                    */
/* -------------------------------------------------------------------------- */

const COMPACT_TABS = [
  { id: "narration", label: "Narration" },
  { id: "complexity", label: "Complexity" },
  { id: "tradeoffs", label: "Trade-offs" },
] as const;

type CompactTab = (typeof COMPACT_TABS)[number]["id"];

function CompactBody({ view }: { view: SortingView }) {
  const { meta, step, index, total, player, input } = view;
  const [tab, setTab] = useState<CompactTab>("narration");

  return (
    <div className="@container flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AlgorithmSelect ids={view.available} value={view.algorithm} onChange={view.setAlgorithm} />
        <Segmented size="xs" value={tab} onChange={setTab} options={COMPACT_TABS} />
      </div>

      <div className="flex flex-col gap-3 @xl:flex-row @xl:gap-4">
        <div className="flex min-w-0 flex-[1.25] flex-col gap-2.5">
          <SortingBars step={step} maxValue={view.maxValue} height={172} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StepTransport
              index={player.index}
              total={total}
              playing={player.playing}
              onPlay={player.play}
              onPause={player.pause}
              onNext={player.next}
              onPrev={player.prev}
              onReset={player.reset}
              onShuffle={input.shuffle}
              size="sm"
            />
            <span className="font-mono text-[11px] tabular-nums text-slate">
              {index + 1} / {total}
            </span>
          </div>
          <ProgressRail index={index} total={total} />
          <CounterPills items={runCounters(step)} />
        </div>

        <div className="flex min-w-0 flex-col gap-2.5 rounded-lg border border-border bg-surface-2/50 p-3 @xl:w-[17.5rem] @xl:shrink-0">
          {tab === "narration" && (
            <div key="narration" className="flex flex-col gap-2.5 duration-150 animate-in fade-in motion-reduce:animate-none">
              <PanelLabel>Step {index + 1}</PanelLabel>
              <p key={index} className="h-[3.4rem] overflow-y-auto text-[13px] leading-[1.45] text-ink">
                {step.caption}
              </p>
              <Pseudocode meta={meta} line={step.line} />
            </div>
          )}
          {tab === "complexity" && (
            <div key="complexity" className="flex flex-col gap-2.5 duration-150 animate-in fade-in motion-reduce:animate-none">
              <AlgorithmHeading meta={meta} />
              <ComplexityRows meta={meta} />
              <p className="text-[12px] leading-[1.5] text-ink-soft">{meta.note}</p>
            </div>
          )}
          {tab === "tradeoffs" && (
            <div key="tradeoffs" className="flex flex-col gap-3 duration-150 animate-in fade-in motion-reduce:animate-none">
              <FactList title="Good for" items={meta.goodFor} tone="good" />
              <FactList title="Watch out" items={meta.watchOut} tone="bad" />
            </div>
          )}
        </div>
      </div>

      <InputControls input={input} />
      <TruncatedNote run={view.run} meta={meta} />
    </div>
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

  const body = (
    <div className="@container flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <AlgorithmSelect label="A" ids={available} value={left} onChange={setLeft} />
          <span className="text-[11px] text-slate">vs</span>
          <AlgorithmSelect label="B" ids={available} value={right} onChange={setRight} />
        </div>
        <StepTransport
          index={player.index}
          total={total}
          playing={player.playing}
          onPlay={player.play}
          onPause={player.pause}
          onNext={player.next}
          onPrev={player.prev}
          onReset={player.reset}
          onShuffle={input.shuffle}
        />
      </div>

      <div className="grid gap-4 @xl:grid-cols-2">
        <RaceSide side="A" id={left} run={runA} step={stepA} index={index} maxValue={maxValue} />
        <RaceSide side="B" id={right} run={runB} step={stepB} index={index} maxValue={maxValue} />
      </div>

      <SortingLegend />
      <ProgressRail index={index} total={total} />

      <div className="rounded-lg border border-border bg-surface-2/50 p-3">
        <PanelLabel>Narration · side by side</PanelLabel>
        <div className="mt-2 grid gap-x-5 gap-y-2 @xl:grid-cols-2">
          <p key={`a-${index}`} className="h-[2.6rem] overflow-y-auto text-[12.5px] leading-[1.45] text-ink duration-150 animate-in fade-in motion-reduce:animate-none">
            <b className="text-slate">A</b> — {stepA.caption}
          </p>
          <p key={`b-${index}`} className="h-[2.6rem] overflow-y-auto text-[12.5px] leading-[1.45] text-ink duration-150 animate-in fade-in motion-reduce:animate-none">
            <b className="text-slate">B</b> — {stepB.caption}
          </p>
        </div>
      </div>

      <InputControls input={input} />

      <TradeoffTable
        rows={rows}
        highlight={[left, right]}
        footnote="Counting sort runs on a smaller value range than the others, since it needs one bucket per distinct value."
      />
    </div>
  );

  if (!frame) return body;
  return (
    <WidgetFrame title="Sorting visualizer" subtitle={`${algorithmMeta(left).label} vs ${algorithmMeta(right).label}`}>
      {body}
    </WidgetFrame>
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
          <span className="mr-1.5 font-mono text-[11px] text-slate">{side}</span>
          {meta.label}
        </span>
        <span className="font-mono text-[10.5px] text-slate">
          {step.comparisons} comparisons · {step.writes} writes
        </span>
      </div>
      <SortingBars step={step} maxValue={maxValue} height={150} compact />
      <div className="flex items-center justify-between text-[10.5px]">
        <span className="font-mono text-slate">
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
/* mini - stage only, for the homepage tile                                   */
/* -------------------------------------------------------------------------- */

function MiniBody({ view }: { view: SortingView }) {
  const { step, total, player } = view;
  return (
    <div className="flex flex-col gap-3">
      <Segmented
        label="Algorithm"
        value={view.algorithm}
        onChange={view.setAlgorithm}
        options={view.available.map((id) => ({ id, label: algorithmMeta(id).label.replace(" sort", "") }))}
      />
      <SortingBars step={step} maxValue={view.maxValue} height={150} compact />
      <div className="grid grid-cols-3 gap-2">
        <Stat label="comparisons" value={step.comparisons} />
        <Stat label="writes" value={step.writes} />
        <Stat label="in place" value={`${step.sorted.length} / ${step.array.length}`} tone="good" />
      </div>
      <StepCaption text={step.caption} />
      <StepControls
        index={player.index}
        total={total}
        playing={player.playing}
        onPlay={player.play}
        onPause={player.pause}
        onNext={player.next}
        onPrev={player.prev}
        onReset={player.reset}
        onScrub={player.setIndex}
      />
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

  const body =
    layout === "log" ? (
      <LogBody view={view} />
    ) : layout === "compact" ? (
      <CompactBody view={view} />
    ) : layout === "mini" ? (
      <MiniBody view={view} />
    ) : (
      <ConsoleBody view={view} showComparison={showComparison} />
    );

  if (!frame) return body;

  return (
    <WidgetFrame
      title="Sorting visualizer"
      subtitle={`${view.meta.label} · ${PRESETS.find((p) => p.id === view.input.preset)?.label}`}
    >
      {body}
    </WidgetFrame>
  );
}
