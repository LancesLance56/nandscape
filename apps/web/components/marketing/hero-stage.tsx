"use client";

import { useEffect, useMemo, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { SignalState } from "@nandscape/engine";
import { CircuitStage } from "@/components/content/blocks/circuit/circuit-stage";
import { GraphCanvas } from "@/components/content/blocks/interactive/graph/graph-canvas";
import { SortingBars } from "@/components/content/blocks/interactive/sorting/sorting-bars";
import { KMapGrid, type DrawnGroup } from "@/components/content/blocks/interactive/kmap/kmap-grid";
import { bfsSteps } from "@/lib/graph/algorithms";
import { mergeSortSteps } from "@/lib/sorting/algorithms";
import type { GraphSpec } from "@/lib/graph/types";
import type { EditorEdge, EditorNode } from "@/types/editor";
import { layoutFor, type CellValue } from "@/lib/kmap/kmap";
import { solveKMap } from "@/lib/kmap/solve";
import { ACCENT_PALETTE } from "@/lib/ui/accent-palette";

/**
 * The hero's stage: the site's own teaching canvases, arranged the way the
 * reference layout arranges its product fragments.
 *
 * Every piece is the real component the tutorials render, fed a small dataset,
 * rather than a bespoke hero illustration. The landing page cannot promise a
 * look the lessons do not deliver, because it is showing the lessons' own
 * renderers.
 *
 * The picks are the two things this project does that nothing else on a
 * "learn CS" page does: a gate-level circuit simulating live (it is called
 * Nandscape), and an algorithm animating frame by frame. The quieter margin
 * cards carry a graph traversal and a solved Karnaugh map so both halves of
 * the site - digital logic and DSA - are represented in each tier.
 */

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* -------------------------------------------------------------------------- */
/* Live circuit - XOR from four NANDs                                          */
/* -------------------------------------------------------------------------- */

/**
 * The canonical "everything is a NAND" construction, lifted straight from the
 * `xor-from-nand` project so the hero shows the exact circuit a reader can
 * open in the editor. `gateType: 0` is NAND.
 */
const HERO_XOR_NODES: EditorNode[] = [
  { id: "in_1", type: "io-input", position: { x: 40, y: 60 }, data: { kind: "input", name: "A", value: SignalState.LOW } },
  { id: "in_2", type: "io-input", position: { x: 40, y: 340 }, data: { kind: "input", name: "B", value: SignalState.LOW } },
  { id: "gate_3", type: "gate", position: { x: 240, y: 200 }, data: { kind: "gate", gateType: 0 } },
  { id: "gate_4", type: "gate", position: { x: 460, y: 60 }, data: { kind: "gate", gateType: 0 } },
  { id: "gate_5", type: "gate", position: { x: 460, y: 340 }, data: { kind: "gate", gateType: 0 } },
  { id: "gate_6", type: "gate", position: { x: 680, y: 200 }, data: { kind: "gate", gateType: 0 } },
  { id: "out_7", type: "io-output", position: { x: 880, y: 200 }, data: { kind: "output", name: "Y" } },
] as EditorNode[];

const HERO_XOR_EDGES: EditorEdge[] = [
  { id: "e1", source: "in_1", sourceHandle: "out-0", target: "gate_3", targetHandle: "in-0", type: "wire", data: {} },
  { id: "e2", source: "in_2", sourceHandle: "out-0", target: "gate_3", targetHandle: "in-1", type: "wire", data: {} },
  { id: "e3", source: "in_1", sourceHandle: "out-0", target: "gate_4", targetHandle: "in-0", type: "wire", data: {} },
  { id: "e4", source: "gate_3", sourceHandle: "out-0", target: "gate_4", targetHandle: "in-1", type: "wire", data: {} },
  { id: "e5", source: "in_2", sourceHandle: "out-0", target: "gate_5", targetHandle: "in-0", type: "wire", data: {} },
  { id: "e6", source: "gate_3", sourceHandle: "out-0", target: "gate_5", targetHandle: "in-1", type: "wire", data: {} },
  { id: "e7", source: "gate_4", sourceHandle: "out-0", target: "gate_6", targetHandle: "in-0", type: "wire", data: {} },
  { id: "e8", source: "gate_5", sourceHandle: "out-0", target: "gate_6", targetHandle: "in-1", type: "wire", data: {} },
  { id: "e9", source: "gate_6", sourceHandle: "out-0", target: "out_7", targetHandle: "in-0", type: "wire", data: {} },
] as EditorEdge[];

/** Walked in Gray-code order so exactly one input flips per step. */
const INPUT_COMBOS: [SignalState, SignalState][] = [
  [SignalState.LOW, SignalState.LOW],
  [SignalState.LOW, SignalState.HIGH],
  [SignalState.HIGH, SignalState.HIGH],
  [SignalState.HIGH, SignalState.LOW],
];

const CIRCUIT_FRAME_MS = 1600;

function HeroCircuit() {
  const [combo, setCombo] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = window.setInterval(() => setCombo((c) => (c + 1) % INPUT_COMBOS.length), CIRCUIT_FRAME_MS);
    return () => window.clearInterval(id);
  }, []);

  const [a, b] = INPUT_COMBOS[combo];
  const nodes = useMemo(
    () =>
      HERO_XOR_NODES.map((n) => {
        if (n.id === "in_1") return { ...n, data: { ...n.data, value: a } };
        if (n.id === "in_2") return { ...n, data: { ...n.data, value: b } };
        return n;
      }),
    [a, b],
  );

  return (
    <figure className="m-0 flex w-full max-w-[26rem] flex-col">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate">Logic circuit</p>
      <div className="h-[240px] overflow-hidden rounded-xl border border-border bg-surface-card/50">
        <ReactFlowProvider>
          <CircuitStage
            nodes={nodes}
            edges={HERO_XOR_EDGES}
            pannable={false}
            allowScrollZoom={false}
            fitPadding={0.32}
          />
        </ReactFlowProvider>
      </div>
      <figcaption className="mt-2 text-xs text-slate">
        XOR from NAND
      </figcaption>
    </figure>
  );
}

/* -------------------------------------------------------------------------- */
/* Sorting - merge sort, animated                                             */
/* -------------------------------------------------------------------------- */

const HERO_ARRAY = [24, 8, 41, 15, 32, 5, 19, 37, 11, 28, 3, 22];
const SORT_FRAME_MS = 280;

function HeroSorting() {
  const run = useMemo(() => mergeSortSteps(HERO_ARRAY), []);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = window.setInterval(() => setFrame((f) => (f + 1) % run.steps.length), SORT_FRAME_MS);
    return () => window.clearInterval(id);
  }, [run.steps.length]);

  const step = run.steps[Math.min(frame, run.steps.length - 1)];
  const maxValue = useMemo(() => Math.max(...HERO_ARRAY), []);

  return (
    <figure className="m-0 flex w-full max-w-[26rem] flex-col">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate">Sorting</p>
      {/* Same 240px box as the circuit canvas so the two demos sit level
          (SortingBars is border-box, so height includes its border/padding). */}
      <SortingBars step={step} maxValue={maxValue} height={240} compact />
      <figcaption className="mt-2 text-xs text-slate">
        Merge Sort
      </figcaption>
    </figure>
  );
}

/* -------------------------------------------------------------------------- */
/* Margin card - breadth-first search                                         */
/* -------------------------------------------------------------------------- */

/**
 * A deliberately asymmetric graph: a tight triangle on one side of the hub, a
 * three-hop chain on the other, a shorter pendant branch, and a diamond that
 * lets two paths rejoin at the same node - so BFS visibly explores unevenly
 * rather than drawing a neat expanding circle. Laid out by hand in the
 * canvas's own 440x260 space.
 */
const HERO_GRAPH: GraphSpec = {
  nodes: [
    { id: "H", x: 90, y: 130 },
    { id: "A", x: 50, y: 60 },
    { id: "B", x: 55, y: 205 },
    { id: "C", x: 195, y: 70 },
    { id: "D", x: 300, y: 45 },
    { id: "E", x: 400, y: 80 },
    { id: "F", x: 190, y: 195 },
    { id: "G", x: 300, y: 225 },
    { id: "I", x: 270, y: 130 },
  ],
  edges: [
    { from: "H", to: "A" },
    { from: "H", to: "B" },
    { from: "A", to: "B" },
    { from: "H", to: "C" },
    { from: "C", to: "D" },
    { from: "D", to: "E" },
    { from: "H", to: "F" },
    { from: "F", to: "G" },
    { from: "C", to: "I" },
    { from: "F", to: "I" },
  ],
};

const GRAPH_FRAME_MS = 850;

export function HeroGraphCard() {
  const [frame, setFrame] = useState(0);
  const steps = useMemo(() => bfsSteps(HERO_GRAPH, "H"), []);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = window.setInterval(() => setFrame((f) => (f + 1) % steps.length), GRAPH_FRAME_MS);
    return () => window.clearInterval(id);
  }, [steps.length]);

  const step = steps[Math.min(frame, steps.length - 1)];

  return (
    <div className="w-[17rem] rounded-2xl border border-border bg-surface-card/80 p-3 backdrop-blur-sm">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate">Graph traversal</p>
      <GraphCanvas graph={HERO_GRAPH} step={step} markedNode="H" height={170} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Margin card - solved Karnaugh map                                          */
/* -------------------------------------------------------------------------- */

const KMAP_VARS = ["A", "B", "C"];
/** Minterms 0,1,2,3,5,7, which the solver reduces to two overlapping groups. */
const KMAP_CELLS: CellValue[] = [1, 1, 1, 1, 0, 1, 0, 1];

export function HeroKMapCard() {
  const layout = useMemo(() => layoutFor(KMAP_VARS), []);
  const solution = useMemo(() => solveKMap(KMAP_CELLS, KMAP_VARS.length), []);

  const groups: DrawnGroup[] = solution.cover.map((implicant, i) => ({
    implicant,
    color: ACCENT_PALETTE[i % ACCENT_PALETTE.length],
  }));

  return (
    <div className="rounded-2xl border border-border bg-surface-card/80 p-3 backdrop-blur-sm">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate">Karnaugh map</p>
      <KMapGrid
        layout={layout}
        cells={KMAP_CELLS}
        groups={groups}
        size="sm"
        showIndices={false}
        ariaLabel="A solved three-variable Karnaugh map"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/** The two full-size canvases, side by side once there is room. */
export function HeroStage() {
  return (
    <div className="flex w-full flex-col items-center gap-10 lg:flex-row lg:items-start lg:justify-center lg:gap-14">
      <HeroCircuit />
      <HeroSorting />
    </div>
  );
}
