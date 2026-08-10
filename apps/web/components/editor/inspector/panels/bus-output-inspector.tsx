"use client";

import { useEditorStore } from "@/store/editor-store";
import { busOutputLaneNames, commonBusLabel, clampBusWidth, MAX_BUS_WIDTH, MIN_BUS_WIDTH } from "@/lib/editor/bus-utils";
import type { BusOutputNodeData, EditorNode } from "@/types/editor";

/** Label + width are a derive-then-write convenience over `names`, not
 *  separate persisted state, see BusOutputNodeData's doc comment. Editing
 *  either one regenerates the whole `names` array; a puzzle's starter graph
 *  may have set `names` directly to something these two fields can't
 *  represent (e.g. non-numeric-suffix names), in which case the label field
 *  shows blank until the solver types a new one. */
export function BusOutputInspectorPanel({ node }: { node: EditorNode }) {
  const data = node.data as BusOutputNodeData;
  const updateNodeData = useEditorStore((s) => s.updateNodeData);
  const width = data.names.length;
  const label = commonBusLabel(data.names);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wider text-slate">Bus Output</span>
        <span className="rounded-full bg-indigo-400/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-indigo-400">
          {width}-bit in
        </span>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-ink-soft">Label</span>
        <input
          type="text"
          value={label}
          placeholder="Y"
          onChange={(e) => updateNodeData(node.id, { names: busOutputLaneNames(e.target.value, width) })}
          className="rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-copper"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-ink-soft">Width (bits)</span>
        <input
          type="number"
          min={MIN_BUS_WIDTH}
          max={MAX_BUS_WIDTH}
          value={width}
          onChange={(e) =>
            updateNodeData(node.id, { names: busOutputLaneNames(label, clampBusWidth(Number(e.target.value))) })
          }
          className="rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-copper"
        />
        <span className="text-[11px] text-ink-soft">
          Adds/removes single-bit inputs (in-0..in-{Math.max(width - 1, 0)}), index 0 is the MSB.
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
