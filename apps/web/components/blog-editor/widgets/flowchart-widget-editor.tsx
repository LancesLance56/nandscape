"use client";

import { useMemo } from "react";

import { cn } from "@/lib/cn";
import { useStoredFlowcharts } from "@/lib/diagrams/use-stored-flowcharts";
import { emptyDoc, type Doc } from "@/lib/flowchart-editor/model";
import { toDoc } from "@/lib/flowchart-editor/from-spec";
import { FlowchartEditor } from "@/components/flowchart-editor/editor";
import { DiagramViewer } from "@/components/flowchart-editor/viewer";
import type { WidgetEditorProps } from "@/lib/blog-editor/widget-registry";

/**
 * Putting a diagram in an article.
 *
 * Two ways, and the block records which one it is. A *stored* diagram points
 * at a row in `diagram_presets`: right for anything reused, because a fix to
 * it fixes every page showing it. A diagram stored *in the block* is right for
 * one an article needs and nothing else does.
 *
 * Both hold the same thing now - a drawing - so switching between them is a
 * copy rather than a conversion, and a diagram that predates the drawing tool
 * is converted on open by `toDoc`.
 */
export function FlowchartWidgetEditor({ data, onChange }: WidgetEditorProps) {
  const presetName = typeof data.preset === "string" ? data.preset : null;
  const inline = useMemo(() => toDoc(data.chart), [data.chart]);
  const mode: "preset" | "custom" = inline && !presetName ? "custom" : "preset";

  const { bySlug, groups, loading, error } = useStoredFlowcharts();

  const stored = presetName ? bySlug.get(presetName) ?? null : null;

  const switchTo = (next: "preset" | "custom") => {
    if (next === mode) return;
    if (next === "custom") {
      // Seed from what is on screen right now rather than from a blank page.
      onChange({ chart: inline ?? stored ?? emptyDoc() });
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
            {m === "preset" ? "Stored diagram" : "This page only"}
          </button>
        ))}
      </div>

      {mode === "preset" ? (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate">Diagram</span>
            <select
              value={presetName ?? ""}
              onChange={(e) => onChange({ preset: e.target.value })}
              className="w-full rounded-md border border-border-strong bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-copper"
            >
              <option value="">{loading ? "loading diagrams…" : "pick a diagram…"}</option>
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

          {stored ? (
            <DiagramViewer doc={stored} draggable={false} />
          ) : (
            <p className="rounded-lg border border-dashed border-border-strong p-4 text-xs italic text-slate">
              {loading ? "Loading…" : "Pick a diagram to preview it here."}
            </p>
          )}
        </div>
      ) : (
        <FlowchartEditor
          initial={inline ?? emptyDoc()}
          onChange={(doc: Doc) => onChange({ chart: doc })}
          autosave={false}
          variant="embedded"
          height={560}
        />
      )}
    </div>
  );
}

/**
 * Editor for the maker widget, which ships an editable diagram to the reader.
 *
 * No stored mode here: the maker renders `data.chart` and ignores `preset`,
 * because the point of it is that the reader takes the diagram apart, and
 * handing them something shared across nine pages to take apart is the wrong
 * offer.
 */
export function FlowchartMakerWidgetEditor({ data, onChange }: WidgetEditorProps) {
  const initial = useMemo(() => toDoc(data.chart) ?? emptyDoc(), [data.chart]);
  return (
    <FlowchartEditor
      initial={initial}
      onChange={(doc: Doc) => onChange({ ...data, chart: doc })}
      autosave={false}
      variant="embedded"
      height={560}
    />
  );
}
