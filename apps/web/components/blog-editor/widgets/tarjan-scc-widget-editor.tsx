"use client";

import { GraphSpecEditor } from "./graph-spec-editor";
import type { GraphSpec } from "@/lib/graph/types";

const EMPTY_GRAPH: GraphSpec = { nodes: [], edges: [], directed: true };

export function TarjanSccWidgetEditor({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const graph = (data.graph as GraphSpec | undefined) ?? EMPTY_GRAPH;

  return (
    // Strongly connected components are only a meaningful question on a
    // directed graph - an undirected one is trivially one component per
    // connected piece - so the weighted toggle is the only one hidden here.
    <GraphSpecEditor graph={graph} onChange={(next) => onChange({ ...data, graph: next })} showWeightedToggle={false} />
  );
}
