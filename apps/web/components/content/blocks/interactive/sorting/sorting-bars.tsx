"use client";

import { useMemo } from "react";
import { cn } from "@/lib/cn";
import type { SortRun, SortStep } from "@/lib/sorting/types";

/**
 * The bar chart every sorting widget renders into.
 *
 * Colour carries the meaning: what is being compared, what is being written,
 * and what is finished. The counters alone would tell you an algorithm is
 * expensive, but only the colours show you *where* it is spending the work,
 * which is the difference between "bubble sort is slow" and seeing it drag
 * one large value across the whole array one swap at a time.
 */
export function SortingBars({
  step,
  maxValue,
  height = 200,
  showValues = true,
  compact = false,
  frameless = false,
  run,
}: {
  step: SortStep;
  maxValue: number;
  height?: number;
  showValues?: boolean;
  compact?: boolean;
  /** Bars standing on a baseline instead of in a well, for a stage that is
   *  already inside the widget card. The scratch buffer is then left to the
   *  caller (`AuxReadout`), which puts it on the legend's line rather than
   *  giving a few chips a row of their own. */
  frameless?: boolean;
  /**
   * The whole run. When given, the pointer and aux rows below the bars are
   * only reserved if some step in this run actually uses them - an algorithm
   * like bubble sort has neither, and would otherwise leave a tall empty gap
   * under the bars. Omit to keep both rows always reserved (the safe default
   * for callers that do not have the run to hand).
   */
  run?: SortRun;
}) {
  const comparing = new Set(step.comparing);
  const writing = new Set(step.writing);
  const sorted = new Set(step.sorted);
  const n = step.array.length;

  const { reservePointers, reserveAux, auxLabel } = useMemo(() => {
    if (!run) return { reservePointers: true, reserveAux: true, auxLabel: undefined };
    let p = false;
    let label: string | undefined;
    for (const s of run.steps) {
      if (!p && s.pointers && Object.keys(s.pointers).length > 0) p = true;
      if (label === undefined && s.aux) label = s.aux.label;
      if (p && label !== undefined) break;
    }
    return { reservePointers: p, reserveAux: label !== undefined, auxLabel: label };
  }, [run]);
  const hasPointers = Object.keys(step.pointers ?? {}).length > 0;

  const pointerAt = new Map<number, string[]>();
  for (const [name, idx] of Object.entries(step.pointers ?? {})) {
    if (idx < 0 || idx >= n) continue;
    const list = pointerAt.get(idx) ?? [];
    list.push(name);
    pointerAt.set(idx, list);
  }

  return (
    <div className="flex w-full flex-col gap-1">
      <div
        className={cn(
          "flex w-full items-end gap-[2px] overflow-hidden",
          frameless ? "border-b-2 border-border-strong pb-px" : "rounded-lg border border-border bg-surface-2/40 p-2",
        )}
        style={{ height }}
        role="img"
        aria-label={`Array of ${n} values, ${step.sorted.length} in final position`}
      >
        {step.array.map((value, i) => {
          const inRange = !step.range || (i >= step.range.start && i <= step.range.end);
          const pct = Math.max(4, (value / maxValue) * 100);

          return (
            <div key={i} className="relative flex min-w-0 flex-1 flex-col justify-end" style={{ height: "100%" }}>
              <div
                className={cn(
                  "w-full rounded-t-[3px] transition-[height,background-color] duration-150",
                  writing.has(i)
                    ? "bg-signal-coral"
                    : comparing.has(i)
                      ? "bg-copper"
                      : sorted.has(i)
                        ? "bg-signal-green"
                        : "bg-border-strong",
                  !inRange && "opacity-30",
                )}
                style={{ height: `${pct}%` }}
              />
              {showValues && n <= 24 && (
                <span className="mt-0.5 text-center text-[9px] font-semibold tabular-nums text-slate">{value}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Pointer markers. Where this run uses pointers the row is always
          present (fixed height) so a step that happens to use none doesn't
          shrink the widget; where the run never uses them it is dropped
          entirely rather than left as dead space. */}
      {!compact && reservePointers && (
        <div className={cn("relative flex min-h-[1.125rem] w-full gap-[2px]", !frameless && "px-2")}>
          {/* A step with no pointers says so, rather than leaving a gap. */}
          {!hasPointers && (
            <span className="absolute inset-0 flex items-center justify-center text-[10px] text-slate/70">
              no pointers on this step
            </span>
          )}
          {step.array.map((_, i) => (
            <div key={i} className="flex min-w-0 flex-1 justify-center">
              {pointerAt.has(i) && (
                <span className="truncate rounded bg-copper-bg px-1 text-[9px] font-bold text-copper-dark">
                  {pointerAt.get(i)!.join("/")}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {!compact && !frameless && reserveAux && <AuxRow aux={step.aux} label={auxLabel} />}
    </div>
  );
}

/** The scratch buffer's label and values, or an empty slot holding its place. */
function AuxChips({ aux, label }: { aux?: SortStep["aux"]; label?: string }) {
  const highlight = new Set(aux?.highlight ?? []);
  return (
    <>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate">{aux?.label ?? label}</span>
      <div className="flex flex-wrap gap-1">
        {aux ? (
          aux.values.map((v, i) => (
            <span
              key={i}
              className={cn(
                "flex h-5 min-w-5 items-center justify-center rounded px-1 font-label text-[10px] font-bold tabular-nums",
                v === null
                  ? "border border-dashed border-border-strong text-border-strong"
                  : highlight.has(i)
                    ? "bg-copper text-white"
                    : "bg-surface-3 text-ink-soft",
              )}
            >
              {v === null ? "" : v}
            </span>
          ))
        ) : (
          <span className="flex h-5 items-center rounded border border-dashed border-border-strong px-1.5 text-[10px] text-slate">
            empty
          </span>
        )}
      </div>
    </>
  );
}

/** The scratch buffer (merge sort's temp array, counting sort's buckets,
 *  insertion sort's held value) as a row under the bars. Always rendered at a
 *  fixed height, so it appearing and disappearing never changes the widget's
 *  height. */
function AuxRow({ aux, label }: { aux?: SortStep["aux"]; label?: string }) {
  return (
    <div className="mt-1 flex min-h-[2.25rem] flex-wrap items-center gap-1.5 rounded-lg border border-border bg-surface-2/30 px-2 py-1.5">
      <AuxChips aux={aux} label={label} />
    </div>
  );
}

/** The label of the scratch buffer a run uses, if it uses one at all. */
export function runAuxLabel(run: SortRun): string | undefined {
  return run.steps.find((s) => s.aux)?.aux?.label;
}

/** The scratch buffer inline, for a line it shares with something else. */
export function AuxReadout({ aux, label }: { aux?: SortStep["aux"]; label: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <AuxChips aux={aux} label={label} />
    </div>
  );
}

/** Colour key, so the bars are not guesswork. */
export function SortingLegend() {
  const item = (cls: string, label: string) => (
    <span key={label} className="flex items-center gap-1.5 text-[11px] text-slate">
      <span className={cn("inline-block h-2.5 w-4 rounded-[2px]", cls)} />
      {label}
    </span>
  );
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {item("bg-border-strong", "unsorted")}
      {item("bg-copper", "comparing")}
      {item("bg-signal-coral", "writing")}
      {item("bg-signal-green", "in final position")}
    </div>
  );
}
