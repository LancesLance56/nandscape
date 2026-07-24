"use client";

import { useEffect, useMemo, useState } from "react";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { Led } from "@/components/ui/led";
import { bitsToMinterm, evaluateMinterm, mintermToBits } from "@/lib/blog/kmap-demo";
import { CircuitFrame } from "./circuit-frame";

interface BlackBoxExplorerData {
  variables?: string[];
}

function isBlackBoxData(data: Record<string, unknown>): data is BlackBoxExplorerData {
  return data.variables === undefined || Array.isArray(data.variables);
}

const DEFAULT_VARS = ["A", "B", "C"];

export function BlackBoxExplorerWidget({ data }: { data: Record<string, unknown> }) {
  const variables = isBlackBoxData(data) && data.variables && data.variables.length === 3 ? data.variables : DEFAULT_VARS;

  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  const [c, setC] = useState(false);
  const [visited, setVisited] = useState<Record<number, boolean>>({});

  const currentIndex = bitsToMinterm(a, b, c);
  const output = evaluateMinterm(currentIndex);

  useEffect(() => {
    setVisited((prev) => (prev[currentIndex] !== undefined ? prev : { ...prev, [currentIndex]: output }));
  }, [currentIndex, output]);

  const discoveredCount = Object.keys(visited).length;
  const rows = useMemo(() => Array.from({ length: 8 }, (_, i) => i), []);

  return (
    <CircuitFrame title="Black Box Explorer" subtitle={`${discoveredCount} / 8 combinations found`}>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col items-center gap-5 rounded-xl border border-border bg-surface-card p-5">
          <div className="flex gap-6">
            <ToggleSwitch label={variables[0]} checked={a} onChange={setA} />
            <ToggleSwitch label={variables[1]} checked={b} onChange={setB} />
            <ToggleSwitch label={variables[2]} checked={c} onChange={setC} />
          </div>

          <div className="flex h-24 w-40 items-center justify-center rounded-xl border-2 border-dashed border-border-strong bg-surface-2 font-mono text-xs font-semibold uppercase tracking-wider text-slate">
            UNKNOWN
          </div>

          <Led label={"F"} value={output ? 1 : 0} />
        </div>

        <div className="flex-1 overflow-hidden rounded-xl border border-border">
          <table className="w-full border-collapse font-mono text-xs">
            <thead>
              <tr className="bg-surface-2 text-slate">
                {variables.map((v) => (
                  <th key={v} className="px-3 py-2 text-center font-semibold uppercase tracking-wider">
                    {v}
                  </th>
                ))}
                <th className="px-3 py-2 text-center font-semibold uppercase tracking-wider">F</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((rowIndex) => {
                const [ra, rb, rc] = mintermToBits(rowIndex);
                const found = visited[rowIndex];
                const isCurrent = rowIndex === currentIndex;
                return (
                  <tr
                    key={rowIndex}
                    className={`border-t border-border transition-colors ${
                      isCurrent ? "bg-copper-bg/60" : found !== undefined ? "bg-surface-card" : "bg-surface-2/40"
                    }`}
                  >
                    <td className="px-3 py-1.5 text-center">
                      {found === undefined ? (
                      <span className="text-slate">?</span>
                      ) : ra ? (
                        <span className="text-signal-green">1</span>
                      ) : (
                        <span className="text-signal-coral">0</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      {found === undefined ? (
                      <span className="text-slate">?</span>
                      ) : rb ? (
                        <span className="text-signal-green">1</span>
                      ) : (
                        <span className="text-signal-coral">0</span>
                      )}
                  </td>
                    <td className="px-3 py-1.5 text-center">
                      {found === undefined ? (
                        <span className="text-slate">?</span>
                      ) : rc ? (
                        <span className="text-signal-green">1</span>
                      ) : (
                        <span className="text-signal-coral">0</span>
                      )}
                    </td>
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

      {discoveredCount === 8 && (
        <p className="mt-5 rounded-lg border border-signal-green/40 bg-signal-green-bg px-4 py-3 font-mono text-xs font-semibold text-signal-green-strong">
          Now the Truth Table is finished. Time to find a formula for it with k-maps.
        </p>
      )}
    </CircuitFrame>
  );
}