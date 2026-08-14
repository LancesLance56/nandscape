"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { adjacency, type GraphSpec } from "@/lib/graph/types";
import { GraphCanvas } from "./graph-canvas";

type Kind = "undirected" | "directed" | "weighted" | "dag" | "tree" | "disconnected";

interface Preset {
  kind: Kind;
  label: string;
  blurb: string;
  graph: GraphSpec;
}

// Shared positions so switching kinds morphs the same five dots instead of
// teleporting the whole picture, which makes the difference between the
// kinds much easier to actually see.
const P = {
  A: { id: "A", x: 90, y: 60 },
  B: { id: "B", x: 220, y: 40 },
  C: { id: "C", x: 350, y: 70 },
  D: { id: "D", x: 140, y: 190 },
  E: { id: "E", x: 300, y: 195 },
};

const PRESETS: Preset[] = [
  {
    kind: "undirected",
    label: "Undirected",
    blurb:
      "Plain edges with no direction. If A connects to B, then B connects to A. Think friendships or roads that run both ways.",
    graph: {
      nodes: Object.values(P),
      edges: [
        { from: "A", to: "B" },
        { from: "B", to: "C" },
        { from: "A", to: "D" },
        { from: "D", to: "E" },
        { from: "B", to: "E" },
        { from: "C", to: "E" },
      ],
    },
  },
  {
    kind: "directed",
    label: "Directed (digraph)",
    blurb:
      "Every edge is a one-way street. A → B says nothing about whether you can get from B back to A. Follow the arrows: here you can loop B → E → D and never return to A.",
    graph: {
      directed: true,
      nodes: Object.values(P),
      edges: [
        { from: "A", to: "B" },
        { from: "B", to: "C" },
        { from: "A", to: "D" },
        { from: "D", to: "E" },
        { from: "B", to: "E" },
        { from: "E", to: "D" },
      ],
    },
  },
  {
    kind: "weighted",
    label: "Weighted",
    blurb:
      "Each edge carries a number: distance, cost, time, whatever you're measuring. Now the shortest path isn't the one with the fewest hops, it's the one with the smallest total.",
    graph: {
      weighted: true,
      nodes: Object.values(P),
      edges: [
        { from: "A", to: "B", weight: 4 },
        { from: "B", to: "C", weight: 3 },
        { from: "A", to: "D", weight: 1 },
        { from: "D", to: "E", weight: 7 },
        { from: "B", to: "E", weight: 2 },
        { from: "C", to: "E", weight: 5 },
      ],
    },
  },
  {
    kind: "dag",
    label: "DAG",
    blurb:
      "Directed, and no way to follow arrows in a circle back to where you started. Dependency lists, build steps and course prerequisites are all DAGs. That 'no cycles' rule is what lets you sort them into a valid order.",
    graph: {
      directed: true,
      nodes: Object.values(P),
      edges: [
        { from: "A", to: "B" },
        { from: "A", to: "D" },
        { from: "B", to: "C" },
        { from: "B", to: "E" },
        { from: "D", to: "E" },
        { from: "E", to: "C" },
      ],
    },
  },
  {
    kind: "tree",
    label: "Tree",
    blurb:
      "Connected, and exactly one path between any two nodes. n nodes, n-1 edges, no cycles. Add one more edge anywhere and you've made a cycle, so it stops being a tree.",
    graph: {
      nodes: Object.values(P),
      edges: [
        { from: "A", to: "B" },
        { from: "A", to: "D" },
        { from: "B", to: "C" },
        { from: "D", to: "E" },
      ],
    },
  },
  {
    kind: "disconnected",
    label: "Disconnected",
    blurb:
      "Nothing says a graph has to be one piece. This one is two separate islands, and no amount of walking gets you from A to E. Traversals only ever find the island they start on.",
    graph: {
      nodes: Object.values(P),
      edges: [
        { from: "A", to: "B" },
        { from: "B", to: "C" },
        { from: "D", to: "E" },
      ],
    },
  },
];

function degreeSummary(graph: GraphSpec): { id: string; text: string }[] {
  if (graph.directed) {
    return graph.nodes.map((n) => {
      const out = graph.edges.filter((e) => e.from === n.id).length;
      const inn = graph.edges.filter((e) => e.to === n.id).length;
      return { id: n.id, text: `in ${inn}, out ${out}` };
    });
  }
  return graph.nodes.map((n) => ({
    id: n.id,
    text: String(graph.edges.filter((e) => e.from === n.id || e.to === n.id).length),
  }));
}

/**
 * The "what even is a graph" widget: one set of nodes, redrawn under each
 * flavour of graph, with the adjacency list and degree table updating
 * alongside. The point is that "directed", "weighted" and so on are
 * properties you bolt onto the same underlying idea, not six unrelated data
 * structures.
 */
export function GraphExplorerWidget({
  data,
  frame = true,
}: {
  data: Record<string, unknown>;
  frame?: boolean;
}) {
  const allowed = Array.isArray(data.kinds)
    ? PRESETS.filter((p) => (data.kinds as unknown[]).includes(p.kind))
    : PRESETS;
  const presets = allowed.length > 0 ? allowed : PRESETS;

  const [active, setActive] = useState(0);
  const preset = presets[Math.min(active, presets.length - 1)];
  const adj = useMemo(() => adjacency(preset.graph), [preset]);
  const degrees = useMemo(() => degreeSummary(preset.graph), [preset]);

  return (
    <div className={cn(frame && "rounded-xl border border-border bg-surface-card p-5", data.className as string)}>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {presets.map((p, i) => (
          <button
            key={p.kind}
            type="button"
            onClick={() => setActive(i)}
            aria-pressed={i === active}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              i === active
                ? "bg-copper text-white"
                : "bg-surface-2 text-ink-soft hover:text-ink",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <GraphCanvas graph={preset.graph} />

      <p className="mt-2 min-h-[4rem] text-sm leading-relaxed text-ink-soft">{preset.blurb}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface-2/50 p-3">
          <div className="mb-2 text-[11px] font-semibold text-slate">
            Adjacency list {preset.graph.directed ? "(who each node points at)" : "(who each node touches)"}
          </div>
          <div className="flex flex-col gap-1">
            {preset.graph.nodes.map((n) => (
              <div key={n.id} className="text-xs text-ink-soft">
                <span className="font-bold text-ink">{n.id}</span>
                {" → "}
                {(adj.get(n.id) ?? []).length > 0
                  ? (adj.get(n.id) ?? [])
                      .map((e) => (preset.graph.weighted ? `${e.to}(${e.weight})` : e.to))
                      .join(", ")
                  : "nothing"}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface-2/50 p-3">
          <div className="mb-2 text-[11px] font-semibold text-slate">
            Degree {preset.graph.directed ? "(edges in and out)" : "(edges touching it)"}
          </div>
          <div className="flex flex-col gap-1">
            {degrees.map((d) => (
              <div key={d.id} className="text-xs text-ink-soft">
                <span className="font-bold text-ink">{d.id}</span>: {d.text}
              </div>
            ))}
          </div>
          <div className="mt-3 border-t border-border pt-2 text-xs text-slate">
            {preset.graph.nodes.length} nodes, {preset.graph.edges.length} edges
          </div>
        </div>
      </div>
    </div>
  );
}
