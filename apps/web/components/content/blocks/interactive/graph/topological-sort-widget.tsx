"use client";

import { useMemo, useState } from "react";
import { topologicalSortSteps } from "@/lib/graph/algorithms";
import type { GraphSpec } from "@/lib/graph/types";
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
      // default font size, so every label here is pushed below its node
      // instead - see GraphSpecEditor's label handle for how an author
      // drags this by hand on a graph they are building themselves.
      nodes: [
        { id: "shirt", x: 70, y: 50, labelDy: 28 },
        { id: "trousers", x: 70, y: 130, labelDy: 28 },
        { id: "socks", x: 70, y: 210, labelDy: 28 },
        { id: "tie", x: 220, y: 40, labelDy: 28 },
        { id: "belt", x: 220, y: 130, labelDy: 28 },
        { id: "shoes", x: 220, y: 220, labelDy: 28 },
        { id: "jacket", x: 370, y: 40, labelDy: 28 },
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

/**
 * Kahn's algorithm, run on a graph you can build yourself.
 *
 * The one thing worth showing that a static trace cannot is the failure
 * case: build a cycle and the queue runs dry with nodes left over, which is
 * the entire cycle check, made visible instead of asserted. Stuck nodes get
 * the same shaded-outline treatment the SCC widget uses for a closed
 * component, since "this group cannot be ordered" is the same kind of fact.
 */
export function TopologicalSortWidget({
  data,
  frame = true,
}: {
  data: Record<string, unknown>;
  frame?: boolean;
}) {
  const examples = useMemo(() => resolveExamples(data), [data]);
  const [exampleId, setExampleId] = useState(
    typeof data.example === "string" && examples.some((e) => e.id === data.example) ? data.example : examples[0].id,
  );
  const graph = (examples.find((e) => e.id === exampleId) ?? examples[0]).graph;
  const steps = useMemo(() => topologicalSortSteps(graph), [graph]);

  const lastStep = steps[steps.length - 1];
  const stuck = lastStep?.groups?.[0] ?? [];

  return (
    <AlgorithmRunner
      graph={graph}
      steps={steps}
      frame={frame}
      className={data.className as string}
      examples={examples.length > 1 ? examples.map(({ id, label }) => ({ id, label })) : undefined}
      activeExample={exampleId}
      onExampleChange={setExampleId}
      groupHulls
      groupLabel="Stuck"
      hint="Emitted nodes turn green. If the queue runs dry early, whatever is left over gets a shaded outline: it sits inside a cycle, or depends on one."
      panel={(step) => (
        <>
          <PanelBox title="Ready queue">
            <ChipRow items={step.frontier} emptyLabel="empty" />
          </PanelBox>

          <PanelBox title="Output order so far">
            <ChipRow items={step.visited} emptyLabel="nothing emitted yet" tone="muted" />
          </PanelBox>

          <PanelBox title="In-degree (things still blocking it)">
            <div className="flex flex-col gap-1">
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
      )}
    />
  );
}
