"use client";

import { useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { algorithmMeta, type AlgorithmMeta, type SortAlgorithmId, type SortStep } from "@/lib/sorting/types";

/**
 * The pieces the four sorting layouts are assembled from.
 *
 * There is one visualiser with four arrangements of the same run - a console
 * with a picker rail, a stage over a narration log, a compact split with the
 * pseudocode beside it, and a two-up race - and the only thing that differs
 * between them is which of these panels appear and where. Keeping the panels
 * here rather than inside each layout is what stops the four from drifting
 * into four separate widgets that happen to sort.
 *
 * Anything generic enough for a non-sorting widget belongs in
 * `../shared/widget-ui.tsx` instead; everything here needs an `AlgorithmMeta`
 * or a `SortStep`.
 */

/* -------------------------------------------------------------------------- */
/* Labels and small chrome                                                    */
/* -------------------------------------------------------------------------- */

/** The mono all-caps section label the panels are titled with. */
export function PanelLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-slate", className)}>
      {children}
    </div>
  );
}

/** A bordered readout chip, e.g. `comparisons 41`. */
export function CounterPills({
  items,
  className,
}: {
  items: { label: string; value: string | number }[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {items.map((it) => (
        <span
          key={it.label}
          className="inline-flex items-center gap-1.5 rounded-full border border-border-strong px-2.5 py-1 text-[11px] text-slate"
        >
          {it.label}
          <span className="font-semibold tabular-nums text-ink">{it.value}</span>
        </span>
      ))}
    </div>
  );
}

/**
 * How far through the run we are, as a bar.
 *
 * The width transition is deliberately shorter than the play interval, so it
 * has always settled before the next frame lands; a longer one would lag
 * behind the bars it is describing.
 */
export function ProgressRail({ index, total, className }: { index: number; total: number; className?: string }) {
  const pct = total <= 1 ? 100 : (index / (total - 1)) * 100;
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)}>
      <div
        className="h-full rounded-full bg-copper transition-[width] duration-150 ease-out motion-reduce:transition-none"
        style={{ width: `${pct}%` }}
        role="progressbar"
        aria-valuenow={index + 1}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label="Progress through the run"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Algorithm pickers                                                          */
/* -------------------------------------------------------------------------- */

/**
 * The vertical picker down the left of the console layout.
 *
 * A rail rather than a segmented row because seven algorithms wrap to three
 * lines horizontally, and because a list is the shape that lets the reader
 * scan the names against each other, which is half of what the widget is for.
 */
export function AlgorithmRail({
  ids,
  value,
  onChange,
  className,
}: {
  ids: readonly SortAlgorithmId[];
  value: SortAlgorithmId;
  onChange: (id: SortAlgorithmId) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5 @3xl:flex-col", className)}>
      <PanelLabel className="mb-0.5 w-full">Algorithms</PanelLabel>
      {ids.map((id) => {
        const active = id === value;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={active}
            className={cn(
              "rounded-md border px-2.5 py-2 text-left text-[12.5px] font-semibold transition-colors duration-150",
              active
                ? "border-copper bg-copper text-copper-ink"
                : "border-border-strong text-ink-soft hover:bg-surface-2 hover:text-ink",
            )}
          >
            {algorithmMeta(id).label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The picker for the layouts with no room for a rail or a full segmented row.
 *
 * A native `<select>`, styled: it gets keyboard handling, the platform's own
 * popup on touch, and screen-reader semantics for free, none of which a
 * hand-rolled menu would be worth rebuilding for a list of seven names.
 */
export function AlgorithmSelect({
  ids,
  value,
  onChange,
  label,
  className,
}: {
  ids: readonly SortAlgorithmId[];
  value: SortAlgorithmId;
  onChange: (id: SortAlgorithmId) => void;
  label?: string;
  className?: string;
}) {
  return (
    <label className={cn("inline-flex items-center gap-2", className)}>
      {label && <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-slate">{label}</span>}
      <span className="relative inline-flex items-center">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as SortAlgorithmId)}
          aria-label={label ? `${label} algorithm` : "Algorithm"}
          className="appearance-none rounded-md border border-border-strong bg-surface-card py-1.5 pl-2.5 pr-7 text-xs font-semibold text-ink transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper"
        >
          {ids.map((id) => (
            <option key={id} value={id}>
              {algorithmMeta(id).label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 size-3 text-slate" aria-hidden />
      </span>
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* Fact panels                                                                */
/* -------------------------------------------------------------------------- */

/** Complexity as a label / value list, for a narrow column. */
export function ComplexityRows({ meta }: { meta: AlgorithmMeta }) {
  const rows: [string, string][] = [
    ["best", meta.time[0]],
    ["average", meta.time[1]],
    ["worst", meta.time[2]],
    ["space", meta.space],
  ];
  return (
    <div className="flex flex-col">
      {rows.map(([k, v], i) => (
        <div
          key={k}
          className={cn(
            "flex items-baseline justify-between py-1.5",
            i < rows.length - 1 && "border-b border-border",
          )}
        >
          <span className="text-[12px] text-slate">{k}</span>
          <span className="font-mono text-[11px] font-semibold text-ink">{v}</span>
        </div>
      ))}
    </div>
  );
}

/** The same facts as boxed chips, for a wide row. */
export function ComplexityChips({ meta }: { meta: AlgorithmMeta }) {
  const chips: [string, string][] = [
    ["avg", meta.time[1]],
    ["worst", meta.time[2]],
    ["space", meta.space],
    ["stable", meta.stable ? "yes" : "no"],
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map(([k, v]) => (
        <div key={k} className="rounded-md border border-border px-2.5 py-1.5">
          <PanelLabel>{k}</PanelLabel>
          <div className="mt-0.5 font-mono text-[12px] font-semibold text-ink">{v}</div>
        </div>
      ))}
    </div>
  );
}

/** "Good for" / "Watch out", as a titled list of clauses. */
export function FactList({
  title,
  items,
  tone,
  className,
}: {
  title: string;
  items: string[];
  tone: "good" | "bad";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <PanelLabel>{title}</PanelLabel>
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-[12px] leading-[1.45] text-ink-soft">
            <span
              aria-hidden
              className={cn(
                "mt-[0.4rem] size-1.5 shrink-0 rounded-full",
                tone === "good" ? "bg-signal-green" : "bg-signal-coral",
              )}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Name, family, and the one-line summary. Shared by every facts panel. */
export function AlgorithmHeading({ meta, className }: { meta: AlgorithmMeta; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2.5 gap-y-1", className)}>
      <span className="font-display text-[15px] font-bold text-ink">{meta.label}</span>
      <span className="text-[12px] text-slate">{meta.tagline}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Narration                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The current frame's caption.
 *
 * `key={index}` remounts the paragraph on every step, which is what replays
 * the fade; the height is fixed so a two-line caption following a one-line one
 * does not nudge everything below it.
 */
export function Narration({
  index,
  total,
  text,
  className,
}: {
  index: number;
  total: number;
  text: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-surface-2/50 px-3.5 py-3", className)}>
      <PanelLabel className="mb-1.5">
        Step {index + 1} / {total} · narration
      </PanelLabel>
      <p
        key={index}
        className="h-[2.6rem] overflow-y-auto text-[13.5px] leading-[1.45] text-ink duration-150 animate-in fade-in motion-reduce:animate-none"
      >
        {text}
      </p>
    </div>
  );
}

/** How many frames either side of the current one the log shows. */
const LOG_RADIUS = 4;

/**
 * The scrolling narration history.
 *
 * Only a window around the current frame is rendered rather than all of a run
 * that can reach 900 frames: at playback speed the whole list would re-render
 * every 90ms, and the reader can only read the few lines around the cursor
 * anyway. Clicking a line seeks to it.
 */
export function NarrationLog({
  steps,
  index,
  onJump,
  className,
}: {
  steps: SortStep[];
  index: number;
  onJump: (i: number) => void;
  className?: string;
}) {
  const activeRef = useRef<HTMLButtonElement>(null);

  // Keep the current line centred while playing, without yanking the page
  // around it - `nearest` scrolls the log box only.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [index]);

  const from = Math.max(0, index - LOG_RADIUS);
  const to = Math.min(steps.length - 1, index + LOG_RADIUS);
  const window = [];
  for (let i = from; i <= to; i++) window.push(i);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <PanelLabel>Narration log</PanelLabel>
      <div className="flex h-[9.5rem] flex-col gap-1.5 overflow-y-auto">
        {window.map((i) => {
          const active = i === index;
          return (
            <button
              key={i}
              ref={active ? activeRef : undefined}
              type="button"
              onClick={() => onJump(i)}
              aria-current={active ? "step" : undefined}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-left text-[12px] leading-[1.4] transition-colors duration-150",
                active
                  ? "border border-copper bg-surface-card font-medium text-ink"
                  : i < index
                    ? "text-slate hover:bg-surface-2 hover:text-ink-soft"
                    : "text-slate/60 hover:bg-surface-2 hover:text-slate",
              )}
            >
              <span className="mr-1.5 font-mono tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              {steps[i].caption}
            </button>
          );
        })}
      </div>
      <p className="rounded-md border border-dashed border-border-strong px-2.5 py-1.5 text-[11px] text-slate">
        Follows along as it plays. Click a line to jump there.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Pseudocode                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The algorithm as source, with the statement the current frame is executing
 * lit up.
 *
 * The line comes from `SortStep.line`, recorded next to the caption in
 * `lib/sorting/algorithms.ts`, so the highlight follows the trace rather than
 * being re-derived from the caption text here.
 */
export function Pseudocode({ meta, line, className }: { meta: AlgorithmMeta; line?: number; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border bg-surface-card p-2.5", className)}>
      <div className="h-[10rem] overflow-auto whitespace-pre font-mono text-[10.5px] leading-[1.7] text-slate">
        {meta.pseudocode.map((text, i) => (
          <div
            key={i}
            className={cn(
              "-mx-1 rounded px-1 transition-colors duration-150 motion-reduce:transition-none",
              i === line && "bg-copper-bg font-semibold text-copper-dark",
            )}
          >
            {text}
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Cost comparison                                                            */
/* -------------------------------------------------------------------------- */

export interface CostRow {
  id: SortAlgorithmId;
  meta: AlgorithmMeta;
  comparisons: number;
  writes: number;
}

/**
 * What every algorithm spends on this exact input.
 *
 * The whole argument for the O(n log n) sorts is a pair of numbers on the same
 * array, so this table is shared rather than reimplemented by the layouts that
 * want it: the console shows it under the fold, the race shows it under the
 * two stages.
 */
export function TradeoffTable({
  rows,
  highlight,
  footnote,
}: {
  rows: CostRow[];
  /** Algorithms currently on screen, drawn with a tinted row. */
  highlight: readonly SortAlgorithmId[];
  footnote?: string;
}) {
  return (
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
          {rows.map((row) => (
            <tr
              key={row.id}
              className={cn(
                "border-t border-border transition-colors duration-150",
                highlight.includes(row.id) && "bg-copper-bg/40 font-semibold",
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
      {footnote && (
        <p className="border-t border-border bg-surface-2/40 px-3 py-2 text-[11px] text-slate">{footnote}</p>
      )}
    </div>
  );
}
