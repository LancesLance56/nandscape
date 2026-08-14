"use client";

import { useEditorStore } from "@/store/editor-store";
import type { EditorNode, IoNodeData } from "@/types/editor";

export function IoInspectorPanel({ node }: { node: EditorNode }) {
  const data = node.data as IoNodeData;
  const updateNodeData = useEditorStore((s) => s.updateNodeData);
  const isInput = data.kind === "input";
  const kindLabel = data.kind === "input" ? "Input" : data.kind === "led" ? "LED" : "Output";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <span className=" text-[11px] text-slate">{kindLabel}</span>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-ink-soft">Name</span>
        <input
          type="text"
          value={data.name}
          onChange={(e) => updateNodeData(node.id, { name: e.target.value })}
          className="rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-copper"
        />
      </label>
    </div>
  );
}