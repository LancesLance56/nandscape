"use client";

import { Fragment, useMemo, useState } from "react";
import { DEFAULT_BLOCK_COLORS } from "@/lib/editor/block-colors";
import { evaluateMinterm } from "@/lib/blog/kmap-demo";
import { WidgetFrame } from "./widget-frame";
import { cn } from "@/lib/cn";

interface HintGroup {
  cells: number[];
  term: string;
}

interface ConfirmedGroup {
  cells: number[];
  term: string;
  color: string;
}

const DEFAULT_VARS: readonly string[] = ["A", "B", "C"];
const DEFAULT_TITLE = "Karnaugh Map";

function isHintGroup(value: unknown): value is HintGroup {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.cells) && v.cells.every((c) => typeof c === "number") && typeof v.term === "string";
}

function resolveVariables(data: Record<string, unknown>): string[] {
  const { variables } = data;
  if (!Array.isArray(variables) || variables.length < 2 || variables.length > 4) return [...DEFAULT_VARS];
  return variables.every((v): v is string => typeof v === "string") ? variables : [...DEFAULT_VARS];
}

function resolveTruthTable(data: Record<string, unknown>, variableCount: number): number[] | null {
  const { truthTable } = data;
  const size = 1 << variableCount;
  if (!Array.isArray(truthTable) || truthTable.length !== size) return null;
  return truthTable.every((v) => v === 0 || v === 1) ? (truthTable as number[]) : null;
}

function resolveHintGroups(data: Record<string, unknown>): HintGroup[] {
  const { hintGroups } = data;
  return Array.isArray(hintGroups) ? hintGroups.filter(isHintGroup) : [];
}

function resolveText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function grayCode(bits: number): number[] {
  const size = 1 << bits;
  const codes: number[] = [];
  for (let i = 0; i < size; i++) codes.push(i ^ (i >> 1));
  return codes;
}

function toBinaryLabel(value: number, bits: number): string {
  return value.toString(2).padStart(bits, "0");
}

function bitPositions(mask: number, totalBits: number): number[] {
  const positions: number[] = [];
  for (let p = 0; p < totalBits; p++) {
    if (mask & (1 << p)) positions.push(p);
  }
  return positions;
}

function validateGroup(cells: number[], totalBits: number): boolean {
  const size = cells.length;
  if (size === 0 || (size & (size - 1)) !== 0) return false;

  const base = cells[0];
  let freeMask = 0;
  for (const cell of cells) freeMask |= cell ^ base;

  const freeBits = bitPositions(freeMask, totalBits);
  if (2 ** freeBits.length !== size) return false;

  const set = new Set(cells);
  for (let subset = 0; subset < size; subset++) {
    let value = base & ~freeMask;
    let s = subset;
    for (const pos of freeBits) {
      if (s & 1) value |= 1 << pos;
      s >>= 1;
    }
    if (!set.has(value)) return false;
  }
  return true;
}

function termFor(cells: number[], variables: string[]): string {
  const totalBits = variables.length;
  const base = cells[0];
  let freeMask = 0;
  for (const cell of cells) freeMask |= cell ^ base;
  const fixedBits = Array.from({ length: totalBits }, (_, i) => i).filter((p) => !(freeMask & (1 << p)));
  if (fixedBits.length === 0) return "1";

  return fixedBits
    .map((p) => {
      const varIndex = totalBits - 1 - p;
      const value = (base >> p) & 1;
      return value ? variables[varIndex] : `${variables[varIndex]}'`;
    })
    .join("");
}

export function KMapExplorerWidget({ data }: { data: Record<string, unknown> }) {
  const variables = resolveVariables(data);
  const totalBits = variables.length;
  const rowBits = Math.floor(totalBits / 2);
  const colBits = totalBits - rowBits;
  const rowVariables = variables.slice(0, rowBits);
  const colVariables = variables.slice(rowBits);
  const title = resolveText(data.title, DEFAULT_TITLE);
  const className = typeof data.className === "string" ? data.className : undefined;

  const truthTable = resolveTruthTable(data, totalBits);
  const hintGroups = resolveHintGroups(data);

  const [selected, setSelected] = useState<number[]>([]);
  const [confirmed, setConfirmed] = useState<ConfirmedGroup[]>([]);
  const [message, setMessage] = useState(
    "Click the 1s you think belong together, then check your group.",
  );
  const [hintIndex, setHintIndex] = useState<number | null>(null);

  const rowCodes = useMemo(() => grayCode(rowBits), [rowBits]);
  const colCodes = useMemo(() => grayCode(colBits), [colBits]);

  const cellValues = useMemo(() => {
    const values: Record<number, boolean> = {};
    const size = 1 << totalBits;
    for (let m = 0; m < size; m++) {
      values[m] = truthTable ? truthTable[m] === 1 : totalBits === 3 ? evaluateMinterm(m) : false;
    }
    return values;
  }, [truthTable, totalBits]);

  const onesTotal = Object.values(cellValues).filter(Boolean).length;
  const coveredMinterms = new Set(confirmed.flatMap((g) => g.cells));
  const covered = [...coveredMinterms].filter((m) => cellValues[m]).length;

  const toggleCell = (minterm: number) => {
    setMessage("");
    setSelected((prev) => (prev.includes(minterm) ? prev.filter((m) => m !== minterm) : [...prev, minterm]));
  };

  const checkGroup = () => {
    if (selected.length === 0) return;

    if (selected.some((m) => !cellValues[m])) {
      setMessage("A group can only contain cells where the output is 1.");
      return;
    }

    if (!validateGroup(selected, totalBits)) {
      setMessage(
        "That's not a legal group. K-map groups are rectangular blocks of 1, 2, 4, or 8 cells, and the map wraps around at its edges.",
      );
      return;
    }

    const term = termFor(selected, variables);
    if (confirmed.some((g) => g.term === term)) {
      setMessage(`You already found ${term}. Try a different group.`);
      setSelected([]);
      return;
    }

    const color = DEFAULT_BLOCK_COLORS[confirmed.length % DEFAULT_BLOCK_COLORS.length];
    setConfirmed((prev) => [...prev, { cells: [...selected], term, color }]);
    setMessage(`Found it: ${term}.`);
    setSelected([]);
  };

  const reset = () => {
    setConfirmed([]);
    setSelected([]);
    setHintIndex(null);
    setMessage("Click the 1s you think belong together, then check your group.");
  };

  const showHint = () => {
    if (hintGroups.length === 0) return;
    setHintIndex((prev) => (prev === null ? 0 : (prev + 1) % hintGroups.length));
  };

  const expression = confirmed.map((g) => g.term).join(" + ");
  const hintCells = hintIndex !== null ? hintGroups[hintIndex]?.cells ?? [] : [];

  const colorForCell = (minterm: number): string | null => {
    const group = [...confirmed].reverse().find((g) => g.cells.includes(minterm));
    return group ? group.color : null;
  };

  const rowVarLabel = rowVariables.join("");
  const colVarLabel = colVariables.join("");

  return (
    <WidgetFrame title={title} subtitle={`${covered} / ${onesTotal} ones covered`} className={className}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex flex-col items-center gap-8">
          <div
            className="grid gap-1 mr-auto"
            style={{ gridTemplateColumns: `3.25rem repeat(${colCodes.length}, 4rem)` }}
          >
            <svg viewBox="0 0 52 52" className="h-13 w-13" preserveAspectRatio="none">
              <line x1="0" y1="0" x2="52" y2="52" stroke="var(--border-strong)" strokeWidth="1.5" />
              <text x="47" y="15" textAnchor="end" className="font-mono text-[11px] font-bold fill-slate">
                {colVarLabel}
              </text>
              <text x="5" y="45" textAnchor="start" className="font-mono text-[11px] font-bold fill-slate">
                {rowVarLabel}
              </text>
            </svg>

            {colCodes.map((code) => (
              <div key={`col-${code}`} className="text-center font-mono text-[11px] font-semibold text-slate mt-auto">
                {toBinaryLabel(code, colBits)}
              </div>
            ))}

            {rowCodes.map((rowCode) => (
              <Fragment key={`row-${rowCode}`}>
                <div className="flex items-center justify-center font-mono text-[11px] font-semibold text-slate ml-auto">
                  {toBinaryLabel(rowCode, rowBits)}
                </div>
                {colCodes.map((colCode) => {
                  const minterm = (rowCode << colBits) | colCode;
                  const value = cellValues[minterm];
                  const isSelected = selected.includes(minterm);
                  const groupColor = colorForCell(minterm);
                  const isHint = hintCells.includes(minterm);
                  return (
                    <button
                      key={minterm}
                      type="button"
                      onClick={() => toggleCell(minterm)}
                      className={cn(
                        "flex h-16 w-16 items-center justify-center rounded-lg border-2 font-mono text-lg font-bold transition-all",
                        isSelected
                          ? "border-copper bg-copper-bg text-copper-dark"
                          : value
                            ? "border-border-strong bg-surface-card text-ink"
                            : "border-border bg-surface-2 text-slate",
                        isHint && "ring-2 ring-offset-1 ring-signal-green",
                      )}
                      style={groupColor ? { boxShadow: `inset 0 0 0 3px ${groupColor}` } : undefined}
                    >
                      {value ? 1 : 0}
                    </button>
                  );
                })}
              </Fragment>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={checkGroup}
              className="rounded-lg bg-copper px-3 py-1.5 font-mono text-[11px] font-semibold text-white hover:bg-copper-dark"
            >
              Check group
            </button>
            <button
              type="button"
              onClick={() => setSelected([])}
              className="rounded-lg border border-border-strong px-3 py-1.5 font-mono text-[11px] font-semibold text-ink-soft hover:bg-surface-2"
            >
              Clear selection
            </button>
            {hintGroups.length > 0 && (
              <button
                type="button"
                onClick={showHint}
                className="rounded-lg border border-border-strong px-3 py-1.5 font-mono text-[11px] font-semibold text-ink-soft hover:bg-surface-2"
              >
                Hint
              </button>
            )}
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-border-strong px-3 py-1.5 font-mono text-[11px] font-semibold text-signal-coral hover:bg-surface-2"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="flex-1 rounded-xl border border-border bg-surface-card p-4 pb-8">
          <p className="min-h-10 font-mono text-xs text-ink-soft">{message}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {confirmed.map((g) => (
              <span
                key={g.term}
                className="rounded-full px-2.5 py-1 font-mono text-xs font-bold text-white"
                style={{ backgroundColor: g.color }}
              >
                {g.term}
              </span>
            ))}
            {confirmed.length === 0 && <span className="text-xs text-slate">No groups confirmed yet.</span>}
          </div>

          <p className="mt-4 font-mono text-sm font-semibold text-ink">F = {expression || "?"}</p>

          {covered === onesTotal && onesTotal > 0 && (
            <p className="mt-3 rounded-lg border border-signal-green/40 bg-signal-green-bg px-3 py-2 font-mono text-xs font-semibold text-signal-green-strong">
              Every 1 in the map is covered. That&#39;s the function: F = {expression}.
            </p>
          )}
        </div>
      </div>
    </WidgetFrame>
  );
}
