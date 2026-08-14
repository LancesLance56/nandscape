"use client";

import { useEffect, useMemo, useState } from "react";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { Led } from "@/components/ui/led";
import { WidgetFrame } from "./widget-frame";
import { cn } from "@/lib/cn";

const DEFAULT_VARS: readonly string[] = ["A", "B", "C"];
const DEFAULT_TITLE = "Black Box Explorer";
const DEFAULT_MYSTERY_LABEL = "UNKNOWN";
const DEFAULT_COMPLETION_MESSAGE = "Now the Truth Table is finished. Time to find a formula for it with k-maps.";

function resolveVariables(data: Record<string, unknown>): string[] {
  const { variables } = data;
  if (!Array.isArray(variables) || variables.length < 2 || variables.length > 4) return [...DEFAULT_VARS];
  return variables.every((v): v is string => typeof v === "string") ? variables : [...DEFAULT_VARS];
}

function resolveTruthTable(data: Record<string, unknown>, variableCount: number): number[] {
  const { truthTable } = data;
  const size = 1 << variableCount;
  if (Array.isArray(truthTable) && truthTable.length === size && truthTable.every((v) => v === 0 || v === 1)) {
    return truthTable as number[];
  }
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[truth-table-explorer] expected a ${size}-entry 0/1 truthTable for ${variableCount} variables; falling back to an all-zero function.`,
    );
  }
  return Array.from({ length: size }, () => 0);
}

function resolveText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function bitsToIndex(bits: boolean[]): number {
  return bits.reduce((acc, b) => (acc << 1) | (b ? 1 : 0), 0);
}

function indexToBits(index: number, count: number): boolean[] {
  const bits: boolean[] = [];
  for (let p = count - 1; p >= 0; p--) bits.push(((index >> p) & 1) === 1);
  return bits;
}

export function TruthTableExplorerWidget({ data }: { data: Record<string, unknown> }) {
  const variables = resolveVariables(data);
  const truthTable = resolveTruthTable(data, variables.length);
  const title = resolveText(data.title, DEFAULT_TITLE);
  const mysteryLabel = resolveText(data.mysteryLabel, DEFAULT_MYSTERY_LABEL);
  const completionMessage = resolveText(data.completionMessage, DEFAULT_COMPLETION_MESSAGE);
  const className = typeof data.className === "string" ? data.className : undefined;

  const size = 1 << variables.length;
  const [switches, setSwitches] = useState<boolean[]>(() => Array(variables.length).fill(false));
  const [visited, setVisited] = useState<Record<number, boolean>>({});

  const currentIndex = bitsToIndex(switches);
  const output = truthTable[currentIndex] === 1;

  useEffect(() => {
    setVisited((prev) => (prev[currentIndex] !== undefined ? prev : { ...prev, [currentIndex]: output }));
  }, [currentIndex, output]);

  const toggleAt = (i: number) => {
    setSwitches((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  };

  const discoveredCount = Object.keys(visited).length;
  const rows = useMemo(() => Array.from({ length: size }, (_, i) => i), [size]);

  return (
    <WidgetFrame title={title} subtitle={`${discoveredCount} / ${size} combinations found`} className={className}>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col items-center gap-5 rounded-xl border border-border bg-surface-card p-5">
          <div className="flex gap-6">
            {variables.map((v, i) => (
              <ToggleSwitch key={v} label={v} checked={switches[i]} onChange={() => toggleAt(i)} />
            ))}
          </div>

          <div className="flex h-24 w-40 items-center justify-center rounded-xl border-2 border-dashed border-border-strong bg-surface-2 text-xs font-semibold text-slate">
            {mysteryLabel}
          </div>

          <Led label="F" value={output ? 1 : 0} />
        </div>

        <div className="flex-1 overflow-hidden rounded-xl border border-border">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-surface-2 text-slate">
                {variables.map((v) => (
                  <th key={v} className="px-3 py-2 text-center font-semibold">
                    {v}
                  </th>
                ))}
                <th className="px-3 py-2 text-center font-semibold">F</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((rowIndex) => {
                const bits = indexToBits(rowIndex, variables.length);
                const found = visited[rowIndex];
                const isCurrent = rowIndex === currentIndex;
                return (
                  <tr
                    key={rowIndex}
                    className={cn(
                      "border-t border-border transition-colors",
                      isCurrent ? "bg-copper-bg/60" : found !== undefined ? "bg-surface-card" : "bg-surface-2/40",
                    )}
                  >
                    {bits.map((b, i) => (
                      <td key={i} className="px-3 py-1.5 text-center">
                        {found === undefined ? (
                          <span className="text-slate">?</span>
                        ) : b ? (
                          <span className="text-signal-green">1</span>
                        ) : (
                          <span className="text-signal-coral">0</span>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-center font-bold">
                      {found === undefined ? (
                        <span className="text-slate">?</span>
                      ) : found ? (
                        <span className="text-signal-green">1</span>
                      ) : (
                        <span className="text-signal-coral">0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {discoveredCount === size && (
        <p className="mt-5 rounded-lg border border-signal-green/40 bg-signal-green-bg px-4 py-3 text-xs font-semibold text-signal-green-strong">
          {completionMessage}
        </p>
      )}
    </WidgetFrame>
  );
}
