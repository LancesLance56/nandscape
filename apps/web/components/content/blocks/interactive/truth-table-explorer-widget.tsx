"use client";

import { useEffect, useMemo, useState } from "react";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { Led } from "@/components/ui/led";
import { ActionDock, WidgetShell } from "./shared/widget-shell";
import { Banner, StatReadout } from "./shared/widget-ui";
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
    <WidgetShell
      kind="Boolean logic"
      title={title}
      className={className}
      prompt="Flip the inputs and fill in the table: what is the mystery box doing?"
      stage={
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-center">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface-card p-3 sm:gap-4 sm:p-4">
            <div className="flex gap-6">
              {variables.map((v, i) => (
                <ToggleSwitch key={v} label={v} checked={switches[i]} onChange={() => toggleAt(i)} />
              ))}
            </div>

            <div className="flex h-14 w-36 items-center justify-center rounded-xl border-2 border-dashed border-border-strong bg-surface-2 text-xs font-semibold text-slate sm:h-20">
              {mysteryLabel}
            </div>

            <Led label="F" value={output ? 1 : 0} />
          </div>

          <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-surface-card sm:max-w-xs">
            <table className="w-full border-collapse font-mono text-xs">
              <thead>
                <tr className="bg-surface-2 text-slate">
                  {variables.map((v) => (
                    <th key={v} className="px-3 py-2 text-center font-sans font-semibold">
                      {v}
                    </th>
                  ))}
                  <th className="border-l border-border-strong px-3 py-2 text-center font-sans font-semibold">F</th>
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
                        isCurrent ? "bg-copper-bg" : found !== undefined ? "bg-surface-card" : "bg-surface-2/40",
                      )}
                    >
                      {bits.map((b, i) => (
                        <td key={i} className="px-3 py-1 text-center">
                          {found === undefined ? (
                            <span className="text-slate">?</span>
                          ) : b ? (
                            <span className="text-signal-green-strong">1</span>
                          ) : (
                            <span className="text-signal-coral-strong">0</span>
                          )}
                        </td>
                      ))}
                      <td className="border-l border-border-strong px-3 py-1 text-center font-bold">
                        {found === undefined ? (
                          <span className="text-slate">?</span>
                        ) : found ? (
                          <span className="text-signal-green-strong">1</span>
                        ) : (
                          <span className="text-signal-coral-strong">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      }
      readout={<StatReadout stats={[{ label: `of ${size} combinations found`, value: discoveredCount, tone: discoveredCount === size ? "good" : "default" }]} />}
      status={discoveredCount === size ? <Banner tone="good">{completionMessage}</Banner> : undefined}
      dock={<ActionDock hint="Each new combination of switches fills in one more row." />}
    />
  );
}
