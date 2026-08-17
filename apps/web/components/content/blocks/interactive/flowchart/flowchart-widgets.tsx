"use client";

import { useMemo, useState } from "react";
import { validateFlowchart, type FlowNodeType, type FlowchartSpec } from "@/lib/flowchart/types";
import { ALL_CHARTS, CHART_GROUPS, STARTER_CHART } from "@/lib/flowchart/charts";
import { WidgetFrame } from "../widget-frame";
import { cn } from "@/lib/cn";
import { FlowchartCanvas, FlowchartLegend } from "./flowchart-canvas";

/* -------------------------------------------------------------------------
 * Display widget
 * ---------------------------------------------------------------------- */

function isSpec(value: unknown): value is FlowchartSpec {
  if (typeof value !== "object" || value === null) return false;
  const v = value as FlowchartSpec;
  return Array.isArray(v.nodes) && Array.isArray(v.edges);
}

/**
 * Renders a flowchart, either a named preset or one supplied inline.
 *
 * Nodes carrying a note get a dot in the corner and become clickable. That
 * is deliberate: a flowchart box has room for "swap a[i], a[j]" and nothing
 * else, so the reason a step exists has to live somewhere, and a panel that
 * appears on demand beats cluttering every box with prose.
 */
export function FlowchartWidget({ data }: { data: Record<string, unknown> }) {
  const spec: FlowchartSpec = useMemo(() => {
    if (typeof data.preset === "string" && ALL_CHARTS[data.preset]) return ALL_CHARTS[data.preset];
    if (isSpec(data.chart)) return data.chart;
    if (isSpec(data)) return data as FlowchartSpec;
    return STARTER_CHART;
  }, [data]);

  const [selected, setSelected] = useState<string | null>(null);
  const selectedNode = spec.nodes.find((n) => n.id === selected) ?? null;
  const withNotes = spec.nodes.filter((n) => n.note).length;

  return (
    <WidgetFrame
      title={spec.title ?? "Flowchart"}
      subtitle={`${spec.nodes.length} steps${withNotes > 0 ? ` · ${withNotes} annotated` : ""}`}
    >
      <div className="flex flex-col gap-3">
        <FlowchartCanvas spec={spec} selectedId={selected} onSelect={(id) => setSelected((p) => (p === id ? null : id))} />
        <FlowchartLegend />

        {withNotes > 0 && (
          <div className="rounded-lg border border-border bg-surface-2/40 p-3">
            {selectedNode ? (
              <>
                <div className="mb-1 text-[11px] font-semibold text-copper-dark">{selectedNode.text.replace(/\n/g, " · ")}</div>
                <p className="text-xs leading-relaxed text-ink-soft">
                  {selectedNode.note ?? "No note for this step."}
                </p>
              </>
            ) : (
              <p className="text-xs italic text-slate">
                Click any box with a dot in its corner to see why that step is there.
              </p>
            )}
          </div>
        )}
      </div>
    </WidgetFrame>
  );
}

/* -------------------------------------------------------------------------
 * Maker
 * ---------------------------------------------------------------------- */

const NODE_TYPES: { id: FlowNodeType; label: string }[] = [
  { id: "start", label: "Start" },
  { id: "process", label: "Process" },
  { id: "decision", label: "Decision" },
  { id: "io", label: "Input/Output" },
  { id: "end", label: "End" },
];

let idCounter = 0;
const nextId = () => `n${Date.now().toString(36)}${idCounter++}`;

/**
 * An editable flowchart. Nodes and edges are added through the panel rather
 * than by dragging: the layout is computed, so there is nowhere to drag a
 * node *to*. Editing the graph and letting the layout re-run is both simpler
 * to use and impossible to leave in a tangled state.
 */
export function FlowchartMakerWidget({ data }: { data: Record<string, unknown> }) {
  const initial: FlowchartSpec = isSpec(data.chart) ? data.chart : STARTER_CHART;
  const [spec, setSpec] = useState<FlowchartSpec>(() => JSON.parse(JSON.stringify(initial)));
  const [selected, setSelected] = useState<string | null>(null);
  const [edgeFrom, setEdgeFrom] = useState("");
  const [edgeTo, setEdgeTo] = useState("");
  const [edgeLabel, setEdgeLabel] = useState("");
  const [copied, setCopied] = useState(false);

  const issues = useMemo(() => validateFlowchart(spec), [spec]);
  const selectedNode = spec.nodes.find((n) => n.id === selected) ?? null;

  const update = (fn: (draft: FlowchartSpec) => void) => {
    setSpec((prev) => {
      const draft: FlowchartSpec = JSON.parse(JSON.stringify(prev));
      fn(draft);
      return draft;
    });
  };

  const addNode = (type: FlowNodeType) => {
    const id = nextId();
    update((d) => {
      d.nodes.push({ id, type, text: type === "decision" ? "Condition ?" : "New step" });
    });
    setSelected(id);
  };

  const removeNode = (id: string) => {
    update((d) => {
      d.nodes = d.nodes.filter((n) => n.id !== id);
      // Edges touching a removed node would render as dangling arrows, so
      // they go with it.
      d.edges = d.edges.filter((e) => e.from !== id && e.to !== id);
    });
    setSelected(null);
  };

  const addEdge = () => {
    if (!edgeFrom || !edgeTo || edgeFrom === edgeTo) return;
    update((d) => {
      if (!d.edges.some((e) => e.from === edgeFrom && e.to === edgeTo)) {
        d.edges.push({ from: edgeFrom, to: edgeTo, label: edgeLabel.trim() || undefined });
      }
    });
    setEdgeLabel("");
  };

  const label = (id: string) => spec.nodes.find((n) => n.id === id)?.text.replace(/\n/g, " ") ?? id;

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(spec, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <WidgetFrame title="Flowchart maker" subtitle={`${spec.nodes.length} nodes · ${spec.edges.length} edges`}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <FlowchartCanvas spec={spec} selectedId={selected} onSelect={(id) => setSelected((p) => (p === id ? null : id))} />
          <FlowchartLegend />
          {issues.length > 0 && (
            <ul className="flex flex-col gap-1 rounded-lg border border-copper/40 bg-copper-bg/30 p-3">
              {issues.map((issue) => (
                <li key={issue} className="text-[11px] text-copper-dark">
                  {issue}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex w-full flex-col gap-3 xl:w-80">
          <Panel title="Start from">
            <select
              value=""
              onChange={(e) => {
                const t = e.target.value;
                if (!t) return;
                const chart = t === "starter" ? STARTER_CHART : ALL_CHARTS[t];
                if (chart) {
                  setSpec(JSON.parse(JSON.stringify(chart)));
                  setSelected(null);
                }
              }}
              aria-label="Load a template"
              className="w-full rounded-md border border-border-strong bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-copper"
            >
              <option value="">Load a template…</option>
              <option value="starter">Blank starter</option>
              {CHART_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.charts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Panel>

          <Panel title="Add a box">
            <div className="flex flex-wrap gap-1.5">
              {NODE_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => addNode(t.id)}
                  className="rounded-md border border-border-strong px-2.5 py-1 text-[11px] font-semibold text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  + {t.label}
                </button>
              ))}
            </div>
          </Panel>

          {selectedNode ? (
            <Panel title="Selected box">
              <div className="flex flex-col gap-2">
                <textarea
                  value={selectedNode.text}
                  onChange={(e) => update((d) => {
                    const n = d.nodes.find((x) => x.id === selectedNode.id);
                    if (n) n.text = e.target.value;
                  })}
                  rows={2}
                  aria-label="Box text"
                  className="w-full resize-y rounded-md border border-border-strong bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-copper"
                />
                <select
                  value={selectedNode.type}
                  onChange={(e) => update((d) => {
                    const n = d.nodes.find((x) => x.id === selectedNode.id);
                    if (n) n.type = e.target.value as FlowNodeType;
                  })}
                  aria-label="Box type"
                  className="w-full rounded-md border border-border-strong bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-copper"
                >
                  {NODE_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <input
                  value={selectedNode.note ?? ""}
                  onChange={(e) => update((d) => {
                    const n = d.nodes.find((x) => x.id === selectedNode.id);
                    if (n) n.note = e.target.value || undefined;
                  })}
                  placeholder="Note (optional)"
                  aria-label="Box note"
                  className="w-full rounded-md border border-border-strong bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-copper"
                />
                <button
                  type="button"
                  onClick={() => removeNode(selectedNode.id)}
                  className="self-start rounded-md border border-border-strong px-2.5 py-1 text-[11px] font-semibold text-signal-coral hover:bg-surface-2"
                >
                  Delete box
                </button>
              </div>
            </Panel>
          ) : (
            <Panel title="Selected box">
              <p className="text-[11px] italic text-slate">Click a box in the chart to edit it.</p>
            </Panel>
          )}

          <Panel title="Connect two boxes">
            <div className="flex flex-col gap-2">
              <select
                value={edgeFrom}
                onChange={(e) => setEdgeFrom(e.target.value)}
                aria-label="Edge from"
                className="w-full rounded-md border border-border-strong bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-copper"
              >
                <option value="">from…</option>
                {spec.nodes.map((nd) => (
                  <option key={nd.id} value={nd.id}>
                    {label(nd.id)}
                  </option>
                ))}
              </select>
              <select
                value={edgeTo}
                onChange={(e) => setEdgeTo(e.target.value)}
                aria-label="Edge to"
                className="w-full rounded-md border border-border-strong bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-copper"
              >
                <option value="">to…</option>
                {spec.nodes.map((nd) => (
                  <option key={nd.id} value={nd.id}>
                    {label(nd.id)}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  value={edgeLabel}
                  onChange={(e) => setEdgeLabel(e.target.value)}
                  placeholder="label, e.g. yes"
                  aria-label="Edge label"
                  className="min-w-0 flex-1 rounded-md border border-border-strong bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-copper"
                />
                <button
                  type="button"
                  onClick={addEdge}
                  disabled={!edgeFrom || !edgeTo || edgeFrom === edgeTo}
                  className="rounded-md bg-copper px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-copper-dark disabled:opacity-40"
                >
                  Connect
                </button>
              </div>
            </div>
          </Panel>

          <Panel title={`Arrows (${spec.edges.length})`}>
            <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
              {spec.edges.length === 0 && <span className="text-[11px] italic text-slate">none yet</span>}
              {spec.edges.map((e, i) => (
                <div key={`${e.from}-${e.to}-${i}`} className="flex items-center gap-1.5 text-[11px]">
                  <span className="min-w-0 flex-1 truncate text-ink-soft">
                    {label(e.from)} → {label(e.to)}
                    {e.label && <span className="ml-1 font-bold text-copper-dark">[{e.label}]</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => update((d) => { d.edges.splice(i, 1); })}
                    aria-label={`Remove arrow from ${label(e.from)} to ${label(e.to)}`}
                    className="shrink-0 rounded px-1.5 text-signal-coral hover:bg-surface-2"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </Panel>

          <button
            type="button"
            onClick={copyJson}
            className="rounded-lg border border-border-strong px-3 py-1.5 text-[11px] font-semibold text-ink-soft hover:bg-surface-2 hover:text-ink"
          >
            {copied ? "Copied" : "Copy chart as JSON"}
          </button>
        </div>
      </div>
    </WidgetFrame>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-lg border border-border bg-surface-2/40 p-3")}>
      <div className="mb-2 text-[11px] font-semibold text-slate">{title}</div>
      {children}
    </div>
  );
}
