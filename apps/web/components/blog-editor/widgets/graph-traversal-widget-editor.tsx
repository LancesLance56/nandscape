"use client";

import { Field, fieldInputClass } from "@/components/blog-editor/fields/field";
import { GraphSpecEditor } from "./graph-spec-editor";
import type { GraphSpec } from "@/lib/graph/types";

const EMPTY_GRAPH: GraphSpec = { nodes: [], edges: [] };

export function GraphTraversalWidgetEditor({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const graph = (data.graph as GraphSpec | undefined) ?? EMPTY_GRAPH;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Opens in">
          <select
            className={fieldInputClass}
            value={data.mode === "dfs" ? "dfs" : "bfs"}
            onChange={(e) => onChange({ ...data, mode: e.target.value })}
          >
            <option value="bfs">BFS</option>
            <option value="dfs">DFS</option>
          </select>
        </Field>
        <Field label="Start node (optional)">
          <input
            className={fieldInputClass}
            value={typeof data.start === "string" ? data.start : ""}
            onChange={(e) => onChange({ ...data, start: e.target.value || undefined })}
            placeholder="defaults to the first node"
          />
        </Field>
      </div>
      <GraphSpecEditor
        graph={graph}
        onChange={(next) => onChange({ ...data, graph: next })}
        showWeightedToggle={false}
      />
    </div>
  );
}
