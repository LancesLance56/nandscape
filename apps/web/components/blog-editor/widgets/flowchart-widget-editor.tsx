"use client";

import { useEffect, useMemo } from "react";

import { cn } from "@/lib/cn";
import { STARTER_CHART } from "@/lib/flowchart/charts";
import { useStoredFlowcharts } from "@/lib/diagrams/use-stored-flowcharts";
import { isFlowchartSpec, type FlowchartSpec } from "@/lib/flowchart/types";
import { FlowchartWorkbench } from "@/components/flowchart/workbench";
import { useFlowchartDoc } from "@/components/flowchart/use-flowchart-doc";
import { FlowchartView } from "@/components/content/blocks/interactive/flowchart/flowchart-widgets";
import type { WidgetEditorProps } from "@/lib/blog-editor/widget-registry";

/**
 * The chart editor, wired to a block's `onChange`.
 *
 * The workbench owns its own document so that undo and the coalescing of a
 * drag into one history step work the same everywhere; this pushes each
 * settled version back into the block. The block is the source of truth for
 * what gets saved, the doc is the source of truth for what is being edited,
 * and the sync only runs one way because the other direction would fight
 * every keystroke.
 */
function ChartEditor({
  initial,
  onChange,
}: {
  initial: FlowchartSpec;
  onChange: (spec: FlowchartSpec) => void;
}) {
  const doc = useFlowchartDoc(initial);

  useEffect(() => {
    onChange(doc.spec);
    // `onChange` is rebuilt on every render of the parent, so depending on it
    // would publish the chart in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.spec]);

  return <FlowchartWorkbench doc={doc} variant="embedded" />;
}

/**
 * Two ways to put a flowchart on a page, and the block records which one it is.
 *
 * A preset points at a chart defined in lib/flowchart, which is right for the
 * algorithm charts: they are reviewed like code, reused across pages, and a
 * fix to one fixes every page showing it. An inline chart is stored in the
 * block itself, which is right for a diagram only this article needs.
 *
 * Switching to custom seeds the editor with whichever preset was showing, so
 * "take the built-in one and change two boxes" is a two-click operation
 * rather than a rebuild from scratch.
 */
export function FlowchartWidgetEditor({ data, onChange }: WidgetEditorProps) {
  const presetName = typeof data.preset === "string" ? data.preset : null;
  const inline = isFlowchartSpec(data.chart) ? (data.chart as FlowchartSpec) : null;
  const mode: "preset" | "custom" = inline && !presetName ? "custom" : "preset";

  const { bySlug, groups, loading, error } = useStoredFlowcharts();

  const preview = useMemo<FlowchartSpec>(() => {
    const stored = presetName ? bySlug.get(presetName) : undefined;
    return stored ?? STARTER_CHART;
  }, [presetName, bySlug]);

  const switchTo = (next: "preset" | "custom") => {
    if (next === mode) return;
    if (next === "custom") {
      // Seed from what is on screen right now rather than from a blank chart.
      const seed: FlowchartSpec = inline ?? JSON.parse(JSON.stringify(preview));
      onChange({ chart: seed });
    } else {
      onChange({ preset: presetName ?? "bubble" });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {(["preset", "custom"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchTo(m)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors",
              mode === m
                ? "border-copper bg-copper text-white"
                : "border-border-strong text-ink-soft hover:bg-surface-2",
            )}
          >
            {m === "preset" ? "Built-in chart" : "Custom chart"}
          </button>
        ))}
      </div>

      {mode === "preset" ? (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate">Chart</span>
            <select
              value={presetName ?? ""}
              onChange={(e) => onChange({ preset: e.target.value })}
              className="w-full rounded-md border border-border-strong bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-copper"
            >
              <option value="">{loading ? "loading charts…" : "pick a chart…"}</option>
              {groups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.charts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          {error && <p className="text-[11px] text-signal-coral">{error}</p>}

          {presetName && bySlug.has(presetName) ? (
            <FlowchartView spec={bySlug.get(presetName)!} />
          ) : (
            <p className="rounded-lg border border-dashed border-border-strong p-4 text-xs italic text-slate">
              {loading ? "Loading…" : "Pick a chart to preview it here."}
            </p>
          )}
        </div>
      ) : (
        <ChartEditor initial={inline ?? STARTER_CHART} onChange={(spec) => onChange({ chart: spec })} />
      )}
    </div>
  );
}

/**
 * Editor for the maker widget, which ships an editable chart to the reader.
 *
 * No preset mode here: the maker renders `data.chart` and ignores `preset`
 * entirely, so offering a preset picker would be a control that silently does
 * nothing. Templates are still available inside the editor itself.
 */
export function FlowchartMakerWidgetEditor({ data, onChange }: WidgetEditorProps) {
  const inline = isFlowchartSpec(data.chart) ? (data.chart as FlowchartSpec) : null;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] italic text-slate">
        This is the chart readers start from. They can edit it themselves; nothing they do is saved.
      </p>
      <ChartEditor initial={inline ?? STARTER_CHART} onChange={(spec) => onChange({ chart: spec })} />
    </div>
  );
}
