"use client";

import { useMemo, useState } from "react";
import { dijkstraSteps } from "@/lib/graph/algorithms";
import type { GraphSpec } from "@/lib/graph/types";
import { AlgorithmRunner, PanelBox } from "./algorithm-runner";

const EXAMPLES: { id: string; label: string; graph: GraphSpec }[] = [
  {
    id: "mesh",
    label: "Mesh",
    graph: {
      weighted: true,
      nodes: [
        { id: "A", x: 65, y: 130 },
        { id: "B", x: 175, y: 50 },
        { id: "C", x: 175, y: 210 },
        { id: "D", x: 295, y: 50 },
        { id: "E", x: 295, y: 210 },
        { id: "F", x: 395, y: 130 },
      ],
      edges: [
        { from: "A", to: "B", weight: 4 },
        { from: "A", to: "C", weight: 2 },
        { from: "B", to: "C", weight: 1 },
        { from: "B", to: "D", weight: 5 },
        { from: "C", to: "D", weight: 8 },
        { from: "C", to: "E", weight: 10 },
        { from: "D", to: "E", weight: 2 },
        { from: "D", to: "F", weight: 6 },
        { from: "E", to: "F", weight: 3 },
      ],
    },
  },
  {
    // The direct A-B edge costs 10; the three-hop detour costs 3. Makes the
    // point that "fewest hops" and "cheapest" are genuinely different
    // questions, and shows two large improvements rather than one small one.
    id: "detour",
    label: "The long way is cheaper",
    graph: {
      weighted: true,
      nodes: [
        { id: "A", x: 60, y: 120 },
        { id: "B", x: 285, y: 55 },
        { id: "C", x: 155, y: 210 },
        { id: "D", x: 265, y: 210 },
        { id: "E", x: 390, y: 130 },
      ],
      edges: [
        { from: "A", to: "B", weight: 10 },
        { from: "A", to: "C", weight: 1 },
        { from: "C", to: "D", weight: 1 },
        { from: "D", to: "B", weight: 1 },
        { from: "B", to: "E", weight: 2 },
        { from: "C", to: "E", weight: 20 },
      ],
    },
  },
];

function resolveExamples(data: Record<string, unknown>): typeof EXAMPLES {
  const g = data.graph;
  if (typeof g !== "object" || g === null) return EXAMPLES;
  const spec = g as Partial<GraphSpec>;
  if (!Array.isArray(spec.nodes) || !Array.isArray(spec.edges) || spec.nodes.length === 0) return EXAMPLES;
  return [{ id: "custom", label: "Custom", graph: { weighted: true, ...spec } as GraphSpec }];
}

/**
 * Dijkstra with the distance table visible the whole time. The number above
 * each node is its current best-known cost, and watching those numbers drop
 * from infinity is the part that makes "relaxing an edge" stop sounding like
 * jargon.
 */
export function ShortestPathWidget({
  data,
  frame = true,
}: {
  data: Record<string, unknown>;
  frame?: boolean;
}) {
  const examples = useMemo(() => resolveExamples(data), [data]);
  const [exampleId, setExampleId] = useState(examples[0].id);
  const example = examples.find((e) => e.id === exampleId) ?? examples[0];
  const graph = example.graph;

  const [start, setStart] = useState<string>(
    typeof data.start === "string" ? data.start : graph.nodes[0]?.id ?? "A",
  );

  const changeExample = (id: string) => {
    const next = examples.find((e) => e.id === id);
    if (!next) return;
    setExampleId(id);
    setStart(next.graph.nodes[0]?.id ?? "A");
  };

  const steps = useMemo(() => dijkstraSteps(graph, start), [graph, start]);

  return (
    <AlgorithmRunner
      graph={graph}
      steps={steps}
      frame={frame}
      className={data.className as string}
      examples={examples.map(({ id, label }) => ({ id, label }))}
      activeExample={exampleId}
      onExampleChange={changeExample}
      onNodeClick={setStart}
      markedNode={start}
      hint={`Click any node to route from it instead. Currently starting at ${start}.`}
      panel={(step) => (
        <>
          <PanelBox title={`Cheapest known cost from ${start}`}>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {graph.nodes.map((n) => {
                const value = step.table?.[n.id] ?? "∞";
                const settled = step.visited.includes(n.id);
                return (
                  <div key={n.id} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-ink">{n.id}</span>
                    <span className={settled ? "font-bold text-signal-green-strong" : "text-ink-soft"}>
                      {value}
                      {settled && " (locked)"}
                    </span>
                  </div>
                );
              })}
            </div>
          </PanelBox>

          <PanelBox title="Why it never revisits">
            <p className="text-[11px] leading-relaxed text-slate">
              Once a node is locked in, no later discovery can beat it. Any other route would have to leave
              through a node that already costs more, and edge weights are never negative, so it can only get
              worse from there.
            </p>
          </PanelBox>
        </>
      )}
    />
  );
}
