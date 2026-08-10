"use client";

import { SignalState } from "@nandscape/engine";
import { useEditorStore } from "@/store/editor-store";
import { busOutputLaneNames, commonBusLabel, clampBusWidth, MAX_BUS_WIDTH, MIN_BUS_WIDTH } from "@/lib/editor/bus-utils";
import type { BusInputNodeData, EditorNode } from "@/types/editor";

/** Same derive-then-write convenience over `names` as BusOutputInspectorPanel
 *  (see its doc comment), plus resizing `values` to match: existing lane
 *  values are kept where the index still exists, new lanes default LOW. */
function resizeValues(values: SignalState[], width: number): SignalState[] {
  return Array.from({ length: width }, (_, i) => values[i] ?? SignalState.LOW);
}

export function BusInputInspectorPanel({ node }: { node: EditorNode }) {
  const data = node.data as BusInputNodeData;
  const updateNodeData = useEditorStore((s) => s.updateNodeData);
  const width = data.names.length;
  const label = commonBusLabel(data.names);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wider text-slate">Bus Input</span>
        <span className="rounded-full bg-indigo-400/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-indigo-400">
          {width}-bit out
        </span>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-ink-soft">Label</span>
        <input
          type="text"
          value={label}
          placeholder="A"
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
          onChange={(e) => {
            const nextWidth = clampBusWidth(Number(e.target.value));
            updateNodeData(node.id, {
              names: busOutputLaneNames(label, nextWidth),
              values: resizeValues(data.values, nextWidth),
            });
          }}
          className="rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-copper"
        />
        <span className="text-[11px] text-ink-soft">
          Adds/removes single-bit outputs (out-0..out-{Math.max(width - 1, 0)}), index 0 is the MSB.
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
