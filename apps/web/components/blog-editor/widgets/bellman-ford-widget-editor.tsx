"use client";

import { Field, fieldInputClass } from "@/components/blog-editor/fields/field";
import { GraphSpecEditor } from "./graph-spec-editor";
import type { GraphSpec } from "@/lib/graph/types";

const EMPTY_GRAPH: GraphSpec = { nodes: [], edges: [], directed: true, weighted: true };

export function BellmanFordWidgetEditor({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const graph = (data.graph as GraphSpec | undefined) ?? EMPTY_GRAPH;

  return (
    <div className="flex flex-col gap-3">
      <Field label="Source node (optional)">
        <input
          className={fieldInputClass}
          value={typeof data.start === "string" ? data.start : ""}
          placeholder="defaults to the first node"
          onChange={(e) => onChange({ ...data, start: e.target.value || undefined })}
        />
      </Field>
      {/* Negative weights are the entire subject, so the weight editor stays on
          and the directed toggle stays off: a negative edge on an undirected
          graph is a two-node negative cycle and nothing else. */}
      <GraphSpecEditor
        graph={graph}
        onChange={(next) => onChange({ ...data, graph: next })}
        showDirectedToggle={false}
      />
    </div>
  );
}
