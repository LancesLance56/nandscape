"use client";

import { useEditorStore } from "@/store/editor-store";
import { sevenSegmentLaneNames, commonSevenSegmentPrefix, SEVEN_SEGMENT_LABELS } from "@/lib/editor/bus-utils";
import type { EditorNode, SevenSegmentNodeData } from "@/types/editor";

/** Prefix is a derive-then-write convenience over `names`, same pattern as
 *  BusOutputInspectorPanel, see that file's doc comment. */
export function SevenSegmentInspectorPanel({ node }: { node: EditorNode }) {
  const data = node.data as SevenSegmentNodeData;
  const updateNodeData = useEditorStore((s) => s.updateNodeData);
  const prefix = commonSevenSegmentPrefix(data.names);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <span className=" text-[11px] text-slate">Seven-Segment Display</span>
        <span className="rounded-full bg-indigo-400/15 px-2 py-0.5 text-[11px] font-semibold text-indigo-400">
          7 in
        </span>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-ink-soft">Name prefix</span>
        <input
          type="text"
          value={prefix}
          placeholder="SEG_"
          onChange={(e) => updateNodeData(node.id, { names: sevenSegmentLaneNames(e.target.value) })}
          className="rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-copper"
        />
        <span className="text-[11px] text-ink-soft">
          Generates {SEVEN_SEGMENT_LABELS.map((l) => `${prefix || "SEG_"}${l}`).join(", ")}.
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
