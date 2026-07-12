"use client";

import { useEditorStore } from "@/store/editor-store";
import { useSubcircuitBlocksStore } from "@/store/subcircuit-blocks-store";
import { DEFAULT_BLOCK_COLORS } from "@/lib/editor/block-colors";
import type { EditorNode, SubcircuitNodeData } from "@/types/editor";

export function SubcircuitInspectorPanel({ node }: { node: EditorNode }) {
  const data = node.data as SubcircuitNodeData;
  const updateNodeData = useEditorStore((s) => s.updateNodeData);
  const block = useSubcircuitBlocksStore((s) => s.getById(data.circuitId));
  const setColor = useSubcircuitBlocksStore((s) => s.setColor);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wider text-slate">Block</span>
        <span
          className="rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold text-white"
          style={{ backgroundColor: block?.color ?? "var(--signal-green-strong)" }}
        >
          {block?.name ?? "Missing"}
        </span>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-ink-soft">Label</span>
        <input
          type="text"
          value={data.label ?? ""}
          placeholder={block?.name ?? ""}
          onChange={(e) => updateNodeData(node.id, { label: e.target.value })}
          className="rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-copper"
        />
      </label>

      {block && !block.builtIn && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-ink-soft">Block color</span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={block.color ?? "#4CAF7D"}
              onChange={(e) => setColor(block.id, e.target.value)}
              className="h-8 w-8 cursor-pointer rounded-md border border-border-strong bg-transparent p-0"
              aria-label="Custom block color"
            />
            {block.color && (
              <button
                type="button"
                onClick={() => setColor(block.id, undefined)}
                className="font-mono text-[11px] text-ink-soft hover:text-ink"
              >
                Reset
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DEFAULT_BLOCK_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(block.id, c)}
                aria-label={`Set color ${c}`}
                className={`h-5 w-5 rounded-full border transition-transform hover:scale-110 ${
                  block.color === c
                    ? "border-ink ring-2 ring-offset-1 ring-offset-surface-card ring-[var(--copper)]"
                    : "border-border-strong"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      )}

      {block && (
        <div className="flex flex-col gap-1 text-xs text-ink-soft">
          <span className="font-semibold text-ink">Pins</span>
          <span>In: {block.inputs.map((p) => p.name).join(", ") || "—"}</span>
          <span>Out: {block.outputs.map((p) => p.name).join(", ") || "—"}</span>
        </div>
      )}
    </div>
  );
}