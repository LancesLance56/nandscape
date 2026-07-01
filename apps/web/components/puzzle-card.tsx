"use client";

import { useState, useMemo } from "react";
import { DifficultyBadge } from "@/components/ui/badge";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { Led } from "@/components/ui/led";
import { PlayIcon, RefreshIcon, EyeIcon } from "@/components/icons";

export function PuzzleCard() {
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const { sum, carry } = useMemo(() => {
    return {
      sum: a !== b ? 1 : 0,
      carry: a && b ? 1 : 0,
    };
  }, [a, b]);

  const handleReset = () => {
    setA(false);
    setB(false);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface-card shadow-[0_24px_60px_-28px_rgba(16,42,34,0.22)]">
      <div className="flex items-center justify-between border-b border-border px-5.5 py-4.5">
        <div>
          <div className="font-mono text-xs text-slate">Problem 1</div>
          <div className="mt-0.5 font-display text-[17px] font-semibold text-ink">
            Half Adder 2
          </div>
        </div>
        <DifficultyBadge level="medium" />
      </div>

      <div className="p-5.5">
        <p className="mb-4.5 text-sm leading-relaxed text-ink-soft">
          Add two single-bit inputs using only{" "}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[12.5px] text-ink">
            NAND
          </code>{" "}
          gates. Produce{" "}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[12.5px] text-ink">
            SUM
          </code>{" "}
          and{" "}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[12.5px] text-ink">
            CARRY
          </code>{" "}
          as separate outputs. Gate budget: 5.
        </p>

        <div className="mb-4.5 flex items-center justify-between rounded-xl bg-surface-2 px-4.5 py-4">
          <div className="flex gap-6.5">
            <ToggleSwitch label="A" checked={a} onChange={setA} />
            <ToggleSwitch label="B" checked={b} onChange={setB} />
          </div>
          <div className="flex gap-5" aria-live="polite">
            <Led label="SUM" value={sum === 0 ? 0 : 1} />
            <Led label="CARRY" value={carry === 0 ? 0 : 1} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-t-xl border border-b-0 border-border bg-surface-2 px-3.5 py-2.5 font-mono text-xs text-slate">
          <span>NAND × 5</span>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Run circuit"
              className="flex h-6.5 w-6.5 items-center justify-center rounded-md border border-border-strong bg-surface-card hover:bg-surface-3 transition-colors"
            >
              <PlayIcon className="h-2.75 w-2.75 text-ink-soft" />
            </button>
            <button
              type="button"
              onClick={handleReset}
              aria-label="Reset circuit"
              className="flex h-6.5 w-6.5 items-center justify-center rounded-md border border-border-strong bg-surface-card hover:bg-surface-3 transition-colors"
            >
              <RefreshIcon className="h-3 w-3 text-ink-soft" />
            </button>
          </div>
        </div>

        <div className="relative flex min-h-47.5 flex-col items-center justify-center gap-1.5 rounded-b-xl border-2 border-dashed border-border-strong text-center [background-image:radial-gradient(circle,var(--border)_1.2px,transparent_1.4px)] [background-size:22px_22px]">
          {!revealed && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-surface-card/60 backdrop-blur-[6px]">
              <button
                onClick={() => setRevealed(true)}
                className="flex items-center gap-2 rounded-full border border-border bg-surface-card px-4 py-2 text-sm font-medium text-ink shadow-sm hover:border-ink-soft transition-all"
              >
                <EyeIcon className="h-4 w-4" />
                Reveal Solution
              </button>
            </div>
          )}

          <div className="p-6 text-sm text-ink-soft font-mono">
            {revealed ? (
              <pre>
                A ⊕ B = Sum (XOR){"\n"}
                A ∧ B = Carry (AND)
              </pre>
            ) : (
              "Circuit builder workspace"
            )}
          </div>
        </div>
      </div>
    </div>
  );
}