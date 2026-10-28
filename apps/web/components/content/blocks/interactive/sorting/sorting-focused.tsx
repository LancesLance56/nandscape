"use client";

import { useId, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { cn } from "@/lib/cn";
import { PRESETS, type AlgorithmMeta, type PresetId, type SortAlgorithmId } from "@/lib/sorting/types";
import { Slider } from "@/components/ui/slider";
import { FactList, type CostRow } from "./sorting-parts";

/**
 * The pieces of the sorting visualiser's single view ("Focused v2" on the
 * redesign canvas): everything the old Details view held, laid out on the one
 * card with no box inside it. The controls share the row above the bars, and
 * the facts are a guide beside them that shows one topic at a time, picked
 * rather than scrolled.
 */

/* -------------------------------------------------------------------------- */
/* Input picker                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The input shape as a dropdown. Each option carries its note, which is the
 * reason to pick it, so the menu is a list of choices with reasons rather
 * than five bare names in a row.
 */
export function InputPicker({ value, onChange }: { value: PresetId; onChange: (id: PresetId) => void }) {
  const labelId = useId();
  // The label is for screen readers only: the trigger already reads "Random"
  // or "Reversed", and the width it would take is what lets the counters
  // share this row.
  return (
    <div className="flex shrink-0 items-center">
      <span id={labelId} className="sr-only">
        Input
      </span>
      <SelectPrimitive.Root value={value} onValueChange={(v) => v && onChange(v as PresetId)}>
        <SelectPrimitive.Trigger
          aria-labelledby={labelId}
          className="inline-flex h-[30px] items-center gap-1.5 rounded-lg bg-surface-2 pl-2.5 pr-2 text-[13px] font-semibold text-ink outline-none transition-colors hover:bg-surface-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper"
        >
          <SelectPrimitive.Value>{(v: PresetId) => PRESETS.find((p) => p.id === v)?.label}</SelectPrimitive.Value>
          <SelectPrimitive.Icon render={<ChevronDown className="size-3.5 text-slate" aria-hidden />} />
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Positioner side="bottom" align="start" sideOffset={6} alignItemWithTrigger={false} className="isolate z-50">
            <SelectPrimitive.Popup className="w-[19rem] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface-card p-1.5 shadow-[0_14px_34px_-12px_rgb(0_0_0/0.28)] outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95">
              <SelectPrimitive.List>
                {PRESETS.map((p) => (
                  <SelectPrimitive.Item
                    key={p.id}
                    value={p.id}
                    className="group/opt relative flex cursor-default flex-col gap-px rounded-lg py-[7px] pl-2.5 pr-8 outline-none select-none data-highlighted:bg-surface-2 data-selected:bg-copper-bg"
                  >
                    <SelectPrimitive.ItemText className="text-[13px] font-semibold text-ink group-data-selected/opt:text-copper-dark">
                      {p.label}
                    </SelectPrimitive.ItemText>
                    <span className="text-xs leading-snug text-slate">{p.note}</span>
                    <SelectPrimitive.ItemIndicator className="absolute right-2.5 top-2.5 text-copper-dark">
                      <Check className="size-3.5" aria-hidden />
                    </SelectPrimitive.ItemIndicator>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.List>
            </SelectPrimitive.Popup>
          </SelectPrimitive.Positioner>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}

export function SizeControl({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <label className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate">
      Size
      <Slider min={5} max={30} value={value} onChange={onChange} aria-label="Number of values to sort" className="w-20" />
      <span className="w-5 font-mono text-[13px] font-semibold tabular-nums text-ink">{value}</span>
    </label>
  );
}

/** The three counters, a large number then its label. */
export function SortCounters({ items }: { items: { label: string; value: string | number; good?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 whitespace-nowrap text-xs text-slate">
      {items.map((it) => (
        <span key={it.label}>
          <b
            className={cn(
              "mr-1 text-[15px] font-bold tabular-nums",
              it.good ? "text-signal-green" : "text-ink",
            )}
          >
            {it.value}
          </b>
          {it.label}
        </span>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Guide                                                                      */
/* -------------------------------------------------------------------------- */

export interface GuideTopic {
  id: string;
  label: string;
  body: ReactNode;
}

/** Name and family, then the topics as text tabs over one panel. */
export function SortGuide({
  meta,
  topics,
  defaultTopic,
}: {
  meta: AlgorithmMeta;
  topics: GuideTopic[];
  defaultTopic?: string;
}) {
  const [picked, setPicked] = useState(defaultTopic ?? topics[0]?.id);
  const current = topics.find((t) => t.id === picked) ?? topics[0];
  const baseId = useId();

  return (
    <aside aria-label={`About ${meta.label.toLowerCase()}`} className="flex min-w-0 flex-col pt-1">
      <h3 className="m-0 flex flex-wrap items-baseline gap-x-2 text-[17px] font-bold tracking-[-0.01em] text-ink">
        {meta.label}
        <small className="text-xs font-medium text-slate">{meta.tagline}</small>
      </h3>
      <div role="tablist" aria-label="About this algorithm" className="mb-3.5 mt-3.5 flex flex-wrap border-b border-border">
        {topics.map((t) => {
          const on = t.id === current?.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`${baseId}-${t.id}`}
              aria-selected={on}
              aria-controls={`${baseId}-panel`}
              onClick={() => setPicked(t.id)}
              className={cn(
                "relative h-8 px-2 text-xs font-semibold transition-colors first:pl-0",
                on ? "text-ink" : "text-slate hover:text-ink",
                on && "after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-copper first:after:left-0",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {current && (
        <div role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-${current.id}`} className="min-h-[9rem]">
          {current.body}
        </div>
      )}
    </aside>
  );
}

/** Best / average / worst / space as four large values, plus the two flags. */
export function CostTopic({ meta }: { meta: AlgorithmMeta }) {
  // Quadratic is the cost worth noticing, so it is the one drawn in copper.
  const slow = (v: string) => /²|n\^2/.test(v);
  const cells: [string, string][] = [
    ["Best", meta.time[0]],
    ["Average", meta.time[1]],
    ["Worst", meta.time[2]],
    ["Space", meta.space],
  ];
  // A two-column cell is ~120px; "O(n log n)" at the large size is wider
  // than that, so a long value sets a smaller size for all four.
  const long = cells.some(([, v]) => v.length > 6);
  const flag = (on: boolean, label: string) => (
    <span className={cn("inline-flex items-center gap-1.5", !on && "text-slate line-through decoration-slate/60")}>
      {on && <Check className="size-3.5 text-signal-green" strokeWidth={2.5} aria-hidden />}
      {on ? label : `Not ${label.toLowerCase()}`}
    </span>
  );
  return (
    <div>
      <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-3.5">
        {cells.map(([k, v]) => (
          <div key={k} className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate">{k}</dt>
            <dd
              className={cn(
                "m-0 whitespace-nowrap font-mono font-semibold",
                long ? "text-[15px] leading-7" : "text-xl",
                slow(v) ? "text-copper-dark" : "text-ink",
              )}
            >
              {v}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-ink-soft">
        {flag(meta.stable, "Stable")}
        {flag(meta.inPlace, "In place")}
      </div>
    </div>
  );
}

/** "Good for" / "Watch out". The tab names the list, so it has no title. */
export function FactsTopic({ items, tone }: { items: string[]; tone: "good" | "bad" }) {
  return <FactList items={items} tone={tone} className="[&_li]:text-[13px]" />;
}

/**
 * What every available algorithm spends on the input on screen: the old
 * "On this exact input" table, without its box. The open algorithm is the
 * copper row.
 */
export function ThisInputTopic({ rows, current }: { rows: CostRow[]; current: SortAlgorithmId }) {
  return (
    <div className="flex flex-col gap-2">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="text-[11px] text-slate">
            <th className="pb-1 text-left font-semibold">Algorithm</th>
            <th className="pb-1 text-right font-semibold">Compares</th>
            <th className="pb-1 text-right font-semibold">Writes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const on = r.id === current;
            return (
              <tr key={r.id} className={cn(on ? "font-semibold text-copper-dark" : "text-ink-soft")}>
                <td className="py-[3px] text-left">{r.meta.label.replace(/ sort$/i, "")}</td>
                <td className="py-[3px] text-right tabular-nums">{r.comparisons}</td>
                <td className="py-[3px] text-right tabular-nums">{r.writes}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.some((r) => r.id === "counting") && (
        <p className="m-0 text-[11px] leading-snug text-slate">
          Counting sort runs on a smaller value range, since it needs one bucket per distinct value.
        </p>
      )}
    </div>
  );
}
