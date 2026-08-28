"use client";

import { useMemo, useState } from "react";
import { WidgetFrame } from "./widget-frame";
import { cn } from "@/lib/cn";
import { WidgetButton } from "./shared/widget-ui";

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
    <WidgetFrame title={title} subtitle={`${actualMinterms.size} row(s) actually output 1`} className={className}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-soft">{instructions}</p>

        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-surface-2 text-slate">
                {variables.map((v) => (
                  <th key={v} className="px-4 py-2 text-center font-semibold">
                    {v}
                  </th>
                ))}
                <th className="px-4 py-2 text-center font-semibold">F</th>
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
                    className={cn(
                      "cursor-pointer border-t border-border transition-colors",
                      isCorrectPick
                        ? "bg-signal-green-bg/70"
                        : isWrongPick
                          ? "bg-signal-coral-bg/70"
                          : isMissed
                            ? "bg-copper-bg/60"
                            : isPicked
                              ? "bg-copper-bg/40"
                              : "hover:bg-surface-2/60",
                    )}
                  >
                    {bits.map((b, i) => (
                      <td key={i} className="px-4 py-2 text-center text-ink">
                        {b}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-center font-bold text-ink">{truthTable[row]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-3">
          <WidgetButton tone="primary" onClick={() => setChecked(true)}>
            Check my answer
          </WidgetButton>
          <WidgetButton
            onClick={() => {
              setPicked(new Set());
              setChecked(false);
            }}
          >
            Clear
          </WidgetButton>
        </div>

        {/* Reserved whether or not the answer has been checked. */}
        <div className="min-h-[3.25rem]">
          {checked && (
            <p
              className={cn(
                "rounded-lg border px-3 py-2 text-xs font-semibold",
                correct
                  ? "border-signal-green/40 bg-signal-green-bg text-signal-green-strong"
                  : "border-signal-coral/40 bg-signal-coral-bg text-signal-coral-strong",
              )}
            >
              {correct ? correctMessage : incorrectMessage}
            </p>
          )}
        </div>
      </div>
    </WidgetFrame>
  );
}
