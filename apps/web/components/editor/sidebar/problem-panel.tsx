"use client";

import { useEffect, useState } from "react";
import { gateTypeToString } from "@nandscape/engine";
import { useEditorStore } from "@/store/editor-store";
import { useLiveSignalsStore } from "@/store/live-signals-store";
import { usePuzzleStore } from "@/store/puzzle-store";
import { usePuzzleProgressStore } from "@/store/puzzle-progress-store";
import { usePuzzleDataStore } from "@/store/puzzle-data-store";
import { gradePuzzle } from "@/lib/puzzles/grade-puzzle";
import { DifficultyTag } from "@/components/puzzles/difficulty-tag";
import Link from "next/link";

const STEP_DELAY_MS = 350;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function ProblemPanel() {
  const activeSlug = usePuzzleStore((s) => s.activePuzzleSlug);
  const runStatus = usePuzzleStore((s) => s.runStatus);
  const caseResults = usePuzzleStore((s) => s.caseResults);
  const structuralError = usePuzzleStore((s) => s.structuralError);
  const startRun = usePuzzleStore((s) => s.startRun);
  const finishRun = usePuzzleStore((s) => s.finishRun);
  const isSolved = usePuzzleProgressStore((s) => (activeSlug ? s.isSolved(activeSlug) : false));
  const saveProgress = usePuzzleProgressStore((s) => s.save);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const puzzle = usePuzzleDataStore((s) => (activeSlug ? s.getPuzzle(activeSlug) : undefined));

  useEffect(() => {
    if (activeSlug) void usePuzzleDataStore.getState().fetchPuzzle(activeSlug);
  }, [activeSlug]);

  if (!activeSlug || !puzzle) {
    return (
      <div className="items-center justify-center p-10 m-auto text-sm text-center text-slate">
        Open a puzzle from{" "}
        <Link href="/puzzles" className="text-copper-dark underline">
          the puzzle list
        </Link>{" "}
        to see its prompt here.
      </div>
    );
  }

  const handleRunTests = async () => {
    if (running) return;
    setRunning(true);
    startRun();

    const { nodes: originalNodes, edges } = useEditorStore.getState();

    const result = await gradePuzzle(puzzle, originalNodes, edges, {
      onStep: async (patchedNodes, signals) => {
        useEditorStore.getState().setNodes(patchedNodes);
        useLiveSignalsStore.getState().setEdgeSignals(signals);
        await delay(STEP_DELAY_MS);
      },
    });

    useEditorStore.getState().setNodes(originalNodes);
    finishRun(result.passed, result.caseResults, result.structuralError);
    setRunning(false);
  };

  const handleSubmit = async () => {
    if (submitting || !activeSlug) return;
    setSubmitting(true);
    const { nodes, edges } = useEditorStore.getState();
    await saveProgress(activeSlug, { nodes, edges, solved: true });
    setSubmitting(false);
  };

  const showSubmit = !structuralError && runStatus === "passed" && !running && !isSolved;

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="truncate font-mono text-[11px] font-semibold uppercase tracking-wider text-slate">
            {puzzle.tags.join(" · ") || "puzzle"}
          </span>
          <div className="flex items-center gap-2">
            {isSolved && (
              <span className="rounded-full bg-signal-green-bg px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-signal-green-strong">
                Solved
              </span>
            )}
            <DifficultyTag difficulty={puzzle.difficulty} />
          </div>
        </div>
        <h2 className="font-display text-lg font-bold text-ink">{puzzle.title}</h2>
      </div>

      <p className="text-sm leading-relaxed text-ink-soft">{puzzle.description}</p>

      <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface-2 p-3 font-mono text-xs text-ink-soft">
        <div>Inputs: {puzzle.inputs.map((p) => p.name).join(", ") || "-"}</div>
        <div>Outputs: {puzzle.outputs.map((p) => p.name).join(", ") || "-"}</div>
        <div>Gate budget: {puzzle.gateBudget ?? "unlimited"}</div>
        <div>Allowed gates: {puzzle.allowedGateTypes?.map(gateTypeToString).join(", ") ?? "any"}</div>
        {puzzle.disallowedGateTypes && puzzle.disallowedGateTypes.length > 0 && (
          <div>Banned gates: {puzzle.disallowedGateTypes.map(gateTypeToString).join(", ")}</div>
        )}
      </div>

      <button
        type="button"
        onClick={handleRunTests}
        disabled={running}
        className="rounded-xl bg-copper px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-copper-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {running ? "Testing…" : "Run tests"}
      </button>

      {structuralError && (
        <p className="rounded-lg border border-signal-coral/40 bg-signal-coral-bg px-3 py-2 text-xs font-medium text-signal-coral-strong">
          {structuralError}
        </p>
      )}

      {!structuralError && runStatus !== "idle" && !running && (
        <div
          className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
            runStatus === "passed"
              ? "border-signal-green/40 bg-signal-green-bg text-signal-green-strong"
              : "border-signal-coral/40 bg-signal-coral-bg text-signal-coral-strong"
          }`}
        >
          {runStatus === "passed"
            ? isSolved
              ? "All tests passed,  puzzle solved!"
              : "All tests passed,  submit your solution below."
            : "Some tests failed."}
        </div>
      )}

      {showSubmit && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-xl bg-signal-green px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-signal-green-strong active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit Solution"}
        </button>
      )}

      {caseResults.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {caseResults.map((c) => (
            <li
              key={c.index}
              className={`rounded-lg border px-2.5 py-1.5 font-mono text-[11px] ${
                c.passed
                  ? "border-signal-green/30 bg-signal-green-bg/60 text-signal-green-strong"
                  : "border-signal-coral/30 bg-signal-coral-bg/60 text-signal-coral-strong"
              }`}
            >
              Case {c.index + 1}: {c.passed ? "PASS" : "FAIL"},  {c.detail}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}