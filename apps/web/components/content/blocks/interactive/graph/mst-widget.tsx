"use client";

import { useMemo, useState } from "react";
import { kruskalSteps, primSteps } from "@/lib/graph/algorithms";
import { edgeKey, type GraphSpec } from "@/lib/graph/types";
import { AlgorithmRunner, PanelBox } from "./algorithm-runner";

const EXAMPLES: { id: string; label: string; graph: GraphSpec }[] = [
  {
    id: "six-town",
    label: "Six towns",
    graph: {
      weighted: true,
      nodes: [
        { id: "A", x: 70, y: 60 },
        { id: "B", x: 215, y: 40 },
        { id: "C", x: 370, y: 65 },
        { id: "D", x: 70, y: 200 },
        { id: "E", x: 225, y: 165 },
        { id: "F", x: 375, y: 205 },
      ],
      edges: [
        { from: "A", to: "B", weight: 3 },
        { from: "A", to: "D", weight: 1 },
        { from: "B", to: "C", weight: 5 },
        { from: "B", to: "E", weight: 4 },
        { from: "D", to: "E", weight: 2 },
        { from: "C", to: "F", weight: 6 },
        { from: "E", to: "F", weight: 7 },
        { from: "C", to: "E", weight: 8 },
      ],
    },
  },
  {
    // A-B-C is a cheap triangle, so the third side gets rejected early rather
    // than at the very end. Shows the cycle check biting on a low-weight edge,
    // which is more convincing than only ever skipping expensive ones.
    id: "triangle",
    label: "Cheap triangle",
    graph: {
      weighted: true,
      nodes: [
        { id: "A", x: 80, y: 70 },
        { id: "B", x: 220, y: 50 },
        { id: "C", x: 180, y: 190 },
        { id: "D", x: 320, y: 150 },
        { id: "E", x: 395, y: 60 },
      ],
      edges: [
        { from: "A", to: "B", weight: 1 },
        { from: "B", to: "C", weight: 2 },
        { from: "A", to: "C", weight: 3 },
        { from: "C", to: "D", weight: 4 },
        { from: "D", to: "E", weight: 5 },
        { from: "C", to: "E", weight: 6 },
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
 * Kruskal and Prim side by side on one graph. They pick edges in completely
 * different orders and still land on the same total weight, which is the
 * cleanest way to show that "minimum spanning tree" is a property of the
 * graph rather than of the algorithm.
 */
export function MstWidget({
  data,
  frame = true,
}: {
  data: Record<string, unknown>;
  frame?: boolean;
}) {
  const examples = useMemo(() => resolveExamples(data), [data]);
  const [exampleId, setExampleId] = useState(examples[0].id);
  const graph = (examples.find((e) => e.id === exampleId) ?? examples[0]).graph;
  const [mode, setMode] = useState<"kruskal" | "prim">(data.mode === "prim" ? "prim" : "kruskal");

  const steps = useMemo(
    () => (mode === "kruskal" ? kruskalSteps(graph) : primSteps(graph)),
    [graph, mode],
  );

  const sortedEdges = useMemo(
    () => [...graph.edges].sort((a, b) => (a.weight ?? 1) - (b.weight ?? 1)),
    [graph],
  );

  return (
    <AlgorithmRunner
      graph={graph}
      steps={steps}
      frame={frame}
      className={data.className as string}
      modes={[
        { id: "kruskal", label: "Kruskal (cheapest edge anywhere)" },
        { id: "prim", label: "Prim (grow one blob)" },
      ]}
      activeMode={mode}
      onModeChange={(id) => setMode(id === "prim" ? "prim" : "kruskal")}
      examples={examples.map(({ id, label }) => ({ id, label }))}
      activeExample={exampleId}
      onExampleChange={setExampleId}
      panel={(step) => {
        const taken = new Set(step.treeEdges);
        const rejected = new Set(step.rejectedEdges);
        const total = graph.edges
          .filter((e) => taken.has(edgeKey(e.from, e.to, false)))
          .reduce((sum, e) => sum + (e.weight ?? 1), 0);

        return (
          <>
            <PanelBox title={mode === "kruskal" ? "Edges, sorted cheapest first" : "Edges by weight"}>
              <div className="flex flex-col gap-1">
                {sortedEdges.map((e) => {
                  const key = edgeKey(e.from, e.to, false);
                  const isTaken = taken.has(key);
                  const isRejected = rejected.has(key);
                  const isCurrent = step.consideredEdge === key;
                  return (
                    <div
                      key={key}
                      className={`flex items-center justify-between rounded px-1.5 py-0.5 text-xs ${
                        isCurrent ? "bg-copper-bg" : ""
                      }`}
                    >
                      <span
                        className={
                          isTaken
                            ? "font-bold text-signal-green-strong"
                            : isRejected
                              ? "text-slate line-through"
                              : "text-ink-soft"
                        }
                      >
                        {e.from}–{e.to}
                      </span>
                      <span className="text-slate">{e.weight}</span>
                    </div>
                  );
                })}
              </div>
            </PanelBox>

            <PanelBox title="Total so far">
              <p className="text-lg font-bold text-ink">{total}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate">
                {taken.size} of {graph.nodes.length - 1} edges needed. A spanning tree over {graph.nodes.length}{" "}
                nodes always uses exactly {graph.nodes.length - 1} edges.
              </p>
            </PanelBox>
          </>
        );
      }}
    />
  );
}
