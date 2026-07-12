"use client";

import { useEditorStore } from "@/store/editor-store";
import type { EditorNode, IoNodeData } from "@/types/editor";

export function IoInspectorPanel({ node }: { node: EditorNode }) {
  const data = node.data as IoNodeData;
  const updateNodeData = useEditorStore((s) => s.updateNodeData);
  const isInput = data.kind === "input";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wider text-slate">
          {isInput ? "Input" : "Output"}
        </span>
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
      <p className="text-xs text-ink-soft">
        Used as the pin label if this circuit is turned into a block — keep it unique among other {isInput ? "inputs" : "outputs"}.
      </p>

      <label className="flex items-center justify-between">
        <span className="text-xs font-medium text-ink-soft">Locked</span>
        <input
          type="checkbox"
          checked={data.locked ?? false}
          onChange={(e) => updateNodeData(node.id, { locked: e.target.checked })}
          className="h-4 w-4 accent-[var(--copper)]"
        />
      </label>
    </div>
  );
}