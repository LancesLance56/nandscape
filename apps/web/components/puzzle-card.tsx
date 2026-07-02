"use client";

import { useState, useMemo } from "react";
import { DifficultyBadge } from "@/components/ui/badge";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { Led } from "@/components/ui/led";
import { PlayIcon, RefreshIcon } from "@/components/icons";

export function PuzzleCard() {
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);

  const nodes = useMemo(() => {
    const n1 = !(a && b);
    const n2 = !(a && n1);
    const n3 = !(b && n1);
    const sum = !(n2 && n3);
    const carry = !(n1 && n1);

    return { n1, n2, n3, sum, carry };
  }, [a, b]);

  const handleReset = () => {
    setA(false);
    setB(false);
  };

  const wireColor = (isActive: boolean) =>
    isActive ? "stroke-[var(--signal-green)]" : "stroke-[var(--border-strong)]";

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface-card shadow-[0_16px_40px_rgba(21,27,24,0.06)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)] max-w-lg w-full transition-all duration-300">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface-card px-6 py-4">
        <div>
          <span className="font-mono text-[11px] font-semibold tracking-wider uppercase text-slate">
            Problem 1
          </span>
          <h3 className="mt-0.5 font-display text-lg font-bold text-ink">
            Half Adder 2
          </h3>
        </div>
        <DifficultyBadge level="medium" />
      </div>

      <div className="p-6 space-y-5">
        {/* Description */}
        <p className="text-sm leading-relaxed text-ink-soft">
          Add two single-bit inputs using only{" "}
          <code className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-xs font-medium text-copper-dark dark:text-copper border border-border-strong/30">
            NAND
          </code>{" "}
          gates. Produce{" "}
          <code className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-xs font-medium text-ink">
            SUM
          </code>{" "}
          and{" "}
          <code className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-xs font-medium text-ink">
            CARRY
          </code>{" "}
          as separate outputs. Gate budget: <span className="font-mono font-bold text-ink">5</span>.
        </p>

        <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2 p-4 shadow-inner">
          <div className="flex gap-8">
            <ToggleSwitch label="A" checked={a} onChange={setA} />
            <ToggleSwitch label="B" checked={b} onChange={setB} />
          </div>
          <div className="h-8 w-px bg-border-strong/40" />
          <div className="flex gap-6" aria-live="polite">
            <Led label="SUM" value={nodes.sum ? 1 : 0} />
            <Led label="CARRY" value={nodes.carry ? 1 : 0} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between rounded-t-xl border border-border bg-surface-2 px-4 py-2.5 font-mono text-xs font-medium text-slate">
            <span className="flex items-center gap-1.5">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${nodes.sum || nodes.carry ? 'bg-signal-green' : 'bg-copper'}`} />
              Circuit Workbench
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                aria-label="Verify circuit"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border-strong bg-surface-card hover:bg-surface-2 text-ink-soft hover:text-ink transition-all active:scale-95 shadow-sm"
              >
                <PlayIcon className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={handleReset}
                aria-label="Reset inputs"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border-strong bg-surface-card hover:bg-surface-2 text-ink-soft hover:text-ink transition-all active:scale-95 shadow-sm"
              >
                <RefreshIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="relative overflow-hidden flex min-h-55 flex-col items-center justify-center rounded-b-xl border border-t-0 border-dashed border-border-strong bg-surface/10 text-center bg-[radial-gradient(var(--border-strong)_1px,transparent_1px)] bg-size-[20px_20px]">

            <div className="absolute inset-0 p-4 opacity-40 blur-[5px] scale-[1.02] select-none pointer-events-none transition-all duration-300">
              <svg viewBox="0 0 500 160" className="w-full h-auto stroke-2 fill-none stroke-round">
                <path d="M 20,40 L 70,40 M 70,40 L 70,65 L 100,65" className={wireColor(a)} />
                <path d="M 20,120 L 70,120 M 70,120 L 70,95 L 100,95" className={wireColor(b)} />

                <path d="M 50,40 L 50,25 L 200,25 L 200,45 L 220,45" className={wireColor(a)} />
                <path d="M 50,120 L 50,135 L 200,135 L 200,115 L 220,115" className={wireColor(b)} />

                <path d="M 140,80 L 160,80 M 160,80 L 160,55 L 220,55" className={wireColor(nodes.n1)} />
                <path d="M 160,80 L 160,105 L 220,105" className={wireColor(nodes.n1)} />
                <path d="M 160,80 L 160,135 L 340,135 L 340,105 L 360,105" className={wireColor(nodes.n1)} />
                <path d="M 340,135 L 340,125 L 360,125" className={wireColor(nodes.n1)} />

                <path d="M 260,50 L 290,50 L 290,65 L 340,65" className={wireColor(nodes.n2)} />
                <path d="M 260,110 L 290,110 L 290,85 L 340,85" className={wireColor(nodes.n3)} />

                <path d="M 380,75 L 450,75" className={wireColor(nodes.sum)} />
                <path d="M 400,115 L 450,115" className={wireColor(nodes.carry)} />

                <rect x="100" y="55" width="40" height="50" rx="4" className="fill-surface-card stroke-border-strong" />
                <text x="120" y="84" className="font-mono text-[9px] font-bold fill-ink-soft text-center" textAnchor="middle">G1</text>

                <rect x="220" y="30" width="40" height="40" rx="4" className="fill-surface-card stroke-border-strong" />
                <text x="240" y="54" className="font-mono text-[9px] font-bold fill-ink-soft text-center" textAnchor="middle">G2</text>

                <rect x="220" y="90" width="40" height="40" rx="4" className="fill-surface-card stroke-border-strong" />
                <text x="240" y="114" className="font-mono text-[9px] font-bold fill-ink-soft text-center" textAnchor="middle">G3</text>

                <rect x="340" y="55" width="40" height="40" rx="4" className="fill-surface-card stroke-border-strong" />
                <text x="360" y="79" className="font-mono text-[9px] font-bold fill-ink-soft text-center" textAnchor="middle">G4</text>

                <rect x="360" y="100" width="40" height="30" rx="4" className="fill-surface-card stroke-border-strong" />
                <text x="380" y="119" className="font-mono text-[9px] font-bold fill-ink-soft text-center" textAnchor="middle">G5</text>

                <text x="15" y="35" className="font-mono text-[9px] fill-slate font-bold">A</text>
                <text x="15" y="130" className="font-mono text-[9px] fill-slate font-bold">B</text>
                <text x="455" y="72" className="font-mono text-[9px] fill-slate font-bold">SUM</text>
                <text x="455" y="112" className="font-mono text-[9px] fill-slate font-bold">CARRY</text>
              </svg>
            </div>

            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-surface-card/10 backdrop-blur-[2px]">
              <a
                href="/editor/half-adder-2"
                className="inline-flex items-center justify-center rounded-xl border border-border-strong bg-surface-card px-5 py-2.5 text-xs font-semibold text-ink shadow-sm hover:border-ink-soft hover:shadow-md transition-all active:scale-[0.97]"
              >
                Try it Yourself!
              </a>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}