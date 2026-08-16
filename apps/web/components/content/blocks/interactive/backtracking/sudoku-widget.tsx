"use client";

import { useMemo, useState } from "react";
import { defaultSudoku, sudokuSteps, type SudokuPayload, type SudokuStrategy } from "@/lib/backtracking/puzzles";
import { cn } from "@/lib/cn";
import { PanelBox, StatReadout } from "../shared/panel-ui";
import { StepCaption, StepControls, useStepPlayer } from "../shared/step-player";

function SudokuBoard({ payload }: { payload: SudokuPayload | undefined }) {
  const board = payload?.board ?? new Array(81).fill(0);
  const givens = payload?.givens ?? new Array(81).fill(false);
  const active = payload?.cell ?? null;
  const ok = payload?.ok ?? true;

  return (
    <div className="inline-grid grid-cols-9 gap-px rounded-lg border-2 border-border-strong bg-border-strong p-px">
      {board.map((v, i) => {
        const row = Math.floor(i / 9);
        const col = i % 9;
        const isActive = i === active;
        const isGiven = givens[i];

        return (
          <div
            key={i}
            className={cn(
              "flex h-7 w-7 items-center justify-center bg-surface font-mono text-sm transition-colors sm:h-8 sm:w-8",
              // Heavier separators on the 3x3 box boundaries, which is what
              // makes the constraint structure readable at a glance.
              col % 3 === 2 && col !== 8 && "border-r-2 border-r-border-strong",
              row % 3 === 2 && row !== 8 && "border-b-2 border-b-border-strong",
              isGiven ? "font-bold text-ink" : "text-copper-dark",
              isActive && ok && "bg-copper text-white",
              isActive && !ok && "bg-signal-coral/40 text-signal-coral",
            )}
          >
            {v === 0 ? "" : v}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Sudoku, comparing cell-ordering strategies.
 *
 * No search tree is drawn: at up to nine branches per empty cell it would be
 * unreadable, and the board already shows the state. The counters carry the
 * lesson instead. On the bundled puzzle, reading order fills 185 cells and
 * hits 56 dead ends; picking the most constrained cell fills 49 and hits
 * none. Same algorithm, same answer, different order of questions.
 */
export function SudokuWidget({ data }: { data: Record<string, unknown> }) {
  const puzzle = useMemo(() => {
    const given = data.puzzle;
    if (Array.isArray(given) && given.length === 81 && given.every((v) => typeof v === "number")) {
      return given as number[];
    }
    return defaultSudoku();
  }, [data.puzzle]);

  const [strategy, setStrategy] = useState<SudokuStrategy>(data.strategy === "mrv" ? "mrv" : "first");

  const run = useMemo(() => sudokuSteps(puzzle, strategy), [puzzle, strategy]);

  // Both runs are computed so the comparison line can quote real numbers for
  // the strategy that is not currently selected.
  const comparison = useMemo(() => {
    const stats = (s: SudokuStrategy) => {
      const r = sudokuSteps(puzzle, s);
      const done = r.steps.find((x) => x.solutions.length > 0) ?? r.steps[r.steps.length - 1];
      return { filled: done.visited, dead: done.pruned, frames: r.steps.length, solved: r.steps.some((x) => x.solutions.length > 0) };
    };
    return { first: stats("first"), mrv: stats("mrv") };
  }, [puzzle]);

  const player = useStepPlayer(run.steps.length, 260);
  const step = run.steps[Math.min(player.index, run.steps.length - 1)];
  const payload = step?.payload as SudokuPayload | undefined;

  if (!step) return <p className="text-sm text-signal-coral">Sudoku widget: nothing to run.</p>;

  return (
    <div className="rounded-xl border border-border bg-surface-card p-5">
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-semibold text-slate">Which cell to fill next</span>
        {(
          [
            { id: "first", label: "Next blank in reading order" },
            { id: "mrv", label: "Fewest candidates first" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setStrategy(opt.id)}
            aria-pressed={opt.id === strategy}
            className={cn(
              "rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors",
              opt.id === strategy
                ? "border-copper bg-copper-bg text-copper-dark"
                : "border-border-strong text-ink-soft hover:bg-surface-2 hover:text-ink",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
        <div className="overflow-x-auto">
          <SudokuBoard payload={payload} />
          <p className="mt-2 max-w-[18rem] text-[11px] text-slate">
            Bold digits are the given clues and never change. Copper digits are values the solver is guessing.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <PanelBox title="Candidates for the active cell">
            {payload?.candidates && payload.candidates.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {payload.candidates.map((c) => (
                  <span
                    key={c}
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded font-mono text-xs font-bold",
                      c === payload.value ? "bg-copper text-white" : "bg-surface-3 text-ink-soft",
                    )}
                  >
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs italic text-slate">
                {payload?.cell !== null && payload?.ok === false ? "none left, this branch is dead" : "no cell active"}
              </span>
            )}
          </PanelBox>

          <PanelBox title="Work done">
            <StatReadout
              stats={[
                { label: "cells filled", value: step.visited },
                { label: "dead ends", value: step.pruned, tone: step.pruned > 0 ? "warn" : "good" },
                { label: "blanks left", value: payload?.board.filter((v) => v === 0).length ?? 0 },
              ]}
            />
          </PanelBox>

          <PanelBox title="Both strategies on this puzzle">
            <div className="flex flex-col gap-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className={cn(strategy === "first" ? "font-bold text-ink" : "text-slate")}>Reading order</span>
                <span className="font-mono text-ink-soft">
                  {comparison.first.filled} filled, {comparison.first.dead} dead ends
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={cn(strategy === "mrv" ? "font-bold text-ink" : "text-slate")}>Fewest candidates</span>
                <span className="font-mono text-ink-soft">
                  {comparison.mrv.filled} filled, {comparison.mrv.dead} dead ends
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate">
                Same algorithm and the same finished grid. Choosing the tightest cell first means a contradiction shows
                up while the guess that caused it is still on the stack.
              </p>
            </div>
          </PanelBox>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <StepCaption text={step.caption} />
        <StepControls
          index={player.index}
          total={run.steps.length}
          playing={player.playing}
          onPlay={player.play}
          onPause={player.pause}
          onNext={player.next}
          onPrev={player.prev}
          onReset={player.reset}
          onScrub={player.setIndex}
        />
        {run.truncated && (
          <p className="text-[11px] text-copper-dark">
            This run hit the step limit before finishing, which is itself the point: reading order can spend a very long
            time in a branch that was doomed near the top.
          </p>
        )}
      </div>
    </div>
  );
}
