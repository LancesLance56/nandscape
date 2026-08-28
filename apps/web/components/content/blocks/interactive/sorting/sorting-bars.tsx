"use client";

import { cn } from "@/lib/cn";
import type { SortStep } from "@/lib/sorting/types";

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
}: {
  step: SortStep;
  maxValue: number;
  height?: number;
  showValues?: boolean;
  compact?: boolean;
}) {
  const comparing = new Set(step.comparing);
  const writing = new Set(step.writing);
  const sorted = new Set(step.sorted);
  const n = step.array.length;

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
        className="flex w-full items-end gap-[2px] rounded-lg border border-border bg-surface-2/40 p-2"
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

      {/* Pointer markers. The row is always present (fixed height) so a step
          that happens to use no pointers doesn't shrink the widget. */}
      {!compact && (
        <div className="flex min-h-[1.125rem] w-full gap-[2px] px-2">
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

      {!compact && <AuxRow aux={step.aux} />}
    </div>
  );
}

/** The scratch buffer (merge sort's temp array, counting sort's buckets).
 *  Always rendered at a fixed height - blank on steps that have no aux - so
 *  it appearing and disappearing never changes the widget's height. */
function AuxRow({ aux }: { aux?: SortStep["aux"] }) {
  const highlight = new Set(aux?.highlight ?? []);
  if (!aux) {
    return <div className="mt-1 min-h-[2.25rem]" aria-hidden />;
  }
  return (
    <div className="mt-1 flex min-h-[2.25rem] flex-wrap items-center gap-1.5 rounded-lg border border-border bg-surface-2/30 px-2 py-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate">{aux.label}</span>
      <div className="flex flex-wrap gap-1">
        {aux.values.map((v, i) => (
          <span
            key={i}
            className={cn(
              "flex h-5 min-w-5 items-center justify-center rounded px-1 font-mono text-[10px] font-bold tabular-nums",
              v === null
                ? "border border-dashed border-border-strong text-border-strong"
                : highlight.has(i)
                  ? "bg-copper text-white"
                  : "bg-surface-3 text-ink-soft",
            )}
          >
            {v === null ? "" : v}
          </span>
        ))}
      </div>
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
