"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Small labelled box used by the algorithm side panels. */
export function PanelBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/50 p-3">
      <div className="mb-2 text-[11px] font-semibold text-slate">{title}</div>
      {children}
    </div>
  );
}

/** Horizontal row of chips, used for queues, stacks, call paths and candidate sets. */
export function ChipRow({
  items,
  emptyLabel,
  tone = "copper",
}: {
  items: string[];
  emptyLabel: string;
  tone?: "copper" | "muted";
}) {
  if (items.length === 0) {
    return <span className="text-xs italic text-slate">{emptyLabel}</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span
          key={`${item}-${i}`}
          className={cn(
            "rounded-md px-2 py-1 text-xs font-bold",
            tone === "copper" ? "bg-copper-bg text-copper-dark" : "bg-surface-3 text-ink-soft",
          )}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

/** A labelled number, for the "nodes visited / branches pruned" readouts. */
export function StatReadout({
  stats,
}: {
  stats: { label: string; value: string | number; tone?: "default" | "good" | "warn" }[];
}) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col">
          <span
            className={cn(
              "font-display text-lg font-bold leading-none tabular-nums",
              s.tone === "good" && "text-signal-green",
              s.tone === "warn" && "text-copper-dark",
              (!s.tone || s.tone === "default") && "text-ink",
            )}
          >
            {s.value}
          </span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
