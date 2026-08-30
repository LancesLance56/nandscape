"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { GateType } from "@nandscape/engine";
import { CircuitBuilder } from "@/lib/editor/circuit-builder";
import { CircuitStage } from "@/components/content/blocks/circuit/circuit-stage";
import { NumberBaseExplorerWidget } from "@/components/content/blocks/interactive/number-base-explorer-widget";
import { GraphCanvas } from "@/components/content/blocks/interactive/graph/graph-canvas";
import { bfsSteps } from "@/lib/graph/algorithms";
import type { GraphSpec } from "@/lib/graph/types";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

// Shared node layout so switching graph "kind" morphs the same five dots
// instead of teleporting the whole picture - same trick as
// graph-explorer-widget.tsx's PRESETS, kept local here since this slide only
// needs a handful of the full widget's kinds, none of its side panels.
const GRAPH_TYPE_POSITIONS = {
  A: { id: "A", x: 90, y: 60 },
  B: { id: "B", x: 220, y: 40 },
  C: { id: "C", x: 350, y: 70 },
  D: { id: "D", x: 140, y: 190 },
  E: { id: "E", x: 300, y: 195 },
};

const GRAPH_TYPE_PRESETS: { id: string; label: string; graph: GraphSpec }[] = [
  {
    id: "undirected",
    label: "Undirected",
    graph: {
      nodes: Object.values(GRAPH_TYPE_POSITIONS),
      edges: [
        { from: "A", to: "B" },
        { from: "B", to: "C" },
        { from: "A", to: "D" },
        { from: "D", to: "E" },
        { from: "B", to: "E" },
        { from: "C", to: "E" },
      ],
    },
  },
  {
    id: "directed",
    label: "Directed",
    graph: {
      directed: true,
      nodes: Object.values(GRAPH_TYPE_POSITIONS),
      edges: [
        { from: "A", to: "B" },
        { from: "B", to: "C" },
        { from: "A", to: "D" },
        { from: "D", to: "E" },
        { from: "B", to: "E" },
        { from: "E", to: "D" },
      ],
    },
  },
  {
    id: "weighted",
    label: "Weighted",
    graph: {
      weighted: true,
      nodes: Object.values(GRAPH_TYPE_POSITIONS),
      edges: [
        { from: "A", to: "B", weight: 4 },
        { from: "B", to: "C", weight: 3 },
        { from: "A", to: "D", weight: 1 },
        { from: "D", to: "E", weight: 7 },
        { from: "B", to: "E", weight: 2 },
        { from: "C", to: "E", weight: 5 },
      ],
    },
  },
  {
    id: "tree",
    label: "Tree",
    graph: {
      nodes: Object.values(GRAPH_TYPE_POSITIONS),
      edges: [
        { from: "A", to: "B" },
        { from: "A", to: "D" },
        { from: "B", to: "C" },
        { from: "D", to: "E" },
      ],
    },
  },
];

/** Compact, controls-free cousin of GraphExplorerWidget: just the type
 *  toggle and the canvas, sized to sit inside the carousel slide. */
function HeroGraphTypesSlide() {
  const [active, setActive] = useState(0);
  const preset = GRAPH_TYPE_PRESETS[active];

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex flex-wrap justify-center gap-1.5">
        {GRAPH_TYPE_PRESETS.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActive(i)}
            aria-pressed={i === active}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              i === active ? "bg-copper text-white" : "bg-surface-2 text-ink-soft hover:text-ink",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <GraphCanvas graph={preset.graph} />
    </div>
  );
}

const TRAVERSAL_GRAPH: GraphSpec = {
  nodes: [
    { id: "A", x: 70, y: 130 },
    { id: "B", x: 165, y: 55 },
    { id: "C", x: 165, y: 205 },
    { id: "D", x: 275, y: 45 },
    { id: "E", x: 275, y: 140 },
    { id: "F", x: 275, y: 225 },
    { id: "G", x: 385, y: 130 },
  ],
  edges: [
    { from: "A", to: "B" },
    { from: "A", to: "C" },
    { from: "B", to: "D" },
    { from: "B", to: "E" },
    { from: "C", to: "E" },
    { from: "C", to: "F" },
    { from: "D", to: "G" },
    { from: "E", to: "G" },
    { from: "F", to: "G" },
  ],
};
const TRAVERSAL_STEP_MS = 900;

/** Auto-playing BFS on a loop, no transport UI - click a node to restart the
 *  traversal from there, mirroring the "click a bit to flip it" interaction
 *  the other slides already use. */
function HeroGraphTraversalSlide() {
  const [start, setStart] = useState("A");
  const steps = useMemo(() => bfsSteps(TRAVERSAL_GRAPH, start), [start]);
  const [index, setIndex] = useState(0);

  // Clicking a node changes both the source and the step list together, so
  // there's no separate effect needed to notice steps changed and rewind -
  // rewinding here keeps it one state update instead of two renders.
  const handleNodeClick = (id: string) => {
    setStart(id);
    setIndex(0);
  };

  useEffect(() => {
    if (steps.length <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = window.setInterval(() => {
      setIndex((i) => (i + 1 < steps.length ? i + 1 : 0));
    }, TRAVERSAL_STEP_MS);

    return () => window.clearInterval(id);
  }, [steps]);

  const step = steps[Math.min(index, steps.length - 1)];

  return <GraphCanvas graph={TRAVERSAL_GRAPH} step={step} onNodeClick={handleNodeClick} markedNode={start} />;
}

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
    id: "graph-types",
    tab: "Graph types",
    caption: "Undirected, directed, weighted, or a tree, same nodes, different rules.",
    href: "/tutorials/graph-what-is-a-graph",
    linkLabel: "Learn graph theory →",
    render: () => <HeroGraphTypesSlide />,
  },
  {
    id: "graph-traversal",
    tab: "Graph traversal",
    caption: "Click any node to watch BFS explore the graph from there.",
    href: "/tutorials/graph-bfs-dfs",
    linkLabel: "Learn BFS & DFS →",
    render: () => <HeroGraphTraversalSlide />,
  },
];

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
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Next"
          onClick={() => goTo(active + 1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-card text-ink-soft shadow-sm transition-colors hover:text-ink"
        >
          <ChevronRight className="h-4 w-4" />
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
