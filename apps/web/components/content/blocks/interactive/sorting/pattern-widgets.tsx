"use client";

import { useMemo, useState } from "react";
import {
  mergeIntervalsSteps,
  mergeSweepSteps,
  minimumPlatformsSteps,
  pairingSteps,
  partitionSteps,
  type Interval,
  type MergeMode,
  type PairingMode,
  type PartitionMode,
} from "@/lib/sorting/patterns";
import { mulberry32 } from "@/lib/sorting/types";
import { WidgetFrame } from "../widget-frame";
import { StepCaption, StepControls, useStepPlayer } from "../shared/step-player";
import { cn } from "@/lib/cn";
import { SortingBars } from "./sorting-bars";
import { Segmented, Stat, WidgetButton } from "../shared/widget-ui";

/* -------------------------------------------------------------------------
 * Shared bits
 * ---------------------------------------------------------------------- */

function Chips({ values, highlight, tone = "muted" }: { values: number[]; highlight?: number[]; tone?: "muted" | "green" }) {
  const hi = new Set(highlight ?? []);
  return (
    <div className="flex flex-wrap gap-1">
      {values.length === 0 && <span className="text-xs italic text-slate">empty</span>}
      {values.map((v, i) => (
        <span
          key={i}
          className={cn(
            "flex h-6 min-w-6 items-center justify-center rounded px-1.5 font-mono text-xs font-bold tabular-nums",
            hi.has(i)
              ? "bg-copper text-white"
              : tone === "green"
                ? "bg-signal-green/15 text-signal-green"
                : "bg-surface-3 text-ink-soft",
          )}
        >
          {v}
        </span>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Partition explorer
 * ---------------------------------------------------------------------- */

const PARTITION_MODES: { id: PartitionMode; label: string; blurb: string }[] = [
  { id: "binary", label: "0s and 1s", blurb: "Two pointers walking in from both ends." },
  { id: "zeroes", label: "Move zeroes", blurb: "A read pointer and a write pointer, keeping the other values in order." },
  { id: "ternary", label: "0s, 1s and 2s", blurb: "Dutch national flag: three regions, one pass." },
];

function buildPartitionInput(mode: PartitionMode, seed: number): number[] {
  const rand = mulberry32(seed);
  const n = 12;
  if (mode === "ternary") return Array.from({ length: n }, () => Math.floor(rand() * 3));
  if (mode === "zeroes") return Array.from({ length: n }, () => (rand() < 0.4 ? 0 : 1 + Math.floor(rand() * 9)));
  return Array.from({ length: n }, () => (rand() < 0.5 ? 0 : 1));
}

export function PartitionExplorerWidget({ data }: { data: Record<string, unknown> }) {
  const [mode, setMode] = useState<PartitionMode>(
    PARTITION_MODES.some((m) => m.id === data.mode) ? (data.mode as PartitionMode) : "ternary",
  );
  const [seed, setSeed] = useState(typeof data.seed === "number" ? data.seed : 7);

  const input = useMemo(() => buildPartitionInput(mode, seed), [mode, seed]);
  const run = useMemo(() => partitionSteps(input, mode), [input, mode]);
  const player = useStepPlayer(run.steps.length, 450);
  const step = run.steps[Math.min(player.index, run.steps.length - 1)];
  const blurb = PARTITION_MODES.find((m) => m.id === mode)?.blurb;

  if (!step) return null;
  const maxValue = Math.max(...input, 1);

  return (
    <WidgetFrame title="One-pass partitioning" subtitle={PARTITION_MODES.find((m) => m.id === mode)?.label}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Segmented label="Problem" options={PARTITION_MODES.map((m) => ({ id: m.id, label: m.label }))} value={mode} onChange={setMode} />
          <WidgetButton onClick={() => setSeed(Math.floor(Math.random() * 1e9))}>
            Shuffle
          </WidgetButton>
        </div>

        <p className="text-[11px] text-slate">{blurb}</p>

        <SortingBars step={step} maxValue={maxValue} height={140} />

        <div className="grid grid-cols-2 gap-2">
          <Stat label="comparisons" value={step.comparisons} />
          <Stat label="swaps" value={Math.floor(step.writes / 2)} />
        </div>

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
        <p className="text-[11px] leading-relaxed text-slate">
          Every one of these runs in a single pass with no extra memory. Sorting would also work and would be O(n log n);
          these are O(n) because the values come from a tiny fixed set.
        </p>
      </div>
    </WidgetFrame>
  );
}

/* -------------------------------------------------------------------------
 * Merge explorer
 * ---------------------------------------------------------------------- */

const MERGE_MODES: { id: MergeMode; label: string }[] = [
  { id: "merge", label: "Merge" },
  { id: "union", label: "Union" },
  { id: "intersection", label: "Intersection" },
  { id: "inversions", label: "Count inversions" },
];

export function MergeExplorerWidget({ data }: { data: Record<string, unknown> }) {
  const [mode, setMode] = useState<MergeMode>(
    MERGE_MODES.some((m) => m.id === data.mode) ? (data.mode as MergeMode) : "merge",
  );
  const left = useMemo(
    () => (Array.isArray(data.left) ? (data.left as number[]) : [1, 3, 4, 7, 9]),
    [data.left],
  );
  const right = useMemo(
    () => (Array.isArray(data.right) ? (data.right as number[]) : [2, 3, 6, 8]),
    [data.right],
  );

  const run = useMemo(() => mergeSweepSteps(left, right, mode), [left, right, mode]);
  const player = useStepPlayer(run.steps.length, 600);
  const step = run.steps[Math.min(player.index, run.steps.length - 1)];
  if (!step) return null;

  return (
    <WidgetFrame title="Two-pointer merge" subtitle={MERGE_MODES.find((m) => m.id === mode)?.label}>
      <div className="flex flex-col gap-4">
        <Segmented label="Operation" options={MERGE_MODES} value={mode} onChange={setMode} />

        <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-2/40 p-3">
          <Row label="left" values={step.left} pointer={step.i} />
          <Row label="right" values={step.right} pointer={step.j} />
        </div>

        <div className="rounded-lg border border-border bg-surface-2/40 p-3">
          <div className="mb-2 text-[11px] font-semibold text-slate">
            {mode === "inversions" ? "merged output" : "result"}
          </div>
          <Chips values={step.output} highlight={step.emitted !== undefined ? [step.emitted] : []} tone="green" />
        </div>

        {mode === "inversions" && (
          <div className="grid grid-cols-2 gap-2">
            <Stat label="inversions" value={step.inversions ?? 0} tone="good" />
            <Stat label="comparisons" value={step.comparisons} />
          </div>
        )}
        {mode !== "inversions" && (
          <div className="grid grid-cols-2 gap-2">
            <Stat label="comparisons" value={step.comparisons} />
            <Stat label="emitted" value={step.output.length} tone="good" />
          </div>
        )}

        {step.creditedFrom && step.creditedFrom.length > 0 && (
          <div className="rounded-lg border border-copper/40 bg-copper-bg/40 p-3">
            <div className="mb-1.5 text-[11px] font-semibold text-copper-dark">
              These {step.creditedFrom.length} left value(s) are all greater, so each forms an inversion
            </div>
            <Chips values={step.creditedFrom} />
          </div>
        )}

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
      </div>
    </WidgetFrame>
  );
}

function Row({ label, values, pointer }: { label: string; values: number[]; pointer: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 shrink-0 text-[10px] font-semibold uppercase text-slate">{label}</span>
      <div className="flex flex-wrap gap-1">
        {values.map((v, i) => (
          <span
            key={i}
            className={cn(
              "flex h-7 min-w-7 items-center justify-center rounded px-1.5 font-mono text-xs font-bold tabular-nums",
              i === pointer
                ? "bg-copper text-white ring-2 ring-copper-dark"
                : i < pointer
                  ? "bg-surface-3 text-border-strong line-through"
                  : "bg-surface-3 text-ink-soft",
            )}
          >
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Interval explorer
 * ---------------------------------------------------------------------- */

const DEFAULT_INTERVALS: Interval[] = [
  { start: 1, end: 4 },
  { start: 3, end: 6 },
  { start: 8, end: 10 },
  { start: 9, end: 13 },
  { start: 15, end: 18 },
];

export function IntervalExplorerWidget({ data }: { data: Record<string, unknown> }) {
  const [mode, setMode] = useState<"merge" | "platforms">(data.mode === "platforms" ? "platforms" : "merge");
  const intervals = useMemo(() => {
    const raw = data.intervals;
    if (!Array.isArray(raw)) return DEFAULT_INTERVALS;
    const parsed = raw.filter(
      (v): v is Interval => typeof v === "object" && v !== null && typeof (v as Interval).start === "number",
    );
    return parsed.length > 0 ? parsed : DEFAULT_INTERVALS;
  }, [data.intervals]);

  const run = useMemo(
    () => (mode === "merge" ? mergeIntervalsSteps(intervals) : minimumPlatformsSteps(intervals)),
    [intervals, mode],
  );
  const player = useStepPlayer(run.steps.length, 700);
  const step = run.steps[Math.min(player.index, run.steps.length - 1)];
  if (!step) return null;

  const maxTime = Math.max(...intervals.map((i) => i.end)) + 1;
  const pct = (v: number) => (v / maxTime) * 100;

  return (
    <WidgetFrame
      title="Interval sweep"
      subtitle={mode === "merge" ? "Merging overlaps" : `Peak overlap: ${step.maxConcurrent ?? 0}`}
    >
      <div className="flex flex-col gap-4">
        <Segmented
          label="Problem"
          options={[
            { id: "merge" as const, label: "Merge overlapping" },
            { id: "platforms" as const, label: "Minimum platforms" },
          ]}
          value={mode}
          onChange={setMode}
        />

        <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface-2/40 p-3">
          <div className="mb-1 text-[11px] font-semibold text-slate">Input, sorted by start time</div>
          {step.ordered.map((iv, i) => (
            <div key={i} className="relative h-6">
              <div className="absolute inset-0 rounded bg-surface-3/50" />
              <div
                className={cn(
                  "absolute flex h-full items-center justify-center rounded text-[10px] font-bold transition-colors",
                  i === step.active ? "bg-copper text-white" : "bg-border-strong text-surface",
                )}
                style={{ left: `${pct(iv.start)}%`, width: `${Math.max(pct(iv.end - iv.start), 6)}%` }}
              >
                {iv.start}-{iv.end}
              </div>
            </div>
          ))}
        </div>

        {mode === "merge" && (
          <div className="flex flex-col gap-1.5 rounded-lg border border-signal-green/40 bg-signal-green-bg/30 p-3">
            <div className="mb-1 text-[11px] font-semibold text-signal-green-strong">
              Merged output ({step.merged.length})
            </div>
            {step.merged.length === 0 && <span className="text-xs italic text-slate">nothing yet</span>}
            {step.merged.map((iv, i) => (
              <div key={i} className="relative h-6">
                <div
                  className="absolute flex h-full items-center justify-center rounded bg-signal-green text-[10px] font-bold text-white"
                  style={{ left: `${pct(iv.start)}%`, width: `${Math.max(pct(iv.end - iv.start), 6)}%` }}
                >
                  {iv.start}-{iv.end}
                </div>
              </div>
            ))}
          </div>
        )}

        {mode === "platforms" && (
          <div className="grid grid-cols-2 gap-2">
            <Stat label="in use now" value={step.concurrent ?? 0} />
            <Stat label="peak so far" value={step.maxConcurrent ?? 0} tone="good" />
          </div>
        )}

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
      </div>
    </WidgetFrame>
  );
}

/* -------------------------------------------------------------------------
 * Sort-then-pair explorer
 * ---------------------------------------------------------------------- */

const PAIRING_MODES: { id: PairingMode; label: string; needsSecond: boolean }[] = [
  { id: "minDiff", label: "Minimum difference pair", needsSecond: false },
  { id: "wave", label: "Wave form", needsSecond: false },
  { id: "maxIndexSum", label: "Max sum of i × arr[i]", needsSecond: false },
  { id: "tywin", label: "Tywin's war strategy", needsSecond: true },
  { id: "moves", label: "Minimum moves to seat", needsSecond: true },
];

export function PairingExplorerWidget({ data }: { data: Record<string, unknown> }) {
  const [mode, setMode] = useState<PairingMode>(
    PAIRING_MODES.some((m) => m.id === data.mode) ? (data.mode as PairingMode) : "minDiff",
  );
  const [seed, setSeed] = useState(typeof data.seed === "number" ? data.seed : 11);

  const { a, b } = useMemo(() => {
    const rand = mulberry32(seed);
    const n = 6;
    return {
      a: Array.from({ length: n }, () => 1 + Math.floor(rand() * 40)),
      b: Array.from({ length: n }, () => 1 + Math.floor(rand() * 40)),
    };
  }, [seed]);

  const run = useMemo(() => pairingSteps(a, b, mode), [a, b, mode]);
  const player = useStepPlayer(run.steps.length, 700);
  const step = run.steps[Math.min(player.index, run.steps.length - 1)];
  const needsSecond = PAIRING_MODES.find((m) => m.id === mode)?.needsSecond;
  if (!step) return null;

  return (
    <WidgetFrame title="Sort, then one pass" subtitle={PAIRING_MODES.find((m) => m.id === mode)?.label}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Segmented label="Problem" options={PAIRING_MODES.map((m) => ({ id: m.id, label: m.label }))} value={mode} onChange={setMode} />
          <WidgetButton onClick={() => setSeed(Math.floor(Math.random() * 1e9))}>
            Shuffle
          </WidgetButton>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-2/40 p-3">
          <div>
            <div className="mb-1.5 text-[10px] font-semibold uppercase text-slate">
              {needsSecond ? (mode === "tywin" ? "your army (sorted)" : "passengers (sorted)") : "sorted values"}
            </div>
            <Chips values={step.values} highlight={step.highlight} />
          </div>
          {step.other && (
            <div>
              <div className="mb-1.5 text-[10px] font-semibold uppercase text-slate">
                {mode === "tywin" ? "enemy army (sorted)" : "chairs (sorted)"}
              </div>
              <Chips values={step.other} highlight={step.otherHighlight} />
            </div>
          )}
        </div>

        {step.running && (
          <div className="rounded-lg border border-border bg-surface-2/40 px-3 py-2">
            <span className="font-mono text-sm font-bold text-ink">{step.running}</span>
          </div>
        )}

        {step.done && (
          <p className="rounded-lg border border-signal-green/40 bg-signal-green-bg px-3 py-2 text-xs font-semibold text-signal-green-strong">
            Answer: {run.answer}
          </p>
        )}

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
        <p className="text-[11px] leading-relaxed text-slate">
          In every one of these the sort does the real work. What follows is a single linear pass, and the only hard part
          is the argument for why the sorted pairing is the best one.
        </p>
      </div>
    </WidgetFrame>
  );
}
