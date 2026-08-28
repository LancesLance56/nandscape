"use client";

import { useMemo, useState } from "react";
import { permutationsSteps, type PermutationMode } from "@/lib/backtracking/algorithms";
import { cn } from "@/lib/cn";
import { PanelBox, type SegmentedGroup } from "../shared/widget-ui";
import { BacktrackingRunner } from "./backtracking-runner";

const PRESETS = [
  { id: "abc", label: "ABC", letters: ["A", "B", "C"] },
  { id: "aab", label: "AAB (has a repeat)", letters: ["A", "A", "B"] },
  { id: "abcd", label: "ABCD", letters: ["A", "B", "C", "D"] },
];

/**
 * Permutation generation, both ways round.
 *
 * The two modes are not interchangeable trivia. The used-array version keeps
 * the input untouched and tracks which slots are spoken for; the swap version
 * mutates the array in place and needs no extra memory but scrambles the
 * ordering, which is exactly why the two need different duplicate tests. The
 * dedupe toggle is where that difference becomes visible.
 */
export function PermutationsWidget({ data }: { data: Record<string, unknown> }) {
  // Derived in one memo keyed on the raw prop, so a fresh object identity for
  // `startPreset` on every render doesn't invalidate the list below it.
  const presets = useMemo(() => {
    const letters = Array.isArray(data.letters)
      ? (data.letters as unknown[]).filter((v): v is string => typeof v === "string").slice(0, 4)
      : [];
    if (letters.length === 0) return PRESETS;
    if (PRESETS.some((p) => p.letters.join("") === letters.join(""))) return PRESETS;
    return [{ id: "custom", label: letters.join(""), letters }, ...PRESETS];
  }, [data.letters]);

  const startPreset = presets[0];

  const [presetId, setPresetId] = useState(startPreset.id);
  const [mode, setMode] = useState<PermutationMode>(data.mode === "swap" ? "swap" : "used");
  const [dedupe, setDedupe] = useState(data.dedupe === true);

  const letters = (presets.find((p) => p.id === presetId) ?? presets[0]).letters;
  const run = useMemo(() => permutationsSteps(letters, mode, dedupe), [letters, mode, dedupe]);

  const hasRepeat = new Set(letters).size !== letters.length;
  const expected = factorial(letters.length);

  const toggles: SegmentedGroup[] = [
    {
      id: "input",
      label: "Input",
      active: presetId,
      onChange: setPresetId,
      options: presets.map((p) => ({ id: p.id, label: p.label })),
    },
    {
      id: "mode",
      label: "Method",
      active: mode,
      onChange: (id) => setMode(id as PermutationMode),
      options: [
        { id: "used", label: "Used array" },
        { id: "swap", label: "Swap in place" },
      ],
    },
    {
      id: "dedupe",
      label: "Duplicates",
      active: dedupe ? "on" : "off",
      onChange: (id) => setDedupe(id === "on"),
      options: [
        { id: "off", label: "Allow repeats" },
        { id: "on", label: "Skip repeats" },
      ],
    },
  ];

  return (
    <BacktrackingRunner
      run={run}
      toggles={toggles}
      solutionsLabel="Permutations found"
      showDeadInLegend={false}
      hint={
        hasRepeat
          ? `${letters.join("")} has a repeated character, so the raw run produces ${expected} strings but only ${countDistinct(letters)} are different.`
          : `${letters.join("")} has ${letters.length} distinct characters, so expect ${expected} permutations.`
      }
      visual={(step) => {
        const active = step.activeId;
        const partial = active ? (run.nodes.find((n) => n.id === active)?.partial ?? "") : "";
        return (
          <div className="rounded-lg border border-border bg-surface-2/40 p-3">
            <div className="mb-2 text-[11px] font-semibold text-slate">
              {mode === "used" ? "Permutation being built" : "The array right now"}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[...partial].map((ch, i) => (
                <span
                  key={`${ch}-${i}`}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-md border font-mono text-sm font-bold",
                    mode === "swap" && i < step.path.length - 1
                      ? "border-signal-green bg-signal-green/15 text-signal-green"
                      : "border-copper bg-copper-bg text-copper-dark",
                  )}
                >
                  {ch}
                </span>
              ))}
              {mode === "used" &&
                Array.from({ length: Math.max(0, letters.length - partial.length) }).map((_, i) => (
                  <span
                    key={`blank-${i}`}
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-dashed border-border-strong text-slate"
                  >
                    ·
                  </span>
                ))}
            </div>
            {mode === "swap" && (
              <p className="mt-2 text-[11px] text-slate">
                Green positions are locked in for this branch. Everything after them is still being permuted.
              </p>
            )}
          </div>
        );
      }}
      panel={(step) => (
        <PanelBox title={mode === "used" ? "Characters still free" : "Positions still open"} bodyClassName="h-16 overflow-y-auto">
          <div className="flex flex-wrap gap-1.5">
            {mode === "used"
              ? freeLetters(letters, step.path.slice(1)).map((ch, i) => (
                  <span key={`${ch}-${i}`} className="rounded-md bg-surface-3 px-2 py-1 font-mono text-xs font-bold text-ink-soft">
                    {ch}
                  </span>
                ))
              : Array.from({ length: Math.max(0, letters.length - (step.path.length - 1)) }).map((_, i) => (
                  <span key={i} className="rounded-md bg-surface-3 px-2 py-1 font-mono text-xs font-bold text-ink-soft">
                    {step.path.length - 1 + i + 1}
                  </span>
                ))}
            {(mode === "used" ? freeLetters(letters, step.path.slice(1)).length : letters.length - (step.path.length - 1)) === 0 && (
              <span className="text-xs italic text-slate">none, this branch is complete</span>
            )}
          </div>
        </PanelBox>
      )}
    />
  );
}

function factorial(n: number): number {
  let out = 1;
  for (let i = 2; i <= n; i++) out *= i;
  return out;
}

function countDistinct(letters: string[]): number {
  const counts = new Map<string, number>();
  for (const ch of letters) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  let out = factorial(letters.length);
  for (const c of counts.values()) out /= factorial(c);
  return out;
}

/** Letters not yet placed on the current path, respecting multiplicity. */
function freeLetters(all: string[], used: string[]): string[] {
  const pool = [...all];
  for (const ch of used) {
    const i = pool.indexOf(ch);
    if (i !== -1) pool.splice(i, 1);
  }
  return pool;
}
