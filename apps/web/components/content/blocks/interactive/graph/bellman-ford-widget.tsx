"use client";

import { useMemo, useState } from "react";
import { bellmanFordSteps } from "@/lib/graph/algorithms";
import { edgeKey, type GraphSpec } from "@/lib/graph/types";
import { AlgorithmRunner, PanelBox } from "./algorithm-runner";

const EXAMPLES: { id: string; label: string; graph: GraphSpec }[] = [
  {
    // The genuine Dijkstra counterexample. Dijkstra finalises B at 1 before it
    // ever looks at C, so the C to B edge arrives too late to help and it
    // reports B = 1, D = 2 against the true B = 0, D = 1. Graphs where the
    // negative edge happens to be relaxed before the node is settled do not
    // break Dijkstra at all, which is why this one is shaped the way it is.
    id: "negative-edge",
    label: "A negative edge",
    graph: {
      directed: true,
      weighted: true,
      nodes: [
        { id: "A", x: 60, y: 130 },
        { id: "B", x: 200, y: 60 },
        { id: "C", x: 200, y: 205 },
        { id: "D", x: 350, y: 130 },
      ],
      edges: [
        { from: "A", to: "B", weight: 1 },
        { from: "A", to: "C", weight: 2 },
        { from: "C", to: "B", weight: -2 },
        { from: "B", to: "D", weight: 1 },
      ],
    },
  },
  {
    // A chain whose edges are listed back to front, so each pass carries the
    // frontier exactly one hop further. Four nodes of progress, four passes:
    // the V-1 bound met exactly rather than beaten early.
    id: "worst-case",
    label: "Why V-1 passes",
    graph: {
      directed: true,
      weighted: true,
      nodes: [
        { id: "A", x: 45, y: 70 },
        { id: "B", x: 150, y: 180 },
        { id: "C", x: 250, y: 70 },
        { id: "D", x: 350, y: 180 },
        { id: "E", x: 410, y: 70 },
      ],
      edges: [
        { from: "D", to: "E", weight: 1 },
        { from: "C", to: "D", weight: 1 },
        { from: "B", to: "C", weight: 1 },
        { from: "A", to: "B", weight: 1 },
      ],
    },
  },
  {
    // B, C, D form a loop of weight 2 - 6 + 3 = -1, so the distances fall
    // forever and the extra pass has something to catch.
    id: "negative-cycle",
    label: "A negative cycle",
    graph: {
      directed: true,
      weighted: true,
      nodes: [
        { id: "A", x: 55, y: 130 },
        { id: "B", x: 190, y: 55 },
        { id: "C", x: 330, y: 90 },
        { id: "D", x: 250, y: 210 },
      ],
      edges: [
        { from: "A", to: "B", weight: 1 },
        { from: "B", to: "C", weight: 2 },
        { from: "C", to: "D", weight: -6 },
        { from: "D", to: "B", weight: 3 },
      ],
    },
  },
];

function resolveExamples(data: Record<string, unknown>): typeof EXAMPLES {
  const g = data.graph;
  if (typeof g !== "object" || g === null) return EXAMPLES;
  const spec = g as Partial<GraphSpec>;
  if (!Array.isArray(spec.nodes) || !Array.isArray(spec.edges) || spec.nodes.length === 0) return EXAMPLES;
  return [{ id: "custom", label: "Custom", graph: { weighted: true, ...spec, directed: true } as GraphSpec }];
}

/**
 * Bellman-Ford with the edge list on show beside the graph.
 *
 * The list is the point. Dijkstra's widget puts a distance table next to the
 * canvas because choosing the smallest distance is what it does; this one puts
 * the raw sweep order there instead, because Bellman-Ford's whole character is
 * that it walks that list top to bottom and asks nothing about which node
 * looks promising.
 */
export function BellmanFordWidget({
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

  const source = graph.nodes.some((n) => n.id === start) ? start : graph.nodes[0]?.id ?? "A";
  const steps = useMemo(() => bellmanFordSteps(graph, source), [graph, source]);

  return (
    <AlgorithmRunner
      graph={graph}
      steps={steps}
      frame={frame}
      className={data.className as string}
      examples={examples.length > 1 ? examples.map(({ id, label }) => ({ id, label })) : undefined}
      activeExample={exampleId}
      onExampleChange={changeExample}
      onNodeClick={setStart}
      markedNode={source}
      groupHulls
      groupLabel="Negative cycle"
      hint={`Click any node to run from it instead. Currently starting at ${source}.`}
      panel={(step) => (
        <>
          <PanelBox title="Where we are">
            <p className="text-xs font-bold text-ink">{step.phase ?? "Bellman-Ford"}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate">
              No node is ever locked in. Any number here can still drop on a later pass, which is exactly what
              Dijkstra refuses to allow.
            </p>
          </PanelBox>

          <PanelBox title={`Cheapest known cost from ${source}`}>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {graph.nodes.map((n) => {
                const value = step.table?.[n.id] ?? "∞";
                const isActive = step.active === n.id;
                return (
                  <div key={n.id} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-ink">{n.id}</span>
                    <span
                      className={
                        isActive
                          ? "font-bold text-copper-dark"
                          : value === "∞"
                            ? "text-slate"
                            : "font-bold text-signal-green-strong"
                      }
                    >
                      {value}
                    </span>
                  </div>
                );
              })}
            </div>
          </PanelBox>

          <PanelBox title="Edge list, swept top to bottom">
            <div className="flex flex-col gap-0.5">
              {graph.edges.map((e) => {
                const key = edgeKey(e.from, e.to, true);
                const isCurrent = step.consideredEdge === key;
                const inTree = step.treeEdges.includes(key);
                return (
                  <div
                    key={key}
                    className={`flex items-center justify-between rounded px-1.5 py-0.5 text-xs ${
                      isCurrent ? "bg-copper-bg" : ""
                    }`}
                  >
                    <span className={inTree ? "font-bold text-signal-green-strong" : "text-ink-soft"}>
                      {e.from} → {e.to}
                    </span>
                    <span className={e.weight !== undefined && e.weight < 0 ? "font-bold text-signal-coral" : "text-slate"}>
                      {e.weight}
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
