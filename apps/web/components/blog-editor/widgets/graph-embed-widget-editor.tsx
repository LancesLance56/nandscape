"use client";

import { Field, fieldInputClass } from "@/components/blog-editor/fields/field";
import { GraphSpecEditor } from "./graph-spec-editor";
import type { GraphSpec } from "@/lib/graph/types";

const EMPTY_GRAPH: GraphSpec = { nodes: [], edges: [] };

export function GraphEmbedWidgetEditor({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const graph = (data.graph as GraphSpec | undefined) ?? EMPTY_GRAPH;

  return (
    <div className="flex flex-col gap-3">
      <Field label="Title (optional)">
        <input
          className={fieldInputClass}
          value={typeof data.title === "string" ? data.title : ""}
          onChange={(e) => onChange({ ...data, title: e.target.value || undefined })}
        />
      </Field>
      <GraphSpecEditor graph={graph} onChange={(next) => onChange({ ...data, graph: next })} />
    </div>
  );
}
