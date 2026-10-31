"use client";

import { useMemo, useState } from "react";
import type { AlgorithmStep, GraphSpec } from "@/lib/graph/types";
import { GraphCanvas, GROUP_COLORS } from "./graph-canvas";
import { ChipRow, PanelBox, StatReadout } from "../shared/widget-ui";
import { ActionDock, Legend, WidgetShell } from "../shared/widget-shell";

/** The same flight network the Tarjan trace later runs on, so the reader meets
 *  the map once and only has to learn the algorithm the second time round. */
const DEFAULT_GRAPH: GraphSpec = {
  directed: true,
  nodes: [
    { id: "JFK", x: 65, y: 130 },
    { id: "LHR", x: 175, y: 55 },
    { id: "CDG", x: 175, y: 205 },
    { id: "LAX", x: 25, y: 45 },
    { id: "GRU", x: 25, y: 215 },
    { id: "DXB", x: 300, y: 130 },
    { id: "SIN", x: 400, y: 55 },
    { id: "HND", x: 400, y: 205 },
    { id: "SYD", x: 270, y: 225 },
    { id: "BKK", x: 270, y: 35 },
  ],
  edges: [
    { from: "JFK", to: "LHR" },
    { from: "LHR", to: "CDG" },
    { from: "CDG", to: "JFK" },
    { from: "LHR", to: "DXB" },
    { from: "DXB", to: "SIN" },
    { from: "SIN", to: "HND" },
    { from: "HND", to: "SIN" },
    { from: "DXB", to: "SYD" },
    { from: "JFK", to: "LAX" },
    { from: "JFK", to: "GRU" },
    { from: "DXB", to: "BKK" },
  ],
};

function resolveGraph(data: Record<string, unknown>): GraphSpec {
  const g = data.graph;
  if (typeof g !== "object" || g === null) return DEFAULT_GRAPH;
  const spec = g as Partial<GraphSpec>;
  if (!Array.isArray(spec.nodes) || !Array.isArray(spec.edges) || spec.nodes.length === 0) return DEFAULT_GRAPH;
  return { ...spec, directed: true } as GraphSpec;
}

/**
 * Everything reachable from `start`, following edges forwards or backwards.
 *
 * Built here rather than reusing `adjacency()` from the graph lib because that
 * one only ever walks forwards, and the whole point of this widget is that the
 * backward walk is a separate, equally expensive traversal.
 */
function reachableFrom(graph: GraphSpec, start: string, reverse: boolean): Set<string> {
  const adj = new Map<string, string[]>();
  for (const n of graph.nodes) adj.set(n.id, []);
  for (const e of graph.edges) {
    if (reverse) adj.get(e.to)?.push(e.from);
    else adj.get(e.from)?.push(e.to);
  }

  // `start` seeds the set: a node always reaches itself along the empty path,
  // which is why the intersection is never empty and every node ends up in a
  // component of its own even when it sits on no cycle at all.
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of adj.get(current) ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return seen;
}


/**
 * The definition of a strongly connected component, made clickable.
 *
 * Pick a node and the widget runs the two traversals the naive method is built
 * from: forwards for what it reaches, backwards for what reaches it. The
 * overlap is its component, outlined. No playback controls, because there is no
 * algorithm here to step through - this is the question Tarjan later answers
 * quickly, shown slowly first so the reader knows what is being asked.
 */
export function MutualReachabilityWidget({
  data,
  frame = true,
}: {
  data: Record<string, unknown>;
  frame?: boolean;
}) {
  const graph = useMemo(() => resolveGraph(data), [data]);
  const [picked, setPicked] = useState<string>(
    typeof data.start === "string" ? data.start : graph.nodes[0]?.id ?? "",
  );

  // An author can swap the graph out from under a stale selection, so fall
  // back rather than rendering an empty readout for a node that is gone.
  const selected = graph.nodes.some((n) => n.id === picked) ? picked : graph.nodes[0]?.id ?? "";

  const { forwardOnly, backwardOnly, component } = useMemo(() => {
    if (!selected) return { forwardOnly: [], backwardOnly: [], component: [] };

    const forward = reachableFrom(graph, selected, false);
    const backward = reachableFrom(graph, selected, true);

    // Node order follows the graph's own node list so the chip rows stay in a
    // stable, author-chosen order instead of BFS discovery order, which shifts
    // every time the reader picks a different node.
    const ids = graph.nodes.map((n) => n.id);
    return {
      forwardOnly: ids.filter((id) => forward.has(id) && !backward.has(id)),
      backwardOnly: ids.filter((id) => backward.has(id) && !forward.has(id)),
      component: ids.filter((id) => forward.has(id) && backward.has(id)),
    };
  }, [graph, selected]);

  const step: AlgorithmStep = {
    caption: "",
    visited: forwardOnly,
    active: null,
    frontier: backwardOnly,
    treeEdges: [],
    consideredEdge: null,
    rejectedEdges: [],
    groups: component.length > 0 ? [component] : [],
  };

  if (graph.nodes.length === 0) {
    return <p className="text-sm text-signal-coral">Reachability widget: the graph has no nodes.</p>;
  }

  return (
    <WidgetShell
      kind="Graphs"
      title="Who can reach whom?"
      singleView
      bare={!frame}
      className={data.className as string}
      stage={<GraphCanvas graph={graph} step={step} onNodeClick={setPicked} markedNode={selected} groupHulls groupLabel="SCC" />}
      caption={
        component.length === 1
          ? `${selected} is on no cycle, so it is a component all by itself. It reaches ${forwardOnly.length} and is reached from ${backwardOnly.length}, but never both ways.`
          : `${component.length} airports can each reach every other and get back again: ${component.join(", ")}.`
      }
      readout={
        <StatReadout
          stats={[
            { label: "both ways", value: component.length, tone: "good" },
            { label: "it reaches", value: forwardOnly.length },
            { label: "reach it", value: backwardOnly.length },
          ]}
        />
      }
      legend={
        <Legend
          items={[
            { color: GROUP_COLORS[0], label: "Same component" },
            { color: "var(--signal-green)", label: `${selected} reaches it` },
            { color: "var(--copper-bg)", label: `Reaches ${selected}`, outline: true },
          ]}
        />
      }
      sideWidth={230}
      side={
        <>
          <PanelBox title={`Both ways with ${selected}`}>
            <ChipRow items={component} emptyLabel="none" reserveRows={2} />
          </PanelBox>
          <PanelBox title={`${selected} can get to`} aside="one way">
            <ChipRow items={forwardOnly} emptyLabel="nothing new" tone="muted" reserveRows={1} />
          </PanelBox>
          <PanelBox title={`Can reach ${selected}`} aside="one way">
            <ChipRow items={backwardOnly} emptyLabel="nothing new" tone="muted" reserveRows={1} />
          </PanelBox>
        </>
      }
      dock={<ActionDock hint="Click any node to ask the same two questions about it." />}
    />
  );
}
