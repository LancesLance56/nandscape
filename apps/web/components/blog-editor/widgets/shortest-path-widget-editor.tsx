"use client";

import { Field, fieldInputClass } from "@/components/blog-editor/fields/field";
import { GraphSpecEditor } from "./graph-spec-editor";
import type { GraphSpec } from "@/lib/graph/types";

const EMPTY_GRAPH: GraphSpec = { nodes: [], edges: [], weighted: true };

export function ShortestPathWidgetEditor({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const graph = (data.graph as GraphSpec | undefined) ?? EMPTY_GRAPH;

  return (
    <div className="flex flex-col gap-3">
      <Field label="Start node (optional)">
        <input
          className={fieldInputClass}
          value={typeof data.start === "string" ? data.start : ""}
          onChange={(e) => onChange({ ...data, start: e.target.value || undefined })}
          placeholder="defaults to the first node"
        />
      </Field>
      {/* Dijkstra reads every edge's weight, so leaving this off produces a
          graph that runs but silently treats every edge as cost 1. */}
      <GraphSpecEditor graph={graph} onChange={(next) => onChange({ ...data, graph: next })} />
    </div>
  );
}
