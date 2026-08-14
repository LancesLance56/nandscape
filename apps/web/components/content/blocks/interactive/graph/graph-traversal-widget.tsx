"use client";

import { useMemo, useState } from "react";
import { bfsSteps, dfsSteps } from "@/lib/graph/algorithms";
import type { GraphSpec } from "@/lib/graph/types";
import { AlgorithmRunner, ChipRow, PanelBox } from "./algorithm-runner";

const EXAMPLES: { id: string; label: string; graph: GraphSpec }[] = [
  {
    id: "layered",
    label: "Layered",
    graph: {
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
    },
  },
  {
    // Two routes to D of very different lengths. BFS reaches E second (it is
    // one hop from A); DFS reaches it last, after walking the entire long
    // way round. The starkest BFS-vs-DFS contrast in a five-node graph.
    id: "two-routes",
    label: "Two routes",
    graph: {
      nodes: [
        { id: "A", x: 70, y: 130 },
        { id: "B", x: 160, y: 50 },
        { id: "C", x: 265, y: 50 },
        { id: "D", x: 370, y: 130 },
        { id: "E", x: 215, y: 210 },
      ],
      edges: [
        { from: "A", to: "B" },
        { from: "B", to: "C" },
        { from: "C", to: "D" },
        { from: "A", to: "E" },
        { from: "E", to: "D" },
      ],
    },
  },
];

function resolveExamples(data: Record<string, unknown>): typeof EXAMPLES {
  const g = data.graph;
  if (typeof g !== "object" || g === null) return EXAMPLES;
  const spec = g as Partial<GraphSpec>;
  if (!Array.isArray(spec.nodes) || !Array.isArray(spec.edges) || spec.nodes.length === 0) return EXAMPLES;
  // An author-supplied graph replaces the built-ins entirely.
  return [{ id: "custom", label: "Custom", graph: spec as GraphSpec }];
}

/**
 * BFS and DFS on the same graph, from the same start node, so the only thing
 * that differs is queue vs stack. Flipping between the two modes mid-run is
 * the whole lesson: same graph, same rules, wildly different visit order.
 */
export function GraphTraversalWidget({
  data,
  frame = true,
}: {
  data: Record<string, unknown>;
  frame?: boolean;
}) {
  const examples = useMemo(() => resolveExamples(data), [data]);
  const initialMode = data.mode === "dfs" ? "dfs" : "bfs";

  const [mode, setMode] = useState<"bfs" | "dfs">(initialMode);
  const [exampleId, setExampleId] = useState(examples[0].id);
  const example = examples.find((e) => e.id === exampleId) ?? examples[0];
  const graph = example.graph;

  const [start, setStart] = useState<string>(
    typeof data.start === "string" ? data.start : graph.nodes[0]?.id ?? "A",
  );

  // Node ids differ between examples, so a start node carried over from the
  // previous graph would silently fall back to node 0. Reset it explicitly.
  const changeExample = (id: string) => {
    const next = examples.find((e) => e.id === id);
    if (!next) return;
    setExampleId(id);
    setStart(next.graph.nodes[0]?.id ?? "A");
  };

  const steps = useMemo(
    () => (mode === "bfs" ? bfsSteps(graph, start) : dfsSteps(graph, start)),
    [graph, mode, start],
  );

  const isBfs = mode === "bfs";

  return (
    <AlgorithmRunner
      graph={graph}
      steps={steps}
      frame={frame}
      className={data.className as string}
      modes={[
        { id: "bfs", label: "BFS (queue)" },
        { id: "dfs", label: "DFS (stack)" },
      ]}
      activeMode={mode}
      onModeChange={(id) => setMode(id === "dfs" ? "dfs" : "bfs")}
      examples={examples.map(({ id, label }) => ({ id, label }))}
      activeExample={exampleId}
      onExampleChange={changeExample}
      onNodeClick={setStart}
      markedNode={start}
      hint="Click any node to start the traversal from there."
      panel={(step) => (
        <>
          <PanelBox title={isBfs ? "Queue (first in, first out)" : "Stack (last in, first out)"}>
            <ChipRow items={step.frontier} emptyLabel="empty" />
            <p className="mt-2 text-[11px] leading-relaxed text-slate">
              {isBfs
                ? "We always take from the left. New nodes join on the right."
                : "We always take from the right, the most recently added node."}
            </p>
          </PanelBox>

          <PanelBox title="Visited, in order">
            {step.visited.length > 0 ? (
              <p className="text-xs font-semibold text-ink">{step.visited.join(" → ")}</p>
            ) : (
              <span className="text-xs italic text-slate">nothing yet</span>
            )}
          </PanelBox>
        </>
      )}
    />
  );
}
