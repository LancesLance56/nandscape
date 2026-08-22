"use client";

import { Field, fieldInputClass } from "@/components/blog-editor/fields/field";
import { GraphSpecEditor } from "./graph-spec-editor";
import type { GraphSpec } from "@/lib/graph/types";

const EMPTY_GRAPH: GraphSpec = { nodes: [], edges: [], directed: true };

export function MutualReachabilityWidgetEditor({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const graph = (data.graph as GraphSpec | undefined) ?? EMPTY_GRAPH;

  return (
    <div className="flex flex-col gap-3">
      <Field label="Node selected on load (optional)">
        <input
          className={fieldInputClass}
          value={typeof data.start === "string" ? data.start : ""}
          placeholder="defaults to the first node"
          onChange={(e) => onChange({ ...data, start: e.target.value || undefined })}
        />
      </Field>
      {/* Mutual reachability is only an interesting question on a directed
          graph, and edge weights play no part in it, so both toggles are off. */}
      <GraphSpecEditor
        graph={graph}
        onChange={(next) => onChange({ ...data, graph: next })}
        showDirectedToggle={false}
        showWeightedToggle={false}
      />
    </div>
  );
}
