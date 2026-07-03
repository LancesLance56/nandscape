"use client";

import { gateTypeToString } from "@nandscape/engine";
import { useEditorStore } from "@/store/editor-store";
import type { EditorNode, GateNodeData } from "@/types/editor";

const VARIABLE_ARITY_LABEL = new Set(["NAND", "AND", "OR", "NOR", "XOR", "XNOR"]);

export function GateInspectorPanel({ node }: { node: EditorNode }) {
  const data = node.data as GateNodeData;
  const updateNodeData = useEditorStore((s) => s.updateNodeData);
  const typeName = gateTypeToString(data.gateType);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wider text-slate">Gate</span>
        <span className="rounded-full bg-copper-bg px-2 py-0.5 font-mono text-[11px] font-semibold text-copper-dark">
          {typeName}
        </span>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-ink-soft">Label</span>
        <input
          type="text"
          value={data.label ?? ""}
          placeholder={typeName}
          onChange={(e) => updateNodeData(node.id, { label: e.target.value })}
          className="rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-copper"
        />
      </label>

      {VARIABLE_ARITY_LABEL.has(typeName) && (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-soft">Input count</span>
          <input
            type="number"
            min={2}
            max={8}
            value={data.inputCount ?? 2}
            onChange={(e) => updateNodeData(node.id, { inputCount: Number(e.target.value) })}
            className="rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-copper"
          />
        </label>
      )}

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
