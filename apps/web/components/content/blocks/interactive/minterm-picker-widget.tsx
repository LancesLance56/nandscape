"use client";

import { useMemo, useState } from "react";
import { ActionDock, Legend, WidgetShell } from "./shared/widget-shell";
import { cn } from "@/lib/cn";
import { Banner, WidgetButton } from "./shared/widget-ui";

interface MintermPickerData {
  variables?: unknown;
  truthTable?: unknown;
  title?: unknown;
  instructions?: unknown;
  correctMessage?: unknown;
  incorrectMessage?: unknown;
  className?: unknown;
}

const DEFAULT_VARS = ["A", "B"];
const DEFAULT_TABLE = [0, 1, 1, 1];
const DEFAULT_TITLE = "Pick the Minterms";
const DEFAULT_INSTRUCTIONS =
  "Click every row below where the output is 1,  those are the minterms. Then check your answer.";
const DEFAULT_CORRECT_MESSAGE = "F = A'B + AB' + AB, but actually this is simplifiable, can you see why?";
const DEFAULT_INCORRECT_MESSAGE =
  "Not quite,  green rows are correctly picked, orange is a minterm you missed, red is a row you picked that isn't actually a minterm.";

function resolveVariables(data: MintermPickerData): string[] {
  const { variables } = data;
  if (!Array.isArray(variables) || variables.length < 2 || variables.length > 4) return DEFAULT_VARS;
  return variables.every((v): v is string => typeof v === "string") ? variables : DEFAULT_VARS;
}

function resolveTruthTable(data: MintermPickerData, variableCount: number): number[] {
  const { truthTable } = data;
  const size = 1 << variableCount;
  if (!Array.isArray(truthTable) || truthTable.length !== size) return DEFAULT_TABLE;
  return truthTable.every((v) => v === 0 || v === 1) ? (truthTable as number[]) : DEFAULT_TABLE;
}

function resolveText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function bitsOf(row: number, count: number): number[] {
  const bits: number[] = [];
  for (let p = count - 1; p >= 0; p--) bits.push((row >> p) & 1);
  return bits;
}

export function MintermPickerWidget({ data }: { data: Record<string, unknown> }) {
  const variables = resolveVariables(data);
  const truthTable = resolveTruthTable(data, variables.length);
  const title = resolveText(data.title, DEFAULT_TITLE);
  const instructions = resolveText(data.instructions, DEFAULT_INSTRUCTIONS);
  const correctMessage = resolveText(data.correctMessage, DEFAULT_CORRECT_MESSAGE);
  const incorrectMessage = resolveText(data.incorrectMessage, DEFAULT_INCORRECT_MESSAGE);
  const className = typeof data.className === "string" ? data.className : undefined;

  const rows = useMemo(() => Array.from({ length: truthTable.length }, (_, i) => i), [truthTable.length]);
  const actualMinterms = useMemo(
    () => new Set(rows.filter((r) => truthTable[r] === 1)),
    [rows, truthTable],
  );

  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [checked, setChecked] = useState(false);

  const toggleRow = (row: number) => {
    setChecked(false);
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(row)) next.delete(row);
      else next.add(row);
      return next;
    });
  };

  const correct =
    checked &&
    picked.size === actualMinterms.size &&
    [...picked].every((r) => actualMinterms.has(r));

  return (
    <WidgetShell
      kind="Practice"
      title={title}
      meta={`${actualMinterms.size} row(s) output 1`}
      className={className}
      prompt={instructions}
      stage={
        <div className="mx-auto w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface-card">
          <table className="w-full border-collapse font-mono text-sm">
            <thead>
              <tr className="bg-surface-2 text-slate">
                {variables.map((v) => (
                  <th key={v} className="px-4 py-2 text-center font-sans font-semibold">
                    {v}
                  </th>
                ))}
                <th className="border-l border-border-strong px-4 py-2 text-center font-sans font-semibold">F</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const bits = bitsOf(row, variables.length);
                const isPicked = picked.has(row);
                const isCorrectPick = checked && isPicked && actualMinterms.has(row);
                const isWrongPick = checked && isPicked && !actualMinterms.has(row);
                const isMissed = checked && !isPicked && actualMinterms.has(row);
                return (
                  <tr
                    key={row}
                    onClick={() => toggleRow(row)}
                    aria-selected={isPicked}
                    className={cn(
                      "cursor-pointer border-t border-border transition-colors",
                      isCorrectPick
                        ? "bg-signal-green-bg"
                        : isWrongPick
                          ? "bg-signal-coral-bg"
                          : isMissed
                            ? "bg-copper-bg/60"
                            : isPicked
                              ? "bg-copper-bg"
                              : "hover:bg-surface-2",
                    )}
                  >
                    {bits.map((b, i) => (
                      <td key={i} className="px-4 py-2.5 text-center text-ink">
                        {b}
                      </td>
                    ))}
                    <td className="border-l border-border-strong px-4 py-2.5 text-center font-bold text-ink">{truthTable[row]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      }
      legend={
        checked ? (
          <Legend
            items={[
              { color: "var(--signal-green)", label: "Picked correctly" },
              { color: "var(--copper)", label: "Missed" },
              { color: "var(--signal-coral)", label: "Picked, but F is 0" },
            ]}
          />
        ) : undefined
      }
      status={checked ? <Banner tone={correct ? "good" : "bad"}>{correct ? correctMessage : incorrectMessage}</Banner> : undefined}
      dock={
        <ActionDock hint="Click every row where F is 1.">
          <WidgetButton
            onClick={() => {
              setPicked(new Set());
              setChecked(false);
            }}
          >
            Clear
          </WidgetButton>
          <WidgetButton tone="primary" size="md" onClick={() => setChecked(true)}>
            Check my answer
          </WidgetButton>
        </ActionDock>
      }
    />
  );
}
