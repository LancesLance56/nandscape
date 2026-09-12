"use client";

/**
 * Diagrams, in an article.
 *
 * A thin adapter now: work out which drawing the block means, hand it to the
 * viewer, and get out of the way. Everything this file used to do - resolving
 * accents, deciding what to dim, running a walkthrough, wiring an editor - now
 * belongs to `DiagramViewer` and the drawing model, because those are shared
 * with the tool at /flowchart and had no business being duplicated here.
 *
 * ## The old format
 *
 * A block may still carry a `FlowchartSpec`: the auto-laid-out shape diagrams
 * were stored in before the drawing tool existed. `toDoc` converts one on
 * read, so nothing has to be migrated before a page works. `pnpm
 * diagrams:migrate` makes the conversion permanent; this path is what keeps an
 * un-migrated row from being a broken page in the meantime.
 */

import { useMemo } from "react";
import Link from "next/link";

import { cn } from "@/lib/cn";
import type { Doc } from "@/lib/flowchart-editor/model";
import { toDoc } from "@/lib/flowchart-editor/from-spec";
import { DiagramViewer } from "@/components/flowchart-editor/viewer";
import { FlowchartEditor } from "@/components/flowchart-editor/editor";
import { ALL_CHARTS } from "@/lib/flowchart/charts";
import { WidgetFrame } from "../widget-frame";

/* -------------------------------------------------------------------------
 * Resolving what to draw
 * ---------------------------------------------------------------------- */

/**
 * A block either carries a drawing inline or names a stored one.
 *
 * Inline wins, and that ordering is load-bearing: a block naming a preset has
 * the stored record injected into `chart` on the server before it ever reaches
 * here (lib/diagrams/resolve-block-diagrams). Checking the built-in table
 * first would quietly shadow the database with a stale copy compiled into the
 * bundle, and an edit to a diagram would appear to do nothing.
 */
export function resolveDoc(data: Record<string, unknown>): Doc | null {
  return (
    toDoc(data.chart) ??
    (typeof data.preset === "string" ? toDoc(ALL_CHARTS[data.preset]) : null) ??
    toDoc(data)
  );
}

/** Block-level switches. A page can turn a feature on for one diagram. */
function readOptions(data: Record<string, unknown>) {
  const i = (data.interactive ?? {}) as Record<string, unknown>;
  const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
  return {
    walkthrough: bool(i.walkthrough, true),
    notes: bool(i.notes, true),
    focus: bool(i.focus, false),
    legend: bool(i.legend, true),
    download: bool(i.download, true),
    fullscreen: bool(i.fullscreen, true),
    // Kept in step with Reader's own default in viewer.tsx.
    maxHeight: typeof data.height === "number" ? data.height : 1095,
  };
}

/* -------------------------------------------------------------------------
 * Widgets
 * ---------------------------------------------------------------------- */

export function FlowchartWidget({ data }: { data: Record<string, unknown> }) {
  const doc = useMemo(() => resolveDoc(data), [data]);
  const options = useMemo(() => readOptions(data), [data]);

  if (!doc) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-slate">
        This diagram could not be found.
      </p>
    );
  }

  return <DiagramViewer doc={doc} {...options} />;
}

/** The same viewer, for surfaces that already hold a drawing. */
export function FlowchartView({
  doc,
  className,
}: {
  doc: Doc;
  className?: string;
}) {
  return <DiagramViewer doc={doc} className={className} />;
}

/**
 * The reader-facing editable diagram, for a tutorial page or an embed.
 *
 * The same tool /flowchart runs, in its embedded shape: no draft is kept,
 * because several of these can share a page and a diagram pulled apart while
 * reading an article is not a document anybody wants back. Readers who want
 * the room are pointed at the full tool.
 */
export function FlowchartMakerWidget({ data }: { data: Record<string, unknown> }) {
  const initial = useMemo(() => resolveDoc(data) ?? undefined, [data]);

  return (
    <WidgetFrame
      title="Diagram editor"
      subtitle="Draw the boxes, route every line by hand"
      action={
        <Link href="/flowchart" className="text-[11px] font-semibold text-copper hover:text-copper-dark">
          Open the full tool &rarr;
        </Link>
      }
    >
      <FlowchartEditor
        initial={initial}
        autosave={false}
        variant="embedded"
        height={typeof data.height === "number" ? data.height : 840}
      />
    </WidgetFrame>
  );
}

/** Kept for the handful of call sites that render a diagram beside prose. */
export function DiagramFigure({
  doc,
  caption,
  className,
}: {
  doc: Doc;
  caption?: string;
  className?: string;
}) {
  return (
    <figure className={cn("flex flex-col gap-2", className)}>
      <DiagramViewer doc={doc} />
      {caption && <figcaption className="text-xs text-slate">{caption}</figcaption>}
    </figure>
  );
}
