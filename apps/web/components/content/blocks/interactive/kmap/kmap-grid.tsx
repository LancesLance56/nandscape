"use client";

import { Fragment, useId } from "react";
import {
  type CellValue,
  type Implicant,
  type KMapLayout,
  mintermAt,
  rectsForImplicant,
  toBinary,
} from "@/lib/kmap/kmap";
import { cn } from "@/lib/cn";

export interface DrawnGroup {
  implicant: Implicant;
  color: string;
  /** Shown in the corner tag on the outline. */
  label?: string;
  dimmed?: boolean;
}

const SIZES = {
  sm: { cell: 46, gap: 5, header: 40, font: 15, index: 8 },
  md: { cell: 62, gap: 6, header: 52, font: 19, index: 9 },
} as const;

export type KMapGridSize = keyof typeof SIZES;

interface KMapGridProps {
  layout: KMapLayout;
  cells: CellValue[];
  groups?: DrawnGroup[];
  /** Cells the reader has selected but not yet confirmed. */
  selected?: number[];
  /** Cells to call attention to, e.g. a hint. */
  highlight?: number[];
  onCellClick?: (minterm: number) => void;
  size?: KMapGridSize;
  /** The small minterm number in each cell's corner. */
  showIndices?: boolean;
  ariaLabel?: string;
}

/**
 * The map itself: gray-code headers, the cell grid, and group outlines drawn
 * over the top.
 *
 * Groups are an SVG layer rather than per-cell borders, which is what lets a
 * group read as one enclosed region instead of a row of separately-tinted
 * squares. It also means a wrapped group can be drawn as its real pieces
 * (rectsForImplicant returns screen-space rectangles) with the wrap edges
 * marked, so the four-corners group looks like one group in four parts
 * rather than four unrelated cells.
 *
 * Cells stay real <button>s underneath the overlay so the map is still
 * keyboard-navigable; the SVG is pointer-events-none.
 */
export function KMapGrid({
  layout,
  cells,
  groups = [],
  selected = [],
  highlight = [],
  onCellClick,
  size = "md",
  showIndices = true,
  ariaLabel,
}: KMapGridProps) {
  const { cell, gap, header, font, index: indexFont } = SIZES[size];
  const uid = useId().replace(/:/g, "");

  const gridW = layout.cols * cell + (layout.cols - 1) * gap;
  const gridH = layout.rows * cell + (layout.rows - 1) * gap;

  const selectedSet = new Set(selected);
  const highlightSet = new Set(highlight);

  const x = (col: number) => col * (cell + gap);
  const y = (row: number) => row * (cell + gap);

  return (
    <div
      className="inline-grid"
      style={{
        gridTemplateColumns: `${header}px ${gridW}px`,
        gridTemplateRows: `${header}px ${gridH}px`,
        gap: `${gap}px`,
      }}
    >
      {/* Corner: which variables label which axis. */}
      <svg viewBox="0 0 52 52" width={header} height={header} aria-hidden className="overflow-visible">
        <line x1="2" y1="2" x2="50" y2="50" stroke="var(--border-strong)" strokeWidth="1.5" />
        <text x="49" y="16" textAnchor="end" className="text-[11px] font-bold" fill="var(--slate)">
          {layout.colVars.join("")}
        </text>
        <text x="3" y="47" textAnchor="start" className="text-[11px] font-bold" fill="var(--slate)">
          {layout.rowVars.join("")}
        </text>
      </svg>

      {/* Column headers. */}
      <div className="flex items-end" style={{ gap: `${gap}px` }}>
        {layout.colCodes.map((code) => (
          <div
            key={code}
            style={{ width: cell }}
            className="pb-1 text-center font-mono text-[11px] font-bold tracking-wider text-slate"
          >
            {toBinary(code, layout.colBits)}
          </div>
        ))}
      </div>

      {/* Row headers. */}
      <div className="flex flex-col justify-start" style={{ gap: `${gap}px` }}>
        {layout.rowCodes.map((code) => (
          <div
            key={code}
            style={{ height: cell }}
            className="flex items-center justify-end pr-1.5 font-mono text-[11px] font-bold tracking-wider text-slate"
          >
            {toBinary(code, layout.rowBits)}
          </div>
        ))}
      </div>

      {/* Cells, with the group overlay on top. */}
      <div className="relative" style={{ width: gridW, height: gridH }}>
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${layout.cols}, ${cell}px)`,
            gridTemplateRows: `repeat(${layout.rows}, ${cell}px)`,
            gap: `${gap}px`,
          }}
          // Deliberately a group of buttons rather than role="grid": a real
          // ARIA grid needs row elements between the grid and its cells, and
          // this is a CSS grid with none. Plain buttons with clear labels
          // navigate and announce better than a malformed grid would.
          role="group"
          aria-label={ariaLabel ?? "Karnaugh map"}
        >
          {layout.rowCodes.map((_, row) => (
            <Fragment key={row}>
              {layout.colCodes.map((__, col) => {
                const minterm = mintermAt(layout, row, col);
                const value = cells[minterm];
                const isSelected = selectedSet.has(minterm);
                const isHighlight = highlightSet.has(minterm);
                const interactive = Boolean(onCellClick);

                return (
                  <button
                    key={minterm}
                    type="button"
                    disabled={!interactive}
                    onClick={interactive ? () => onCellClick?.(minterm) : undefined}
                    aria-label={`Minterm ${minterm}, value ${value === "x" ? "don't care" : value}`}
                    aria-pressed={interactive ? isSelected : undefined}
                    className={cn(
                      "relative flex items-center justify-center rounded-xl border-2 font-bold transition-all duration-150",
                      value === 1 && "border-copper/45 bg-copper-bg text-copper-dark",
                      value === 0 && "border-border bg-surface-2 text-border-strong",
                      value === "x" && "border-dashed border-slate/50 bg-surface-2/60 text-slate",
                      isSelected && "!border-ink scale-[1.04] shadow-md",
                      isHighlight && "ring-2 ring-signal-green ring-offset-2 ring-offset-surface-card",
                      interactive && "cursor-pointer hover:brightness-[0.97] active:scale-[0.97]",
                    )}
                    style={{ fontSize: font }}
                  >
                    {value === "x" ? "X" : value}
                    {showIndices && (
                      <span
                        aria-hidden
                        className="absolute left-1.5 top-1 font-mono font-semibold text-slate/70"
                        style={{ fontSize: indexFont }}
                      >
                        {minterm}
                      </span>
                    )}
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>

        <svg
          className="pointer-events-none absolute left-0 top-0 overflow-visible"
          width={gridW}
          height={gridH}
          aria-hidden
        >
          {groups.map((group, gi) => {
            const rects = rectsForImplicant(group.implicant, layout);
            // Nested groups get progressively tighter insets so overlapping
            // outlines stay individually readable instead of stacking exactly.
            const inset = 4 + (gi % 4) * 3.5;
            const split = rects.length > 1;

            return (
              <g key={`${group.color}-${gi}`} opacity={group.dimmed ? 0.32 : 1}>
                {rects.map((r, ri) => {
                  const rx = x(r.col) + inset;
                  const ry = y(r.row) + inset;
                  const rw = r.colSpan * cell + (r.colSpan - 1) * gap - inset * 2;
                  const rh = r.rowSpan * cell + (r.rowSpan - 1) * gap - inset * 2;

                  return (
                    <g key={ri}>
                      <rect
                        x={rx}
                        y={ry}
                        width={Math.max(rw, 6)}
                        height={Math.max(rh, 6)}
                        rx={12}
                        fill={group.color}
                        fillOpacity={0.13}
                        stroke={group.color}
                        strokeWidth={2.5}
                        // A split group is one group shown in pieces, so its
                        // outline is dashed to signal the parts belong together.
                        strokeDasharray={split ? "7 4" : undefined}
                        strokeLinejoin="round"
                      />
                      {group.label && ri === 0 && (
                        <>
                          <rect
                            x={rx + 4}
                            y={ry - 8}
                            width={group.label.length * 6.6 + 10}
                            height={16}
                            rx={8}
                            fill={group.color}
                          />
                          <text
                            x={rx + 9 + (group.label.length * 6.6) / 2}
                            y={ry + 3.5}
                            textAnchor="middle"
                            className="font-mono text-[10px] font-bold"
                            fill="#ffffff"
                          >
                            {group.label}
                          </text>
                        </>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
          <title id={`${uid}-groups`}>Group outlines</title>
        </svg>
      </div>
    </div>
  );
}

/** Legend explaining the cell states, for the tool pages. */
export function KMapCellLegend({ showDontCare = true }: { showDontCare?: boolean }) {
  const item = (cls: string, label: string, text: string) => (
    <span key={label} className="flex items-center gap-1.5 text-[11px] text-slate">
      <span className={cn("flex h-5 w-5 items-center justify-center rounded-md border-2 text-[10px] font-bold", cls)}>
        {text}
      </span>
      {label}
    </span>
  );

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {item("border-copper/45 bg-copper-bg text-copper-dark", "output is 1", "1")}
      {item("border-border bg-surface-2 text-border-strong", "output is 0", "0")}
      {showDontCare && item("border-dashed border-slate/50 bg-surface-2/60 text-slate", "don't care", "X")}
    </div>
  );
}
