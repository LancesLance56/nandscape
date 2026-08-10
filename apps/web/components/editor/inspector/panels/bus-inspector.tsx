"use client";

import { useEditorStore } from "@/store/editor-store";
import { clampBusWidth, MAX_BUS_WIDTH, MIN_BUS_WIDTH } from "@/lib/editor/bus-utils";
import type { BusMergeNodeData, BusSplitNodeData, EditorNode } from "@/types/editor";

export function BusInspectorPanel({ node }: { node: EditorNode }) {
  const data = node.data as BusMergeNodeData | BusSplitNodeData;
  const updateNodeData = useEditorStore((s) => s.updateNodeData);
  const isMerge = data.kind === "bus-merge";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wider text-slate">
          {isMerge ? "Bus Merge" : "Bus Split"}
        </span>
        <span className="rounded-full bg-indigo-400/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-indigo-400">
          {isMerge ? `${data.width}-bit in` : `${data.width}-bit out`}
        </span>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-ink-soft">Label</span>
        <input
          type="text"
          value={data.label ?? ""}
          placeholder="A"
          onChange={(e) => updateNodeData(node.id, { label: e.target.value })}
          className="rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-copper"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-ink-soft">Width (bits)</span>
        <input
          type="number"
          min={MIN_BUS_WIDTH}
          max={MAX_BUS_WIDTH}
          value={data.width}
          onChange={(e) => updateNodeData(node.id, { width: clampBusWidth(Number(e.target.value)) })}
          className="rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-copper"
        />
        <span className="text-[11px] text-ink-soft">
          {isMerge
            ? `Adds/removes single-bit inputs (in-0..in-${Math.max(data.width - 1, 0)}).`
            : `Adds/removes single-bit outputs (out-0..out-${Math.max(data.width - 1, 0)}).`}
          {" "}Changing this after wiring the bus edge to its partner will surface a width-mismatch
          error until the other end matches.
        </span>
      </label>

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
