"use client";

import { GraphCanvas } from "./graph-canvas";
import type { GraphSpec } from "@/lib/graph/types";

/**
 * A plain graph diagram: nodes and edges, no algorithm attached.
 *
 * The algorithm widgets (graph-traversal, shortest-path, mst-explorer,
 * tarjan-scc, graph-coloring) all exist to animate something running on a
 * graph. Plenty of graphs in these tutorials aren't there for that - the
 * Konigsberg bridges, a friend-of-a-friend example, a small illustration of
 * what "directed" means - and hand-drawing those in ASCII art was the
 * original sin this widget exists to fix. It is the same GraphCanvas every
 * other graph widget uses, just with no step to animate.
 */

export interface GraphEmbedData {
  graph: GraphSpec;
  title?: string;
  [key: string]: unknown;
}

export function isGraphEmbedData(data: Record<string, unknown>): data is GraphEmbedData {
  const g = data.graph;
  if (typeof g !== "object" || g === null) return false;
  const spec = g as Partial<GraphSpec>;
  return Array.isArray(spec.nodes) && Array.isArray(spec.edges);
}

export function GraphEmbedWidget({ data }: { data: Record<string, unknown> }) {
  if (!isGraphEmbedData(data)) {
    return (
      <p className="text-sm text-signal-coral">Graph embed: needs a graph with `nodes` and `edges` arrays.</p>
    );
  }

  return (
    <figure className="m-0">
      {data.title && (
        <figcaption className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate">
          {data.title}
        </figcaption>
      )}
      <div className="rounded-xl border border-border bg-surface-card p-4">
        <GraphCanvas graph={data.graph} />
      </div>
    </figure>
  );
}
