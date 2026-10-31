"use client";

import { useMemo, useState } from "react";
import { topologicalSortDfsSteps, topologicalSortSteps } from "@/lib/graph/algorithms";
import type { GraphSpec } from "@/lib/graph/types";
import { cn } from "@/lib/cn";
import { StatReadout } from "../shared/widget-ui";
import { AlgorithmRunner, ChipRow, PanelBox } from "./algorithm-runner";

const EXAMPLES: { id: string; label: string; graph: GraphSpec }[] = [
  {
    // The exact dependency graph this widget's tutorial walks through by
    // hand first: shirt before tie, shirt before belt, trousers before
    // belt, trousers before shoes, socks before shoes, tie before jacket.
    id: "clothes",
    label: "Getting dressed",
    graph: {
      directed: true,
      // Word-length ids like "trousers" do not fit inside a 34px dot at the
      // default 13px, so every label here is set small enough to stay inside
      // its node rather than hanging below it.
      nodes: [
        { id: "shirt", x: 70, y: 50, labelSize: 8 },
        { id: "trousers", x: 70, y: 130, labelSize: 8 },
        { id: "socks", x: 70, y: 210, labelSize: 8 },
        { id: "tie", x: 220, y: 40, labelSize: 8 },
        { id: "belt", x: 220, y: 130, labelSize: 8 },
        { id: "shoes", x: 220, y: 220, labelSize: 8 },
        { id: "jacket", x: 370, y: 40, labelSize: 8 },
      ],
      edges: [
        { from: "shirt", to: "tie" },
        { from: "shirt", to: "belt" },
        { from: "trousers", to: "belt" },
        { from: "trousers", to: "shoes" },
        { from: "socks", to: "shoes" },
        { from: "tie", to: "jacket" },
      ],
    },
  },
  {
    // A -> B -> C -> A is a genuine cycle; C -> D and E -> A hang a node
    // off each end of it, so the run shows both "stuck because it's on the
    // cycle" (A, B, C) and "stuck because it depends on one" (D) at once,
    // alongside a node that finishes fine (E).
    id: "circular",
    label: "Circular dependency",
    graph: {
      directed: true,
      nodes: [
        { id: "A", x: 150, y: 70 },
        { id: "B", x: 300, y: 70 },
        { id: "C", x: 225, y: 190 },
        { id: "D", x: 375, y: 190 },
        { id: "E", x: 60, y: 190 },
      ],
      edges: [
        { from: "A", to: "B" },
        { from: "B", to: "C" },
        { from: "C", to: "A" },
        { from: "C", to: "D" },
        { from: "E", to: "A" },
      ],
    },
  },
];

/** An author-supplied `data.graph` replaces the built-ins entirely, same as the other graph widgets. */
function resolveExamples(data: Record<string, unknown>): typeof EXAMPLES {
  const g = data.graph;
  if (typeof g !== "object" || g === null) return EXAMPLES;
  const spec = g as Partial<GraphSpec>;
  if (!Array.isArray(spec.nodes) || !Array.isArray(spec.edges) || spec.nodes.length === 0) return EXAMPLES;
  return [{ id: "custom", label: "Custom", graph: { ...spec, directed: true } as GraphSpec }];
}

export type TopoMode = "kahn" | "dfs";

/* -------------------------------------------------------------------------- */
/* The lists: a queue, a stack, an output order                               */
/* -------------------------------------------------------------------------- */

type ListTone = "waiting" | "done";

const CHIP_TONE: Record<ListTone, string> = {
  // The same colours the canvas gives these nodes, so a chip and its dot read
  // as one thing.
  waiting: "bg-copper-bg text-copper-dark",
  done: "bg-signal-green text-white",
};

/**
 * How a list reads. A stack is drawn top first and grows from the bottom; a
 * queue is drawn front first; an output list is simply in order. The marked
 * end is the one the algorithm takes from next.
 */
type ListKind = "stack" | "queue" | "order";

/** One list as a row of chips, for the panels beside the canvas. */
function ListChips({ items, tone, kind }: { items: string[]; tone: ListTone; kind: ListKind }) {
  // The end the algorithm takes from next gets a ring: a stack's top is its
  // last item, a queue's front its first.
  const next = kind === "stack" ? items.length - 1 : kind === "queue" ? 0 : -1;
  return (
    <span className="flex min-h-7 flex-wrap items-center gap-1 text-xs text-slate">
      {items.length === 0 ? (
        <span className="italic">empty</span>
      ) : (
          items.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className={cn(
                "inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md px-1.5 font-bold",
                CHIP_TONE[tone],
                i === next && "ring-2 ring-ink/25",
              )}
            >
              {item}
            </span>
          ))
      )}
    </span>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Topological sort two ways, on one graph: Kahn's algorithm and DFS finish
 * order, switched like BFS/DFS in the traversal widget. `data.mode` picks
 * which one opens.
 *
 * Both modes put the same two lists in front of the reader, because the lists
 * are the algorithm: Kahn's ready queue and its output, DFS's call stack and
 * its finished stack. The canvas colours line up with the chips: waiting
 * nodes are shaded, done ones green.
 *
 * The failure case is the other thing worth showing that a static trace
 * cannot. Kahn's runs dry with nodes left over; DFS meets an edge pointing
 * back into its call stack. Either way the offending nodes get the same
 * shaded-outline treatment the SCC widget uses for a closed component.
 */
export function TopologicalSortWidget({
  data,
  frame = true,
}: {
  data: Record<string, unknown>;
  frame?: boolean;
}) {
  const examples = useMemo(() => resolveExamples(data), [data]);
  const [mode, setMode] = useState<TopoMode>(data.mode === "dfs" ? "dfs" : "kahn");
  const [exampleId, setExampleId] = useState(
    typeof data.example === "string" && examples.some((e) => e.id === data.example) ? data.example : examples[0].id,
  );
  const graph = (examples.find((e) => e.id === exampleId) ?? examples[0]).graph;
  const steps = useMemo(
    () => (mode === "dfs" ? topologicalSortDfsSteps(graph) : topologicalSortSteps(graph)),
    [graph, mode],
  );
  const isDfs = mode === "dfs";

  const lastStep = steps[steps.length - 1];
  const stuck = lastStep?.groups?.[0] ?? [];

  return (
    <AlgorithmRunner
      title={isDfs ? "Topological sort (DFS)" : "Topological sort (Kahn's algorithm)"}
      modes={[
        { id: "kahn", label: "Kahn's", sub: "in-degree" },
        { id: "dfs", label: "DFS", sub: "finish order" },
      ]}
      activeMode={mode}
      onModeChange={(id) => setMode(id === "dfs" ? "dfs" : "kahn")}
      readout={(step) => (
        <StatReadout
          stats={[{ label: isDfs ? "finished" : "emitted", value: `${step.visited.length} / ${graph.nodes.length}`, tone: "good" }]}
        />
      )}
      graph={graph}
      steps={steps}
      frame={frame}
      className={data.className as string}
      examples={examples.length > 1 ? examples.map(({ id, label }) => ({ id, label })) : undefined}
      activeExample={exampleId}
      onExampleChange={setExampleId}
      groupHulls
      groupLabel={isDfs ? "Cycle" : "Stuck"}
      hint={
        isDfs
          ? "Nodes on the call stack are shaded, finished nodes turn green. An edge back into the call stack is a cycle, and gets a shaded outline."
          : "Emitted nodes turn green. If the queue runs dry early, whatever is left over gets a shaded outline: it sits inside a cycle, or depends on one."
      }
      panel={(step) =>
        isDfs ? (
          <>
            <PanelBox title="Call stack" aside="top is last">
              <ListChips items={step.frontier} tone="waiting" kind="stack" />
            </PanelBox>
            <PanelBox title="Topological order" aside="finished, read from the top">
              <ChipRow items={[...step.visited].reverse()} emptyLabel="nothing finished yet" tone="muted" reserveRows={2} />
            </PanelBox>
          </>
        ) : (
          <>
          <PanelBox title="Ready queue" aside="in-degree 0">
            <ListChips items={step.frontier} tone="waiting" kind="queue" />
          </PanelBox>
          <PanelBox title="Emitted, in order">
            <ListChips items={step.visited} tone="done" kind="order" />
          </PanelBox>
          <PanelBox title="In-degree" aside="still blocking it">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {graph.nodes.map((n) => {
                const emitted = step.visited.includes(n.id);
                const isStuck = step === lastStep && stuck.includes(n.id);
                return (
                  <div key={n.id} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-ink">{n.id}</span>
                    <span
                      className={
                        emitted
                          ? "font-bold text-signal-green-strong"
                          : isStuck
                            ? "font-bold text-signal-coral"
                            : "text-ink-soft"
                      }
                    >
                      {emitted ? "emitted" : (step.table?.[n.id] ?? "0")}
                    </span>
                  </div>
                );
              })}
            </div>
          </PanelBox>
          </>
        )
      }
    />
  );
}
