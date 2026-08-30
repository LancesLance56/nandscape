"use client";

import Link from "next/link";
import { ChartCard, DataTable } from "./chart-card";
import { cn } from "@/lib/cn";

/**
 * A ranked list, longest first.
 *
 * One hue for every bar, not a light-to-dark ramp. The categories here - posts,
 * lessons, puzzles - have no natural order, and shading them by size would
 * encode the value twice (once as length, once as darkness) while spending the
 * only free channel on information the bar already carries.
 *
 * No track behind the bars either: a full-width track reads as "share of a
 * limit", which is a meter's job. These are magnitudes next to each other.
 */

export interface RankedBar {
  key: string;
  label: string;
  value: number;
  /** Shown after the value, e.g. "3 readers". Context the bar cannot carry. */
  detail?: string;
  href?: string;
}

export interface RankedBarsProps {
  title: string;
  subtitle?: string;
  bars: RankedBar[];
  /** Column heading for the value in the table view. */
  valueLabel: string;
  emptyText: string;
}

export function RankedBars({ title, subtitle, bars, valueLabel, emptyText }: RankedBarsProps) {
  const peak = Math.max(0, ...bars.map((bar) => bar.value));

  const table = (
    <DataTable
      headers={["Item", valueLabel]}
      rows={bars.map((bar) => [bar.detail ? `${bar.label} (${bar.detail})` : bar.label, bar.value])}
    />
  );

  return (
    <ChartCard title={title} subtitle={subtitle} table={table}>
      {bars.length === 0 ? (
        <p className="py-4 text-xs text-slate">{emptyText}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {bars.map((bar) => {
            const label = (
              <span className="min-w-0 flex-1 truncate text-xs text-ink">{bar.label}</span>
            );

            return (
              <li key={bar.key}>
                <div className="flex items-baseline gap-3">
                  {bar.href ? (
                    <Link
                      href={bar.href}
                      className="min-w-0 flex-1 truncate text-xs text-ink transition-colors hover:text-copper-dark"
                    >
                      {bar.label}
                    </Link>
                  ) : (
                    label
                  )}
                  {bar.detail && <span className="shrink-0 text-xxs text-slate">{bar.detail}</span>}
                  {/* Direct-labelled at the tip: with fewer than ten bars every
                      value fits, so the axis is not needed at all. */}
                  <span className="shrink-0 text-xs font-medium tabular-nums text-ink">
                    {bar.value.toLocaleString("en-US")}
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full">
                  <div
                    className={cn("h-full rounded-r-[4px] bg-(--series-lessons)", bar.value === 0 && "hidden")}
                    style={{ width: `${peak === 0 ? 0 : Math.max((bar.value / peak) * 100, 2)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </ChartCard>
  );
}
