"use client";

import { Field, fieldInputClass } from "@/components/blog-editor/fields/field";
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
    <div className="flex flex-col gap-3">
      <Field label="Opens in">
        <select
          className={fieldInputClass}
          value={data.mode === "dfs" ? "dfs" : "kahn"}
          onChange={(e) => onChange({ ...data, mode: e.target.value })}
        >
          <option value="kahn">Kahn&apos;s algorithm</option>
          <option value="dfs">DFS (finish order)</option>
        </select>
      </Field>
      {/* A topological order is only defined for a directed graph - the widget
          itself forces `directed: true` regardless of what is saved here - and
          neither algorithm looks at weight, so neither toggle is exposed. */}
      <GraphSpecEditor
        graph={{ ...graph, directed: true }}
        onChange={(next) => onChange({ ...data, graph: { ...next, directed: true } })}
        showDirectedToggle={false}
        showWeightedToggle={false}
      />
    </div>
  );
}
