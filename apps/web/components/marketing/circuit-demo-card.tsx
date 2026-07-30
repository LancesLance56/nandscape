"use client";

import { useMemo, useState } from "react";
import { SignalState } from "@nandscape/engine";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { Led } from "@/components/ui/led";
import { DifficultyTag } from "@/components/puzzles/difficulty-tag";
import Link from "next/link";

const GATE_W = 44;
const GATE_H = 36;
const BUBBLE_R = 4;
const BUBBLE_GAP = 3;

const STROKE: Record<SignalState, string> = {
  [SignalState.HIGH]: "var(--signal-green)",
  [SignalState.LOW]: "var(--signal-coral)",
  [SignalState.FLOAT]: "var(--border-strong)",
  [SignalState.UNKNOWN]: "var(--signal-unknown)",
};

function sig(on: boolean): SignalState {
  return on ? SignalState.HIGH : SignalState.LOW;
}

interface NandGateProps {
  x: number;
  y: number;
}

/** Draws one NAND gate: an AND-shaped body + inversion bubble, same visual
 *  language as gate-shapes.tsx uses in the real editor. */
function NandGate({ x, y }: NandGateProps) {
  const straightW = GATE_W - GATE_H / 2;
  const body = `M0,0 L${straightW},0 A${GATE_H / 2},${GATE_H / 2} 0 0 1 ${straightW},${GATE_H} L0,${GATE_H} Z`;
  return (
    <g transform={`translate(${x},${y})`}>
      <path d={body} fill="var(--copper)" fillOpacity={0.85} stroke="var(--copper-dark)" strokeWidth={1.5} />
      <circle
        cx={straightW + BUBBLE_GAP + BUBBLE_R}
        cy={GATE_H / 2}
        r={BUBBLE_R}
        fill="var(--copper)"
        fillOpacity={0.85}
        stroke="var(--copper-dark)"
        strokeWidth={1.5}
      />
    </g>
  );
}

function Wire({ d, signal }: { d: string; signal: SignalState }) {
  const stroke = STROKE[signal];
  const high = signal === SignalState.HIGH;
  return (
    <path
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={high ? 2.25 : 1.5}
      strokeLinecap="round"
      style={
        high
          ? {
              strokeDasharray: "5 4",
              animation: "nandscape-wire-flow 0.6s linear infinite",
              filter: `drop-shadow(0 0 3px ${stroke})`,
            }
          : undefined
      }
    />
  );
}

export function CircuitDemoCard() {
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  const [peeking, setPeeking] = useState(false);

  const { n1, n2, n3, sum, carry } = useMemo(() => {
    const n1 = !(a && b);
    const n2 = !(a && n1);
    const n3 = !(b && n1);
    const sum = !(n2 && n3);
    const carry = !n1;
    return { n1, n2, n3, sum, carry };
  }, [a, b]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface-card shadow-[0_16px_40px_rgba(21,27,24,0.06)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)] max-w-lg w-full transition-all duration-300">
      <div className="flex items-center justify-between border-b border-border bg-surface-card px-6 py-4">
        <div>
          <span className="font-mono text-[11px] font-semibold tracking-wider uppercase text-slate">
            Puzzle · half-adder
          </span>
          <h3 className="mt-0.5 font-display text-lg font-bold text-ink">Half Adder, NAND-only</h3>
        </div>
        <DifficultyTag difficulty="medium" />
      </div>

      <div className="space-y-5 p-6">
        <p className="text-sm leading-relaxed text-ink-soft">
          Every gate on this board is a <span className="font-mono text-copper-dark dark:text-copper">NAND</span>.
          Flip A and B,  the whole circuit really recomputes, live, wire by wire.
        </p>

        <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2 p-4 shadow-inner">
          <div className="flex gap-8">
            <ToggleSwitch label="A" checked={a} onChange={setA} />
            <ToggleSwitch label="B" checked={b} onChange={setB} />
          </div>
          <div className="h-8 w-px bg-border-strong/40" />
          <div className="flex gap-6" aria-live="polite">
            <Led label="SUM" value={sum ? 1 : 0} />
            <Led label="CARRY" value={carry ? 1 : 0} />
          </div>
        </div>

        <div
          onMouseEnter={() => setPeeking(true)}
          onMouseLeave={() => setPeeking(false)}
          className="group relative overflow-hidden rounded-xl border border-dashed border-border-strong bg-[radial-gradient(var(--border-strong)_1px,transparent_1px)] bg-size-[18px_18px]"
        >
          <svg
            viewBox="0 0 460 260"
            className="h-56 w-full transition-[filter,opacity] duration-300"
            style={{ filter: peeking ? "blur(1.5px)" : "blur(6px)", opacity: peeking ? 0.95 : 0.75 }}
          >
            <Wire d="M20,46 L45,46 L45,99 L60,99" signal={sig(a)} />
            <Wire d="M20,46 L140,46 L140,49 L150,49" signal={sig(a)} />
            <Wire d="M20,174 L50,174 L50,117 L60,117" signal={sig(b)} />
            <Wire d="M20,174 L140,174 L140,159 L150,159" signal={sig(b)} />

            <Wire d="M92,108 L115,108 L115,67 L150,67" signal={sig(n1)} />
            <Wire d="M92,108 L120,108 L120,177 L150,177" signal={sig(n1)} />
            <Wire d="M92,108 L128,108 L128,199 L250,199" signal={sig(n1)} />
            <Wire d="M92,108 L133,108 L133,217 L250,217" signal={sig(n1)} />

            <Wire d="M182,58 L220,58 L220,104 L250,104" signal={sig(n2)} />
            <Wire d="M182,168 L220,168 L220,122 L250,122" signal={sig(n3)} />

            <Wire d="M282,113 L440,113" signal={sig(sum)} />
            <Wire d="M282,208 L440,208" signal={sig(carry)} />

            <NandGate x={60} y={90} />
            <NandGate x={150} y={40} />
            <NandGate x={150} y={150} />
            <NandGate x={250} y={95} />
            <NandGate x={250} y={190} />

            <text x="8" y="41" className="font-mono text-[10px] fill-slate font-bold">A</text>
            <text x="8" y="169" className="font-mono text-[10px] fill-slate font-bold">B</text>
            <text x="444" y="109" className="font-mono text-[10px] fill-slate font-bold">SUM</text>
            <text x="444" y="204" className="font-mono text-[10px] fill-slate font-bold">CARRY</text>
          </svg>

          <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-3">
            <span className="rounded-full border border-border-strong bg-surface-card/90 px-3 py-1 font-mono text-[10px] font-semibold text-ink-soft opacity-0 shadow-sm backdrop-blur transition-opacity duration-200 group-hover:opacity-100">
              hover to peek at the wiring
            </span>
          </div>
        </div>

        <Link
          href="/puzzles/half-adder"
          className="inline-flex w-full items-center justify-center rounded-xl bg-copper px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-copper-dark active:scale-[0.98]"
        >
          Wire it yourself →
        </Link>
      </div>
    </div>
  );
}
