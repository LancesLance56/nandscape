"use client";

import { useEditorStore } from "@/store/editor-store";
import type { EditorNode, ClockNodeData } from "@/types/editor";

const MIN_HALF_PERIOD = 1;

export function ClockInspectorPanel({ node }: { node: EditorNode }) {
  const data = node.data as ClockNodeData;
  const updateNodeData = useEditorStore((s) => s.updateNodeData);
  const halfPeriod = data.halfPeriod ?? 5;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <span className=" text-[11px] text-slate">Clock</span>
        <span className="rounded-full bg-copper-bg px-2 py-0.5 text-[11px] font-semibold text-copper-dark">
          CLOCK
        </span>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-ink-soft">Label</span>
        <input
          type="text"
          value={data.label ?? ""}
          placeholder="Clock"
          onChange={(e) => updateNodeData(node.id, { label: e.target.value })}
          className="rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-copper"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-ink-soft">Half-period (sim-time units)</span>
        <input
          type="number"
          min={MIN_HALF_PERIOD}
          value={halfPeriod}
          onChange={(e) =>
            updateNodeData(node.id, { halfPeriod: Math.max(MIN_HALF_PERIOD, Number(e.target.value)) })
          }
          className="rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-copper"
        />
        <span className="text-[11px] text-ink-soft">
          Time spent HIGH and time spent LOW are each this long, so the full period is {halfPeriod * 2} units. This
          circuit&apos;s clocks run at the overall playback speed set in the toolbar&apos;s simulation settings.
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
