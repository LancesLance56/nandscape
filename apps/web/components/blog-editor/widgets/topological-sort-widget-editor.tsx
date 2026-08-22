"use client";

import { GraphSpecEditor } from "./graph-spec-editor";
import type { GraphSpec } from "@/lib/graph/types";

const EMPTY_GRAPH: GraphSpec = { nodes: [], edges: [], directed: true };

export function TopologicalSortWidgetEditor({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const graph = (data.graph as GraphSpec | undefined) ?? EMPTY_GRAPH;

  return (
    // A topological order is only defined for a directed graph - the widget
    // itself forces `directed: true` regardless of what is saved here - and
    // the algorithm ignores weight entirely, so neither toggle is exposed.
    <GraphSpecEditor
      graph={{ ...graph, directed: true }}
      onChange={(next) => onChange({ ...data, graph: { ...next, directed: true } })}
      showDirectedToggle={false}
      showWeightedToggle={false}
    />
  );
}
