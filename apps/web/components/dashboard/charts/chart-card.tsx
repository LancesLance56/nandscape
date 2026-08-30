"use client";

import { useId, useState, type ReactNode } from "react";
import { Table2, LineChart } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * The frame every chart sits in: title, optional legend, and the table view.
 *
 * The table is not a nicety. A chart encodes values in geometry and colour, and
 * both channels fail for somebody - so every chart here ships a table-view twin
 * carrying the same numbers as text, one button away. That is also what lets
 * the charts label selectively instead of printing a number on every mark: the
 * values a reader cannot get from the axis are always still reachable.
 */

export interface ChartSeries {
  key: string;
  label: string;
  /** A CSS colour, normally one of the `--series-*` tokens. */
  color: string;
}

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  /** Two or more series get a legend, always. One series does not: the title
   *  already names what is plotted, and a one-swatch box just restates it. */
  series?: ChartSeries[];
  /** The same data as text. Rendered inside a scroll container. */
  table: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ChartCard({
  title,
  subtitle,
  series,
  table,
  children,
  className,
}: ChartCardProps) {
  const [showTable, setShowTable] = useState(false);
  const bodyId = useId();
  const showLegend = (series?.length ?? 0) >= 2;

  return (
    <section className={cn("rounded-2xl border border-border bg-surface-card p-4 md:p-5", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-3">
          {showLegend && (
            <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {series!.map((entry) => (
                <li key={entry.key} className="flex items-center gap-1.5 text-xs text-ink-soft">
                  {/* Identity lives in the swatch, never in the text colour: a
                      series hue used as type is unreadable at 12px. */}
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  {entry.label}
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={() => setShowTable((value) => !value)}
            aria-expanded={showTable}
            aria-controls={bodyId}
            className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-xxs font-medium text-slate transition-colors hover:border-border-strong hover:text-ink"
          >
            {showTable ? <LineChart className="size-3" /> : <Table2 className="size-3" />}
            {showTable ? "Chart" : "Table"}
          </button>
        </div>
      </div>

      <div id={bodyId}>
        {showTable ? <div className="custom-scrollbar-x -mx-1 px-1">{table}</div> : children}
      </div>
    </section>
  );
}

/** The table view's shared styling, so every chart's twin looks like the same
 *  table rather than each inventing its own. */
export function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <table className="w-full min-w-max text-left text-xs">
      <thead>
        <tr className="border-b border-border">
          {headers.map((header, index) => (
            <th
              key={header}
              scope="col"
              className={cn(
                "py-2 pr-4 font-medium text-slate",
                index > 0 && "text-right tabular-nums",
              )}
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={headers.length} className="py-4 text-slate">
              Nothing recorded yet.
            </td>
          </tr>
        ) : (
          rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-border/60 last:border-0">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={cn(
                    "py-1.5 pr-4 text-ink",
                    cellIndex > 0 && "text-right tabular-nums text-ink-soft",
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
