"use client";

import { useCallback, useMemo, useState } from "react";
import { runSort, sortCost } from "@/lib/sorting/algorithms";
import {
  ALGORITHMS,
  COUNTING_MAX_VALUE,
  PRESETS,
  algorithmMeta,
  buildArray,
  type PresetId,
  type SortAlgorithmId,
} from "@/lib/sorting/types";
import { WidgetFrame } from "../widget-frame";
import { StepCaption, StepControls, useStepPlayer } from "../shared/step-player";
import { cn } from "@/lib/cn";
import { SortingBars, SortingLegend } from "./sorting-bars";

const SPEEDS = [
  { id: "slow", label: "Slow", ms: 700 },
  { id: "normal", label: "Normal", ms: 260 },
  { id: "fast", label: "Fast", ms: 90 },
];

function readAlgorithms(data: Record<string, unknown>): SortAlgorithmId[] {
  const raw = data.algorithms;
  if (!Array.isArray(raw)) return ALGORITHMS.map((a) => a.id);
  const ids = raw.filter((v): v is SortAlgorithmId => ALGORITHMS.some((a) => a.id === v));
  return ids.length > 0 ? ids : ALGORITHMS.map((a) => a.id);
}

/**
 * The main sorting visualizer: pick an algorithm and an input shape, then
 * watch it run.
 *
 * The input presets matter as much as the algorithms. Comparing bubble sort
 * and insertion sort on random data makes them look nearly identical; run
 * them both on "nearly sorted" and the difference is immediate. That is the
 * comparison the counters and the preset switcher exist to make.
 */
export function SortingVisualizerWidget({
  data,
  frame = true,
}: {
  data: Record<string, unknown>;
  frame?: boolean;
}) {
  const available = useMemo(() => readAlgorithms(data), [data]);
  const compact = data.compact === true;
  const showComparison = data.showComparison !== false && !compact;

  const [algorithm, setAlgorithm] = useState<SortAlgorithmId>(
    available.includes(data.algorithm as SortAlgorithmId) ? (data.algorithm as SortAlgorithmId) : available[0],
  );
  const [preset, setPreset] = useState<PresetId>(
    PRESETS.some((p) => p.id === data.preset) ? (data.preset as PresetId) : "random",
  );
  const [size, setSize] = useState(typeof data.size === "number" ? Math.min(40, Math.max(5, data.size)) : compact ? 18 : 14);
  const [speed, setSpeed] = useState(compact ? "fast" : "normal");
  const [seed, setSeed] = useState(typeof data.seed === "number" ? data.seed : 20260816);

  const meta = algorithmMeta(algorithm);
  // Counting sort needs one bucket per value, so it gets a small range.
  const maxValue = algorithm === "counting" ? COUNTING_MAX_VALUE : 99;
  const input = useMemo(() => buildArray(preset, size, seed, maxValue), [preset, size, seed, maxValue]);
  const run = useMemo(() => runSort(algorithm, input), [algorithm, input]);

  const intervalMs = SPEEDS.find((s) => s.id === speed)?.ms ?? 260;
  const player = useStepPlayer(run.steps.length, intervalMs);
  const step = run.steps[Math.min(player.index, run.steps.length - 1)];

  const shuffle = useCallback(() => setSeed(Math.floor(Math.random() * 1e9)), []);

  // The same input run through every algorithm, for the cost table.
  const comparison = useMemo(() => {
    if (!showComparison) return [];
    return available.map((id) => {
      const arr = buildArray(preset, size, seed, id === "counting" ? COUNTING_MAX_VALUE : 99);
      return { id, meta: algorithmMeta(id), ...sortCost(id, arr) };
    });
  }, [available, preset, size, seed, showComparison]);

  if (!step) return <p className="text-sm text-signal-coral">Sorting widget: nothing to run.</p>;

  const content = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate">Algorithm</span>
          {available.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setAlgorithm(id)}
              aria-pressed={id === algorithm}
              className={cn(
                "rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                id === algorithm
                  ? "border-copper bg-copper-bg text-copper-dark"
                  : "border-border-strong text-ink-soft hover:bg-surface-2 hover:text-ink",
              )}
            >
              {algorithmMeta(id).label.replace(" sort", "")}
            </button>
          ))}
        </div>
      </div>

      {!compact && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate">Input</span>
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id)}
                aria-pressed={p.id === preset}
                title={p.note}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  p.id === preset
                    ? "border-copper bg-copper-bg text-copper-dark"
                    : "border-border-strong text-ink-soft hover:bg-surface-2 hover:text-ink",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-[11px] font-semibold text-slate">
            Size
            <input
              type="range"
              min={5}
              max={30}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-24 accent-copper"
            />
            <span className="w-5 tabular-nums text-ink">{size}</span>
          </label>

          <button
            type="button"
            onClick={shuffle}
            className="rounded-lg border border-border-strong px-3 py-1.5 text-[11px] font-semibold text-ink-soft hover:bg-surface-2 hover:text-ink"
          >
            Shuffle
          </button>
        </div>
      )}

      <SortingBars step={step} maxValue={maxValue} height={compact ? 150 : 210} compact={compact} />

      {!compact && <SortingLegend />}

      <div className="grid grid-cols-3 gap-2">
        <Stat label="comparisons" value={step.comparisons} />
        <Stat label="writes" value={step.writes} />
        <Stat label="in place" value={`${step.sorted.length} / ${step.array.length}`} tone="good" />
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
        extra={
          <div className="flex items-center gap-1">
            {SPEEDS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSpeed(s.id)}
                aria-pressed={s.id === speed}
                className={cn(
                  "rounded px-2 py-1 text-[10px] font-semibold transition-colors",
                  s.id === speed ? "bg-copper text-white" : "text-slate hover:text-ink",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        }
      />

      {run.truncated && (
        <p className="text-[11px] text-copper-dark">
          This run hit the frame limit. {meta.label} needs more steps than are watchable at this size, which is itself the
          argument for the O(n log n) sorts.
        </p>
      )}

      {!compact && (
        <div className="rounded-lg border border-border bg-surface-2/40 p-3">
          <div className="mb-1.5 text-[11px] font-semibold text-slate">{meta.label}</div>
          <p className="text-xs leading-relaxed text-ink-soft">{meta.note}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate">
            <span>
              best <span className="font-mono font-bold text-ink">{meta.time[0]}</span>
            </span>
            <span>
              average <span className="font-mono font-bold text-ink">{meta.time[1]}</span>
            </span>
            <span>
              worst <span className="font-mono font-bold text-ink">{meta.time[2]}</span>
            </span>
            <span>
              space <span className="font-mono font-bold text-ink">{meta.space}</span>
            </span>
            <span>{meta.stable ? "stable" : "not stable"}</span>
            <span>{meta.inPlace ? "in place" : "needs extra memory"}</span>
          </div>
        </div>
      )}

      {showComparison && comparison.length > 1 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-surface-2 text-slate">
                <th className="px-3 py-2 text-left font-semibold">On this exact input</th>
                <th className="px-3 py-2 text-right font-semibold">Comparisons</th>
                <th className="px-3 py-2 text-right font-semibold">Writes</th>
                <th className="px-3 py-2 text-right font-semibold">Worst case</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-t border-border transition-colors",
                    row.id === algorithm && "bg-copper-bg/40 font-semibold",
                  )}
                >
                  <td className="px-3 py-1.5 text-ink">{row.meta.label}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-ink-soft">{row.comparisons}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-ink-soft">{row.writes}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-slate">{row.meta.time[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-border bg-surface-2/40 px-3 py-2 text-[11px] text-slate">
            Counting sort runs on a smaller value range than the others, since it needs one bucket per distinct value.
          </p>
        </div>
      )}
    </div>
  );

  if (!frame) return content;

  return (
    <WidgetFrame title="Sorting visualizer" subtitle={`${meta.label} · ${PRESETS.find((p) => p.id === preset)?.label}`}>
      {content}
    </WidgetFrame>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "good" }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/40 px-2.5 py-2 text-center">
      <div
        className={cn(
          "font-display text-lg font-bold leading-none tabular-nums",
          tone === "good" ? "text-signal-green" : "text-ink",
        )}
      >
        {value}
      </div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate">{label}</div>
    </div>
  );
}
