"use client";

import { useState } from "react";
import { getNodesBounds, getViewportForBounds, useReactFlow } from "@xyflow/react";
import { toPng } from "html-to-image";

import { cn } from "@/lib/cn";
import {
  defaultAccent,
  type FlowAccent,
  type FlowLegendItem,
  type FlowNodeType,
  type FlowchartSpec,
} from "@/lib/flowchart/types";
import { ACCENT } from "./flowchart-nodes";

/* -------------------------------------------------------------------------
 * Legend
 * ---------------------------------------------------------------------- */

function Swatch({ item }: { item: FlowLegendItem }) {
  const accent = ACCENT[item.accent ?? "neutral"];

  if (item.kind === "edge") {
    return (
      <span
        className="inline-block h-0 w-6 border-t-2"
        style={{
          borderColor: accent.line,
          borderStyle: item.shape === "decision" ? "dashed" : "solid",
        }}
      />
    );
  }

  if (item.kind === "badge") {
    return (
      <span
        className="flex h-[17px] w-[17px] items-center justify-center rounded-full text-[10px] font-bold"
        style={{ background: accent.line, color: "var(--surface-card)" }}
      >
        {item.text ?? "1"}
      </span>
    );
  }

  const shape = item.shape ?? "process";
  if (shape === "decision") {
    return (
      <svg width="20" height="13" aria-hidden>
        <polygon points="10,1 19,6.5 10,12 1,6.5" fill={accent.fill} stroke={accent.line} strokeWidth="1.6" />
      </svg>
    );
  }
  if (shape === "io") {
    return (
      <svg width="20" height="13" aria-hidden>
        <polygon points="4,1 19,1 16,12 1,12" fill={accent.fill} stroke={accent.line} strokeWidth="1.6" />
      </svg>
    );
  }
  return (
    <span
      className={cn("inline-block h-3.5 w-6 border-2", shape === "start" || shape === "end" ? "rounded-full" : "rounded-[3px]")}
      style={{ background: accent.fill, borderColor: accent.line }}
    />
  );
}

/**
 * A custom legend when the chart declares one, otherwise the shapes actually
 * in use. Auto-deriving beats a fixed legend: a chart with no decision
 * diamonds should not explain what a diamond means.
 */
export function deriveLegend(spec: FlowchartSpec): FlowLegendItem[] {
  if (spec.legend) return spec.legend;

  const items: FlowLegendItem[] = [];
  const types = new Set(spec.nodes.map((n) => n.type));
  const accentFor = (t: FlowNodeType): FlowAccent =>
    spec.nodes.find((n) => n.type === t)?.accent ?? defaultAccent(t);

  if (types.has("start") || types.has("end")) {
    items.push({ label: "start / end", shape: "start", accent: accentFor("start") });
  }
  if (types.has("process")) items.push({ label: "process", shape: "process", accent: "neutral" });
  if (types.has("decision")) items.push({ label: "decision", shape: "decision", accent: accentFor("decision") });
  if (types.has("io")) items.push({ label: "input / output", shape: "io", accent: accentFor("io") });
  if (spec.edges.some((e) => e.kind === "loop") || hasBackEdge(spec)) {
    items.push({ label: "loop back", kind: "edge", shape: "decision", accent: "copper" });
  }
  return items;
}

/** Cheap cycle test, only used to decide whether to explain the dashed line. */
function hasBackEdge(spec: FlowchartSpec): boolean {
  const outgoing = new Map<string, string[]>();
  for (const e of spec.edges) {
    const list = outgoing.get(e.from) ?? [];
    list.push(e.to);
    outgoing.set(e.from, list);
  }
  const state = new Map<string, 1 | 2>();
  const visit = (id: string): boolean => {
    const s = state.get(id);
    if (s === 1) return true;
    if (s === 2) return false;
    state.set(id, 1);
    for (const next of outgoing.get(id) ?? []) if (visit(next)) return true;
    state.set(id, 2);
    return false;
  };
  return spec.nodes.some((n) => visit(n.id));
}

export function FlowchartLegend({ items }: { items: FlowLegendItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5 text-[11px] text-slate">
          <Swatch item={item} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Note panel
 * ---------------------------------------------------------------------- */

export function FlowchartNotePanel({
  title,
  note,
  placeholder,
}: {
  title?: string;
  note?: string;
  placeholder: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/40 p-3">
      {note ? (
        <>
          {title && <div className="mb-1 text-[11px] font-semibold text-copper-dark">{title.replace(/\n/g, " · ")}</div>}
          <p className="text-xs leading-relaxed text-ink-soft">{note}</p>
        </>
      ) : (
        <p className="text-xs italic text-slate">{placeholder}</p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * PNG export
 * ---------------------------------------------------------------------- */

const EXPORT_W = 1800;
const EXPORT_H = 1200;

/**
 * Renders the whole chart at a fixed size regardless of what is on screen, so
 * a downloaded diagram is never a screenshot of a half-scrolled canvas.
 * Scoped to one container because an article can hold several charts.
 */
export function DownloadButton({
  container,
  filename,
  className,
}: {
  container: React.RefObject<HTMLElement | null>;
  filename: string;
  className?: string;
}) {
  const { getNodes } = useReactFlow();
  const [state, setState] = useState<"idle" | "working" | "failed">("idle");

  // A plain function rather than useCallback: this only ever runs on a click,
  // so there is nothing to gain from a stable identity, and the compiler
  // cannot preserve the memo across the async body anyway.
  const run = async () => {
    const viewport = container.current?.querySelector<HTMLElement>(".react-flow__viewport");
    const nodes = getNodes().filter((n) => n.type !== "lane");
    if (!viewport || nodes.length === 0) {
      setState("failed");
      return;
    }

    setState("working");
    try {
      const bounds = getNodesBounds(nodes);
      const vp = getViewportForBounds(bounds, EXPORT_W, EXPORT_H, 0.2, 2, 0.12);
      const background = getComputedStyle(document.body).getPropertyValue("--surface-card").trim() || "#ffffff";

      const url = await toPng(viewport, {
        backgroundColor: background,
        width: EXPORT_W,
        height: EXPORT_H,
        style: {
          width: `${EXPORT_W}px`,
          height: `${EXPORT_H}px`,
          transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`,
        },
      });

      const link = document.createElement("a");
      link.download = `${filename}.png`;
      link.href = url;
      link.click();
      setState("idle");
    } catch {
      setState("failed");
    }
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={state === "working"}
      className={cn(
        "rounded-md border border-border-strong bg-surface-card/85 px-2 py-1 text-[10px] font-semibold text-ink-soft backdrop-blur-sm transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-50",
        className,
      )}
    >
      {state === "working" ? "Rendering…" : state === "failed" ? "Export failed" : "PNG"}
    </button>
  );
}
