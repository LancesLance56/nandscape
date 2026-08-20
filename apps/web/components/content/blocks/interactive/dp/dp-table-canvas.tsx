"use client";

import { useEffect, useRef } from "react";
import type { CellRef, CellState, TableStep } from "@/lib/dp/types";

/**
 * The table a bottom-up solution fills in.
 *
 * The arrows are the reason this is a drawing rather than a list of numbers.
 * A recurrence is a statement about which earlier answers this answer is built
 * from, and until you can see those arrows land, "dp of i equals dp of i minus
 * one plus dp of i minus two" is a string of symbols. One row or twenty, the
 * same renderer handles it: a one-dimensional problem is a table that happens
 * to have a single row, and drawing them the same way is part of the argument
 * that they are the same technique.
 */

const CELL_H = 38;
const HEADER_H = 22;

function cellWidth(cols: number, widestLabel: number): number {
  const byCount = cols > 12 ? 34 : cols > 8 ? 40 : 48;
  return Math.max(byCount, widestLabel * 7 + 10);
}

function cellStyle(state: CellState) {
  switch (state) {
    case "active":
      return { fill: "var(--copper)", stroke: "var(--copper-dark)", text: "var(--copper-ink)", weight: 2.2 };
    case "dep":
      return { fill: "var(--copper-bg)", stroke: "var(--copper)", text: "var(--copper-dark)", weight: 1.8 };
    case "base":
      return { fill: "var(--signal-green-bg)", stroke: "var(--signal-green)", text: "var(--signal-green-strong)", weight: 1.2 };
    case "path":
      return { fill: "var(--signal-green)", stroke: "var(--signal-green-strong)", text: "#ffffff", weight: 1.8 };
    case "filled":
      return { fill: "var(--surface-card)", stroke: "var(--border-strong)", text: "var(--ink)", weight: 1.1 };
    case "empty":
    default:
      return { fill: "transparent", stroke: "var(--border)", text: "var(--slate)", weight: 1 };
  }
}

interface DpTableCanvasProps {
  step: TableStep;
  rowLabels: string[];
  colLabels: string[];
  rowTitle: string;
  colTitle: string;
  /** Lets a problem render a sentinel as something other than its raw number. */
  formatValue?: (value: number) => string;
  maxHeight?: number;
}

export function DpTableCanvas({
  step,
  rowLabels,
  colLabels,
  rowTitle,
  colTitle,
  formatValue,
  maxHeight = 420,
}: DpTableCanvasProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const rows = rowLabels.length;
  const cols = colLabels.length;
  const widestCol = colLabels.reduce((m, l) => Math.max(m, l.length), 1);
  const widestRow = rowLabels.reduce((m, l) => Math.max(m, l.length), 1);
  const cellW = cellWidth(cols, widestCol);
  const gutter = Math.max(32, widestRow * 6.6 + 12);

  const width = gutter + cols * cellW + 4;
  const height = HEADER_H + rows * CELL_H + 4;

  const cx = (c: number) => gutter + c * cellW + cellW / 2;
  const cy = (r: number) => HEADER_H + r * CELL_H + CELL_H / 2;

  const active = step.active;

  // Keep the cell being written on screen. Wide tables (an edit-distance grid,
  // a knapsack row of capacities) scroll, and a reader who has to chase the
  // highlight by hand stops watching the algorithm and starts watching the
  // scrollbar.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !active) return;
    const x = gutter + active.c * cellW + cellW / 2;
    const visibleLeft = el.scrollLeft + 40;
    const visibleRight = el.scrollLeft + el.clientWidth - 40;
    if (x < visibleLeft || x > visibleRight) {
      el.scrollTo({ left: Math.max(0, x - el.clientWidth / 2), behavior: "smooth" });
    }
  }, [active, cellW, gutter]);

  return (
    <div className="flex flex-col gap-1.5">
      {(rowTitle || colTitle) && (
        <p className="text-[11px] text-slate">
          {colTitle && (
            <>
              across: <span className="font-semibold text-ink-soft">{colTitle}</span>
            </>
          )}
          {rowTitle && colTitle && <span className="px-1.5 text-border-strong">|</span>}
          {rowTitle && (
            <>
              down: <span className="font-semibold text-ink-soft">{rowTitle}</span>
            </>
          )}
        </p>
      )}

      <div
        ref={scrollRef}
        style={{ maxHeight }}
        className="overflow-auto rounded-lg border border-border bg-surface-2/30 p-2"
      >
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Dynamic programming table" className="block">
          <defs>
            <marker id="dp-arrow" viewBox="0 0 8 8" refX="6.5" refY="4" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--copper)" />
            </marker>
          </defs>

          {colLabels.map((label, c) => (
            <text
              key={`c-${c}`}
              x={cx(c)}
              y={HEADER_H - 7}
              textAnchor="middle"
              className="text-[10px] font-semibold"
              fill="var(--slate)"
            >
              {label}
            </text>
          ))}

          {rowLabels.map((label, r) => (
            <text
              key={`r-${r}`}
              x={gutter - 6}
              y={cy(r) + 3.5}
              textAnchor="end"
              className="text-[10px] font-semibold"
              fill="var(--slate)"
            >
              {label}
            </text>
          ))}

          {step.values.map((row, r) =>
            row.map((value, c) => {
              const state = step.state[r][c];
              const style = cellStyle(state);
              return (
                <g key={`${r}-${c}`}>
                  <rect
                    x={gutter + c * cellW + 1.5}
                    y={HEADER_H + r * CELL_H + 1.5}
                    width={cellW - 3}
                    height={CELL_H - 3}
                    rx={6}
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth={style.weight}
                    strokeDasharray={state === "empty" ? "3 3" : undefined}
                  />
                  {value !== null && (
                    <text
                      x={cx(c)}
                      y={cy(r) + 4}
                      textAnchor="middle"
                      className="text-[12px] font-bold tabular-nums"
                      fill={style.text}
                    >
                      {formatValue ? formatValue(value) : value}
                    </text>
                  )}
                </g>
              );
            }),
          )}

          {/* Drawn last so an arrow is never hidden behind a cell it crosses. */}
          {active &&
            step.deps.map((dep) => (
              <DepArrow key={`${dep.r}-${dep.c}`} from={dep} to={active} cx={cx} cy={cy} cellW={cellW} />
            ))}
        </svg>
      </div>
    </div>
  );
}

/**
 * One dependency, drawn as a curve rather than a straight line.
 *
 * Straight lines were the first attempt and they failed on the single-row
 * problems: a dependency two cells to the left runs straight through the cell
 * in between and reads as though that cell were involved too. Bowing the line
 * away from the row keeps every arrow clear of whatever it passes over.
 */
function DepArrow({
  from,
  to,
  cx,
  cy,
  cellW,
}: {
  from: CellRef;
  to: CellRef;
  cx: (c: number) => number;
  cy: (r: number) => number;
  cellW: number;
}) {
  const x1 = cx(from.c);
  const y1 = cy(from.r);
  const x2 = cx(to.c);
  const y2 = cy(to.r);

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;

  // Start and end on the cell borders instead of the centres, so the arrowhead
  // points at the cell rather than burying itself inside the number.
  const inset = Math.min(cellW / 2 - 2, 18);
  const sx = x1 + (dx / len) * inset;
  const sy = y1 + (dy / len) * inset;
  const ex = x2 - (dx / len) * inset;
  const ey = y2 - (dy / len) * inset;

  const bow = Math.min(len * 0.28, 26);
  const mx = (sx + ex) / 2 - (dy / len) * bow;
  const my = (sy + ey) / 2 + (dx / len) * bow;

  return (
    <path
      d={`M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`}
      fill="none"
      stroke="var(--copper)"
      strokeWidth={1.8}
      markerEnd="url(#dp-arrow)"
      opacity={0.9}
    />
  );
}

/** Colour key for the table. */
export function DpTableLegend({ showPath }: { showPath: boolean }) {
  const items: { label: string; state: CellState }[] = [
    { label: "known outright", state: "base" },
    { label: "being worked out", state: "active" },
    { label: "read to work it out", state: "dep" },
    { label: "already worked out", state: "filled" },
    ...(showPath ? ([{ label: "on the answer", state: "path" }] as const) : []),
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((item) => {
        const s = cellStyle(item.state);
        return (
          <span key={item.label} className="flex items-center gap-1.5 text-[11px] text-slate">
            <span
              aria-hidden
              className="inline-block h-3 w-5 rounded-[4px] border"
              style={{ background: s.fill === "transparent" ? "transparent" : s.fill, borderColor: s.stroke }}
            />
            {item.label}
          </span>
        );
      })}
    </div>
  );
}
