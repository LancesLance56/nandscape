"use client";

import { Field, fieldInputClass } from "@/components/blog-editor/fields/field";
import { GraphSpecEditor } from "./graph-spec-editor";
import type { GraphSpec } from "@/lib/graph/types";

const EMPTY_GRAPH: GraphSpec = { nodes: [], edges: [], weighted: true };

export function MstWidgetEditor({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const graph = (data.graph as GraphSpec | undefined) ?? EMPTY_GRAPH;

  return (
    <div className="flex flex-col gap-3">
      <Field label="Opens in">
        <select
          className={fieldInputClass}
          value={data.mode === "prim" ? "prim" : "kruskal"}
          onChange={(e) => onChange({ ...data, mode: e.target.value })}
        >
          <option value="kruskal">Kruskal</option>
          <option value="prim">Prim</option>
        </select>
      </Field>
      {/* A spanning tree is a property of an undirected graph, so the
          directed toggle is hidden here rather than left to produce a graph
          the algorithm was never written to run on. */}
      <GraphSpecEditor
        graph={graph}
        onChange={(next) => onChange({ ...data, graph: next })}
        showDirectedToggle={false}
      />
    </div>
  );
}
