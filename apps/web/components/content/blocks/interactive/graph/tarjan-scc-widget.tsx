"use client";

import { useMemo, useState } from "react";
import { tarjanSteps } from "@/lib/graph/algorithms";
import type { GraphSpec } from "@/lib/graph/types";
import { AlgorithmRunner, ChipRow, PanelBox } from "./algorithm-runner";

const EXAMPLES: { id: string; label: string; graph: GraphSpec }[] = [
  {
    id: "two",
    label: "Two components",
    graph: {
      directed: true,
      nodes: [
        { id: "A", x: 70, y: 65 },
        { id: "B", x: 195, y: 45 },
        { id: "C", x: 195, y: 175 },
        { id: "D", x: 70, y: 195 },
        { id: "E", x: 320, y: 100 },
        { id: "F", x: 395, y: 210 },
      ],
      edges: [
        { from: "A", to: "B" },
        { from: "B", to: "C" },
        { from: "C", to: "D" },
        { from: "D", to: "A" },
        { from: "C", to: "E" },
        { from: "E", to: "F" },
        { from: "F", to: "E" },
      ],
    },
  },
  {
    // Three components, one of them a lone node. F sits on no cycle at all
    // and is still its own SCC, which is the detail people miss: every node
    // belongs to exactly one component, size 1 included.
    id: "singleton",
    label: "With a lone node",
    graph: {
      directed: true,
      nodes: [
        { id: "A", x: 65, y: 70 },
        { id: "B", x: 65, y: 190 },
        { id: "C", x: 195, y: 130 },
        { id: "D", x: 295, y: 50 },
        { id: "E", x: 295, y: 210 },
        { id: "F", x: 400, y: 130 },
      ],
      edges: [
        { from: "A", to: "B" },
        { from: "B", to: "A" },
        { from: "B", to: "C" },
        { from: "C", to: "D" },
        { from: "D", to: "E" },
        { from: "E", to: "C" },
        { from: "E", to: "F" },
      ],
    },
  },
];

function resolveExamples(data: Record<string, unknown>): typeof EXAMPLES {
  const g = data.graph;
  if (typeof g !== "object" || g === null) return EXAMPLES;
  const spec = g as Partial<GraphSpec>;
  if (!Array.isArray(spec.nodes) || !Array.isArray(spec.edges) || spec.nodes.length === 0) return EXAMPLES;
  return [{ id: "custom", label: "Custom", graph: { ...spec, directed: true } as GraphSpec }];
}

/**
 * Tarjan's algorithm, with the two numbers per node shown right above it and
 * the working stack beside the graph. Nodes get tinted by component as soon
 * as one closes, so the "pop everything down to the root" moment is visible
 * rather than buried in a recursion trace.
 */
export function TarjanSccWidget({
  data,
  frame = true,
}: {
  data: Record<string, unknown>;
  frame?: boolean;
}) {
  const examples = useMemo(() => resolveExamples(data), [data]);
  const [exampleId, setExampleId] = useState(examples[0].id);
  const graph = (examples.find((e) => e.id === exampleId) ?? examples[0]).graph;
  const steps = useMemo(() => tarjanSteps(graph), [graph]);

  return (
    <AlgorithmRunner
      graph={graph}
      steps={steps}
      frame={frame}
      className={data.className as string}
      examples={examples.map(({ id, label }) => ({ id, label }))}
      activeExample={exampleId}
      onExampleChange={setExampleId}
      groupHulls
      groupLabel="SCC"
      hint="The pair above each node is arrival time / earliest node it can loop back to. Closed components get a shaded outline."
      panel={(step) => (
        <>
          <PanelBox title="Stack (nodes in an unfinished component)">
            <ChipRow items={step.frontier} emptyLabel="empty" />
          </PanelBox>

          <PanelBox title="arrival / lowlink">
            <div className="flex flex-col gap-1">
              {graph.nodes.map((n) => (
                <div key={n.id} className="flex items-center justify-between text-xs">
                  <span className="font-bold text-ink">{n.id}</span>
                  <span className="text-ink-soft">{step.table?.[n.id] ?? "-"}</span>
                </div>
              ))}
            </div>
          </PanelBox>

          <PanelBox title="Components found">
            {step.groups && step.groups.length > 0 ? (
              <div className="flex flex-col gap-1">
                {step.groups.map((g) => (
                  <span key={g.join()} className="text-xs font-semibold text-ink">
                    {"{ "}
                    {g.join(", ")}
                    {" }"}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs italic text-slate">none closed yet</span>
            )}
          </PanelBox>
        </>
      )}
    />
  );
}
