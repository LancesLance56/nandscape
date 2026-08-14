"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { GateType } from "@nandscape/engine";
import { CircuitBuilder } from "@/lib/editor/circuit-builder";
import { CircuitStage } from "@/components/content/blocks/circuit/circuit-stage";
import { NumberBaseExplorerWidget } from "@/components/content/blocks/interactive/number-base-explorer-widget";
import { TwosComplementWidget } from "@/components/content/blocks/interactive/twos-complement-widget";
import { StateMachineWidget } from "@/components/content/blocks/interactive/state-machine-widget";
import { Card } from "@/components/ui/card";

const AUTO_ADVANCE_MS = 7000;
const SLIDE_HEIGHT = 340;

function buildHalfAdder() {
  const b = new CircuitBuilder();
  const inA = b.input("A", 40, 60, { id: "hero_demo_in_a" });
  const inB = b.input("B", 40, 260, { id: "hero_demo_in_b" });
  const xor = b.gate(GateType.XOR, 320, 60, { id: "hero_demo_xor" });
  const and = b.gate(GateType.AND, 320, 260, { id: "hero_demo_and" });
  const sumOut = b.output("SUM", 600, 60, { id: "hero_demo_sum" });
  const carryOut = b.output("CARRY", 600, 260, { id: "hero_demo_carry" });

  b.connect(inA.out(0), xor.in(0));
  b.connect(inB.out(0), xor.in(1));
  b.connect(inA.out(0), and.in(0));
  b.connect(inB.out(0), and.in(1));
  b.connect(xor.out(0), sumOut.in(0));
  b.connect(and.out(0), carryOut.in(0));

  return b.build();
}

const { nodes: demoNodes, edges: demoEdges } = buildHalfAdder();

interface ShowcaseItem {
  id: string;
  tab: string;
  caption: string;
  href?: string;
  linkLabel?: string;
  render: () => ReactNode;
}

const ITEMS: ShowcaseItem[] = [
  {
    id: "circuit",
    tab: "Circuit editor",
    caption: "A half adder, SUM and CARRY updating live as you click A and B.",
    href: "/puzzles/half-adder",
    linkLabel: "Try this puzzle →",
    render: () => (
      <div style={{ height: SLIDE_HEIGHT }} className="w-full">
        <ReactFlowProvider>
          <CircuitStage
            nodes={demoNodes}
            edges={demoEdges}
            pannable={false}
            fitPadding={0.15}
            showBackground={false}
          />
        </ReactFlowProvider>
      </div>
    ),
  },
  {
    id: "number-base",
    tab: "Number bases",
    caption: "Click a bit to flip it, watch binary, decimal, and hex move together.",
    href: "/tutorials",
    linkLabel: "Learn number bases →",
    render: () => <NumberBaseExplorerWidget data={{}} frame={false} />,
  },
  {
    id: "twos-complement",
    tab: "Two's complement",
    caption: "Flip bits or hit Negate to see how signed numbers actually work.",
    href: "/tutorials",
    linkLabel: "Learn two's complement →",
    render: () => <TwosComplementWidget data={{}} frame={false} />,
  },
  {
    id: "state-machine",
    tab: "State machines",
    caption: "A turnstile: insert a coin or push, and watch the state change.",
    href: "/tutorials",
    linkLabel: "Learn state machines →",
    render: () => <StateMachineWidget data={{}} frame={false} />,
  },
];

function ArrowIcon({ direction }: { direction: "prev" | "next" }) {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d={direction === "prev" ? "M10 3.5L5 8l5 4.5" : "M6 3.5l5 4.5-5 4.5"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HeroShowcase() {
  const [active, setActive] = useState(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = window.setInterval(() => {
      if (pausedRef.current) return;
      setActive((prev) => (prev + 1) % ITEMS.length);
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(id);
  }, []);

  const goTo = (i: number) => setActive((i + ITEMS.length) % ITEMS.length);
  const item = ITEMS[active];

  return (
    <div
      className="w-full max-w-xl"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
      onFocus={() => { pausedRef.current = true; }}
      onBlur={() => { pausedRef.current = false; }}
    >
      <div className="relative">
        <Card className="overflow-hidden p-4">
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${active * 100}%)` }}
            >
              {ITEMS.map((it) => (
                <div
                  key={it.id}
                  style={{ minHeight: SLIDE_HEIGHT }}
                  className="flex w-full shrink-0 items-center justify-center"
                >
                  {it.render()}
                </div>
              ))}
            </div>
          </div>
        </Card>

        <button
          type="button"
          aria-label="Previous"
          onClick={() => goTo(active - 1)}
          className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-card text-ink-soft shadow-sm transition-colors hover:text-ink"
        >
          <ArrowIcon direction="prev" />
        </button>
        <button
          type="button"
          aria-label="Next"
          onClick={() => goTo(active + 1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-card text-ink-soft shadow-sm transition-colors hover:text-ink"
        >
          <ArrowIcon direction="next" />
        </button>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2" role="tablist" aria-label="Interactive elements">
        {ITEMS.map((it, i) => (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-label={it.tab}
            onClick={() => goTo(i)}
            className={`h-2 rounded-full transition-all ${
              i === active ? "w-6 bg-copper" : "w-2 bg-border-strong hover:bg-slate"
            }`}
          />
        ))}
      </div>

      <div className="mt-3 flex min-h-[1.5rem] items-center justify-between gap-4">
        <span className="text-sm text-ink-soft">{item.caption}</span>
        {item.href && item.linkLabel && (
          <Link
            href={item.href}
            className="shrink-0 text-sm font-semibold text-copper-dark transition-colors hover:text-copper"
          >
            {item.linkLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
