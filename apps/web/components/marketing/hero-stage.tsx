"use client";

import { useEffect, useMemo, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { FlowchartCanvas } from "@/components/content/blocks/interactive/flowchart/flowchart-canvas";
import { GraphCanvas } from "@/components/content/blocks/interactive/graph/graph-canvas";
import { KMapGrid, type DrawnGroup } from "@/components/content/blocks/interactive/kmap/kmap-grid";
import { bfsSteps } from "@/lib/graph/algorithms";
import type { GraphSpec } from "@/lib/graph/types";
import type { FlowchartSpec } from "@/lib/flowchart/types";
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
 */

/* -------------------------------------------------------------------------- */
/* Breadth-first search                                                       */
/* -------------------------------------------------------------------------- */

/**
 * A deliberately asymmetric graph: a tight triangle on one side of the hub, a
 * three-hop chain on the other, a shorter pendant branch, and a diamond that
 * lets two paths rejoin at the same node.
 *
 * A symmetric layout is the wrong demo, because it makes every branch look
 * interchangeable and the frontier just draws a neat circle no matter where
 * you start it. Irregular branch lengths mean BFS visibly explores unevenly,
 * some neighbors settle in one hop, others in three, and the diamond gives it
 * a real merge point to reach from two directions at once. Laid out by hand
 * in the canvas's own 440x260 space.
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

const FRAME_MS = 850;

function HeroGraph() {
  const [start, setStart] = useState("H");
  const [frame, setFrame] = useState(0);

  const steps = useMemo(() => bfsSteps(HERO_GRAPH, start), [start]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = window.setInterval(() => {
      // Looping rather than stopping: a still frame at the end would read as a
      // screenshot, which is the one thing this section exists to disprove.
      setFrame((f) => (f + 1) % steps.length);
    }, FRAME_MS);

    return () => window.clearInterval(id);
  }, [steps.length]);

  const step = steps[Math.min(frame, steps.length - 1)];

  return (
    <figure className="m-0 w-full max-w-[28rem]">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate">Graph traversal</p>
      <GraphCanvas
        graph={HERO_GRAPH}
        step={step}
        markedNode={start}
        onNodeClick={(id) => {
          setStart(id);
          setFrame(0);
        }}
      />
      <figcaption className="mt-2 text-xs text-slate">
        Breadth-first search, running. Click any node to start it from there.
      </figcaption>
    </figure>
  );
}

/* -------------------------------------------------------------------------- */
/* Flowchart                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Bubble sort's inner loop, small enough to take in at a glance.
 *
 * A real chart from the tutorials runs twenty nodes deep and would be
 * illegible here, so this is a purpose-cut spec fed to the same renderer.
 */
const HERO_CHART: FlowchartSpec = {
  nodes: [
    { id: "s", type: "start", text: "Start", note: "One pass over the list." },
    { id: "d", type: "decision", text: "a > b ?", note: "The only comparison the whole sort makes." },
    { id: "p", type: "process", text: "Swap them", note: "Then check the same pair's neighbours again." },
    { id: "e", type: "end", text: "Sorted", note: "No swaps left to make, so the list is in order." },
  ],
  edges: [
    { from: "s", to: "d" },
    { from: "d", to: "p", label: "yes" },
    { from: "p", to: "d" },
    { from: "d", to: "e", label: "no" },
  ],
};

/**
 * Panning, zooming and dragging are all off here. The chart is a sample of
 * what the tutorials render, not something to operate, and a hero element
 * that eats scroll gestures on a phone is actively hostile.
 */
const HERO_FLOW_INTERACTIVE = {
  notes: true,
  walkthrough: false,
  focus: false,
  draggable: false,
  zoom: false,
  minimap: false,
  search: false,
  fullscreen: false,
  download: false,
  legend: false,
} as const;

function HeroFlowchart() {
  const [selected, setSelected] = useState<string | null>("d");
  const note = HERO_CHART.nodes.find((n) => n.id === selected)?.note;

  return (
    <figure className="m-0 flex w-full max-w-[22rem] flex-col">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate">Flowchart</p>
      <ReactFlowProvider>
        <FlowchartCanvas
          spec={HERO_CHART}
          interactive={HERO_FLOW_INTERACTIVE}
          height={260}
          selectedId={selected}
          onSelectNode={setSelected}
          // The chart is the object on display here, so the tutorial column's
          // frame and tint come off and the canvas sits directly on the hero.
          className="border-0 bg-transparent"
        />
      </ReactFlowProvider>
      <figcaption className="mt-2 min-h-[2.5rem] text-xs text-slate">
        {note ?? "Click a box to see what it is for."}
      </figcaption>
    </figure>
  );
}

/* -------------------------------------------------------------------------- */
/* Margin cards                                                               */
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

/** A binary tree, drawn by the graph canvas, for the opposite margin. */
const HERO_TREE: GraphSpec = {
  nodes: [
    { id: "1", x: 220, y: 40 },
    { id: "2", x: 110, y: 140 },
    { id: "3", x: 330, y: 140 },
    { id: "4", x: 50, y: 235 },
    { id: "5", x: 170, y: 235 },
    { id: "6", x: 330, y: 235 },
  ],
  edges: [
    { from: "1", to: "2" },
    { from: "1", to: "3" },
    { from: "2", to: "4" },
    { from: "2", to: "5" },
    { from: "3", to: "6" },
  ],
};

export function HeroTreeCard() {
  return (
    <div className="w-[15rem] rounded-2xl border border-border bg-surface-card/80 p-3 backdrop-blur-sm">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate">Trees are graphs</p>
      <GraphCanvas graph={HERO_TREE} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/** The two full-size canvases, side by side once there is room. */
export function HeroStage() {
  return (
    <div className="flex w-full flex-col items-center gap-10 lg:flex-row lg:items-start lg:justify-center lg:gap-14">
      <HeroGraph />
      <HeroFlowchart />
    </div>
  );
}
