"use client";

import { useState } from "react";
import { ChartCard, DataTable, type ChartSeries } from "./chart-card";
import { formatDayKey, niceScale } from "./format";
import { cn } from "@/lib/cn";

/**
 * Counts per day, as columns.
 *
 * Columns rather than a line because these are counts of discrete events in
 * discrete buckets - a line between Tuesday and Thursday implies a value on
 * Wednesday, and there isn't one, there's a count.
 *
 * Stacks when it is given more than one series, which is right here: lessons,
 * quizzes and puzzles are parts of one thing ("what did people do today"), and
 * the stack's total height answers that at a glance while the segments answer
 * "of what kind". Two series on separate y-scales would have been the other
 * temptation and is never the answer - the alignment of two scales is arbitrary
 * and invents a correlation the data does not contain.
 *
 * Built from divs rather than SVG. The marks are axis-aligned rectangles, which
 * CSS does natively and responsively; SVG would buy a viewBox to keep in sync
 * with the container and nothing else.
 */

export interface ColumnPoint {
  /** `YYYY-MM-DD`. */
  day: string;
  /** Series key -> count. Keys must match the `series` passed alongside. */
  values: Record<string, number>;
}

export interface ColumnTrendProps {
  title: string;
  subtitle?: string;
  points: ColumnPoint[];
  series: ChartSeries[];
  /** Singular noun for the tooltip and the table's total column. */
  unit: string;
}

const PLOT_HEIGHT = 148;
/** Bars are capped rather than filling their slot; the leftover is air. */
const MAX_BAR_WIDTH = 24;

export function ColumnTrend({ title, subtitle, points, series, unit }: ColumnTrendProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const totals = points.map((point) =>
    series.reduce((sum, entry) => sum + (point.values[entry.key] ?? 0), 0),
  );
  const peak = Math.max(0, ...totals);
  const scale = niceScale(peak);
  const empty = peak === 0;

  const table = (
    <DataTable
      headers={["Day", ...series.map((entry) => entry.label), `Total ${unit}s`]}
      rows={points.map((point, index) => [
        formatDayKey(point.day),
        ...series.map((entry) => point.values[entry.key] ?? 0),
        totals[index],
      ])}
    />
  );

  return (
    <ChartCard title={title} subtitle={subtitle} series={series} table={table}>
      <div className="flex gap-2">
        {/* Y axis. Ticks carry the values the marks are not directly labelled
            with, which is why they are rounded to readable numbers. */}
        <div className="relative shrink-0" style={{ height: PLOT_HEIGHT, width: 24 }}>
          {scale.ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 translate-y-1/2 text-xxs tabular-nums text-slate"
              style={{ bottom: `${(tick / scale.max) * 100}%` }}
            >
              {tick}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height: PLOT_HEIGHT }}>
            {/* Hairline grid, solid and one step off the surface. Dashes would
                read as a threshold rather than a rule. */}
            {scale.ticks.map((tick) => (
              <div
                key={tick}
                aria-hidden
                className="absolute inset-x-0 h-px bg-(--chart-grid)"
                style={{ bottom: `${(tick / scale.max) * 100}%` }}
              />
            ))}

            {empty ? (
              <p className="absolute inset-0 flex items-center justify-center text-xs text-slate">
                No activity in this window yet.
              </p>
            ) : (
              <div className="absolute inset-0 flex items-end">
                {points.map((point, index) => {
                  const segments = series
                    .map((entry) => ({ entry, value: point.values[entry.key] ?? 0 }))
                    .filter((segment) => segment.value > 0);

                  return (
                    <div
                      key={point.day}
                      tabIndex={0}
                      // The hit area is the whole column, floor to ceiling, not
                      // the few pixels of bar - a one-event day is a 6px mark
                      // and would otherwise be unhittable.
                      onMouseEnter={() => setHovered(index)}
                      onMouseLeave={() => setHovered((current) => (current === index ? null : current))}
                      onFocus={() => setHovered(index)}
                      onBlur={() => setHovered((current) => (current === index ? null : current))}
                      aria-label={`${formatDayKey(point.day)}: ${totals[index]} ${unit}${
                        totals[index] === 1 ? "" : "s"
                      }`}
                      className={cn(
                        "relative flex h-full min-w-0 flex-1 flex-col-reverse justify-start rounded-sm outline-none",
                        "focus-visible:ring-2 focus-visible:ring-copper",
                        hovered === index && "bg-surface-2",
                      )}
                    >
                      <div
                        className="mx-auto flex w-full flex-col-reverse gap-[2px]"
                        style={{ maxWidth: MAX_BAR_WIDTH }}
                      >
                        {segments.map((segment, segmentIndex) => (
                          <div
                            key={segment.entry.key}
                            // Square at the baseline, 4px rounded at the data
                            // end - so the top of the stack reads as the tip of
                            // one mark rather than a stack of pills.
                            className={cn(
                              "w-full",
                              segmentIndex === segments.length - 1 && "rounded-t-[4px]",
                            )}
                            style={{
                              height: (segment.value / scale.max) * PLOT_HEIGHT,
                              backgroundColor: segment.entry.color,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {hovered !== null && !empty && (
              <div
                role="status"
                className={cn(
                  "pointer-events-none absolute top-1 z-10 w-max max-w-52 rounded-lg border border-border-strong bg-surface-card p-2.5 shadow-lg",
                  // Inside the plot rather than above it. `bottom-full` would
                  // float it over the card's own heading and out through the
                  // top edge; the plot is mostly empty air above the marks, so
                  // the top of it is free space that belongs to this chart.
                  // Left or right by which half is hovered, so the tooltip on
                  // the last day is not clipped by the card either.
                  hovered > points.length / 2 ? "right-0" : "left-0",
                )}
              >
                <p className="mb-1.5 text-xxs font-medium text-ink">
                  {formatDayKey(points[hovered].day)}
                </p>
                <ul className="flex flex-col gap-1">
                  {series.map((entry) => (
                    <li key={entry.key} className="flex items-center gap-2 text-xxs">
                      <span
                        aria-hidden
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="flex-1 text-ink-soft">{entry.label}</span>
                      <span className="tabular-nums text-ink">
                        {points[hovered].values[entry.key] ?? 0}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* X axis. Thirty labels do not fit in thirty ~20px slots, and a
              flex row of truncating spans would crop every one of them - so
              only a few are drawn, positioned over the column they belong to
              rather than laid out beside their neighbours. The ends are pinned
              inside the plot so they cannot hang off the card. */}
          <div className="relative mt-2 h-4 text-xxs whitespace-nowrap text-slate">
            {points.map((point, index) => {
              const last = index === points.length - 1;
              if (!(index === 0 || last || index % 7 === 0)) return null;
              // Skip a regular stop that would sit under the pinned last label.
              if (!last && index > points.length - 4) return null;

              return (
                <span
                  key={point.day}
                  className={cn(
                    "absolute top-0",
                    index === 0 && "left-0",
                    last && "right-0",
                    index !== 0 && !last && "-translate-x-1/2",
                  )}
                  style={index !== 0 && !last ? { left: `${((index + 0.5) / points.length) * 100}%` } : undefined}
                >
                  {formatDayKey(point.day)}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </ChartCard>
  );
}
