"use client";

import { Field, fieldInputClass } from "@/components/blog-editor/fields/field";
import { GraphSpecEditor } from "./graph-spec-editor";
import type { GraphSpec } from "@/lib/graph/types";

const EMPTY_GRAPH: GraphSpec = { nodes: [], edges: [] };

export function GraphColoringWidgetEditor({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const graph = (data.graph as GraphSpec | undefined) ?? EMPTY_GRAPH;
  const m = typeof data.m === "number" ? data.m : 3;

  return (
    <div className="flex flex-col gap-3">
      <Field label="Colors">
        <select className={fieldInputClass} value={m} onChange={(e) => onChange({ ...data, m: Number(e.target.value) })}>
          {[2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </Field>
      {/* Leaving `data.graph` empty here keeps this pinned to the widget's
          own built-in examples (see `data.example` in graph-coloring-widget)
          rather than swapping in a graph with zero nodes. */}
      <GraphSpecEditor
        graph={graph}
        onChange={(next) => onChange({ ...data, graph: next.nodes.length > 0 ? next : undefined })}
        showDirectedToggle={false}
        showWeightedToggle={false}
      />
    </div>
  );
}
