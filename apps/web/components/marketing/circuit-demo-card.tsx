"use client";

import Link from "next/link";
import { ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { GateType } from "@nandscape/engine";
import { CircuitBuilder } from "@/lib/editor/circuit-builder";
import { CircuitStage } from "@/components/content/blocks/circuit/circuit-stage";
import { DifficultyTag } from "@/components/puzzles/difficulty-tag";

/**
 * NAND-only half adder: n1 = NAND(a,b), n2 = NAND(a,n1), n3 = NAND(b,n1),
 * sum = NAND(n2,n3), carry = NAND(n1,n1) (tying both inputs together makes
 * a NAND act as a NOT),  so every gate on the board really is a NAND, which
 * is the whole point of the card below.
 */
function buildNandHalfAdder() {
  const b = new CircuitBuilder();
  const inA = b.input("A", 40, 40, { id: "hero_demo_in_a" });
  const inB = b.input("B", 40, 220, { id: "hero_demo_in_b" });
  const n1 = b.gate(GateType.NAND, 240, 120, { id: "hero_demo_n1" });
  const n2 = b.gate(GateType.NAND, 440, 40, { id: "hero_demo_n2" });
  const n3 = b.gate(GateType.NAND, 440, 220, { id: "hero_demo_n3" });
  const sum = b.gate(GateType.NAND, 640, 120, { id: "hero_demo_sum_gate" });
  const carry = b.gate(GateType.NAND, 440, 380, { id: "hero_demo_carry_gate" });
  const sumOut = b.output("SUM", 840, 120, { id: "hero_demo_sum" });
  const carryOut = b.output("CARRY", 840, 380, { id: "hero_demo_carry" });

  b.connect(inA.out(0), n1.in(0));
  b.connect(inB.out(0), n1.in(1));
  b.connect(inA.out(0), n2.in(0));
  b.connect(n1.out(0), n2.in(1));
  b.connect(inB.out(0), n3.in(0));
  b.connect(n1.out(0), n3.in(1));
  b.connect(n2.out(0), sum.in(0));
  b.connect(n3.out(0), sum.in(1));
  b.connect(n1.out(0), carry.in(0));
  b.connect(n1.out(0), carry.in(1));
  b.connect(sum.out(0), sumOut.in(0));
  b.connect(carry.out(0), carryOut.in(0));

  return b.build();
}

// Built once at module scope,  CircuitStage resets its live state whenever
// the nodes/edges array reference changes, so this must stay stable across renders.
const { nodes: demoNodes, edges: demoEdges } = buildNandHalfAdder();

export function CircuitDemoCard() {
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
          Add two bits using nothing but{" "}
          <span className="font-mono text-copper-dark dark:text-copper">NAND</span>, producing SUM and CARRY.
        </p>

        <div style={{ height: 240 }} className="relative overflow-hidden rounded-xl">
          <ReactFlowProvider>
            <CircuitStage
              nodes={demoNodes}
              edges={demoEdges}
              pannable={false}
              showBackground={false}
              fitPadding={0.05}
            />
          </ReactFlowProvider>
        </div>

        <Link
          href="/puzzles/half-adder"
          className="rounded-xl bg-copper px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-copper-dark active:scale-[0.98]"
        >
          Wire it yourself →
        </Link>
      </div>
    </div>
  );
}
