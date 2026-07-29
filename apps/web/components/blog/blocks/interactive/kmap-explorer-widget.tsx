"use client";

import { useMemo, useState } from "react";
import { DEFAULT_BLOCK_COLORS } from "@/lib/editor/block-colors";
import { evaluateMinterm } from "@/lib/blog/kmap-demo";
import { CircuitFrame } from "./circuit-frame";

interface HintGroup {
  cells: number[];
  term: string;
}

interface ConfirmedGroup {
  cells: number[];
  term: string;
  color: string;
}

interface KMapExplorerData {
  variables?: string[];
  hintGroups?: HintGroup[];
}

function isKMapData(data: unknown): data is KMapExplorerData {
  if (typeof data !== 'object' || data === null) return false;

  const d = data as Record<string, unknown>;

  if (d.variables !== undefined && !Array.isArray(d.variables)) return false;
  return !(d.hintGroups !== undefined && !Array.isArray(d.hintGroups));
}


const DEFAULT_VARS: readonly string[] = ["A", "B", "C"];

function isHintGroup(value: unknown): value is HintGroup {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.cells) && v.cells.every((c) => typeof c === "number") && typeof v.term === "string";
}

function resolveVariables(data: Record<string, unknown>): string[] {
  const { variables } = data;
  if (!Array.isArray(variables) || variables.length === 0) return [...DEFAULT_VARS];
  return variables.every((v): v is string => typeof v === "string") ? variables : [...DEFAULT_VARS];
}

function resolveHintGroups(data: Record<string, unknown>): HintGroup[] {
  const { hintGroups } = data;
  return Array.isArray(hintGroups) ? hintGroups.filter(isHintGroup) : [];
}
const GRAY_BC: [boolean, boolean][] = [
  [false, false],
  [false, true],
  [true, true],
  [true, false],
];
const GRAY_LABELS = ["00", "01", "11", "10"];

function mintermFor(aBit: boolean, bc: [boolean, boolean]): number {
  const [b, c] = bc;
  return (aBit ? 4 : 0) + (b ? 2 : 0) + (c ? 1 : 0);
}

function bitPositions(mask: number): number[] {
  const positions: number[] = [];
  for (let p = 0; p < 3; p++) {
    if (mask & (1 << p)) positions.push(p);
  }
  return positions;
}

  function validateGroup(cells: number[]): boolean {
  const size = cells.length;
  if (size === 0 || (size & (size - 1)) !== 0) return false;

  const base = cells[0];
  let freeMask = 0;
  for (const cell of cells) freeMask |= cell ^ base;

  const freeBits = bitPositions(freeMask);
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
  const base = cells[0];
  let freeMask = 0;
  for (const cell of cells) freeMask |= cell ^ base;
  const fixedBits = [0, 1, 2].filter((p) => !(freeMask & (1 << p)));
  if (fixedBits.length === 0) return "1";

  return fixedBits
    .map((p) => {
      const varIndex = 2 - p;
      const value = (base >> p) & 1;
      return value ? variables[varIndex] : `${variables[varIndex]}'`;
    })
    .join("");
}

export function KMapExplorerWidget({ data }: { data: Record<string, unknown> }) {
  const variables = resolveVariables(data);
  const hintGroups = resolveHintGroups(data);

  const [selected, setSelected] = useState<number[]>([]);
  const [confirmed, setConfirmed] = useState<ConfirmedGroup[]>([]);
  const [message, setMessage] = useState(
    "Click the 1s you think belong together, then check your group.",
  );
  const [hintIndex, setHintIndex] = useState<number | null>(null);

  const grid = useMemo(() => [false, true].map((aBit) => GRAY_BC.map((bc) => mintermFor(aBit, bc))), []);

  const cellValues = useMemo(() => {
    const values: Record<number, boolean> = {};
    for (let m = 0; m < 8; m++) values[m] = evaluateMinterm(m);
    return values;
  }, []);

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

    if (!validateGroup(selected)) {
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

  return (
    <CircuitFrame title="Karnaugh Map" subtitle={`${covered} / ${onesTotal} ones covered`}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex flex-col items-center gap-8">
          <div className="grid grid-cols-[2.5rem_repeat(4,4rem)] gap-1 mr-auto">
            <div />
            {GRAY_LABELS.map((label) => (
              <div key={label} className="text-center font-mono text-[11px] font-semibold text-slate">
                {label}
              </div>
            ))}

            {grid.map((row, rowIndex) => (
              <>
                <div
                  key={`label-${rowIndex}`}
                  className="flex items-center justify-center font-mono text-[11px] font-semibold text-slate mx-0"
                >
                  {rowIndex}
                </div>
                {row.map((minterm) => {
                  const value = cellValues[minterm];
                  const isSelected = selected.includes(minterm);
                  const groupColor = colorForCell(minterm);
                  const isHint = hintCells.includes(minterm);
                  return (
                    <button
                      key={minterm}
                      type="button"
                      onClick={() => toggleCell(minterm)}
                      className={`flex h-16 w-16 items-center justify-center rounded-lg border-2 font-mono text-lg font-bold transition-all ${
                        isSelected
                          ? "border-copper bg-copper-bg text-copper-dark"
                          : value
                            ? "border-border-strong bg-surface-card text-ink"
                            : "border-border bg-surface-2 text-slate"
                      } ${isHint ? "ring-2 ring-offset-1 ring-signal-green" : ""}`}
                      style={groupColor ? { boxShadow: `inset 0 0 0 3px ${groupColor}` } : undefined}
                    >
                      {value ? 1 : 0}
                    </button>
                  );
                })}
              </>
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
              Every 1 in the map is covered. That&#39;s the black box&#39;s real function: F = {expression}.
            </p>
          )}
        </div>
      </div>
    </CircuitFrame>
  );
}