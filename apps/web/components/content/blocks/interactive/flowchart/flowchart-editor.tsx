"use client";

import { useMemo, useRef, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";

import { cn } from "@/lib/cn";
import {
  edgeKey,
  isFlowchartSpec,
  resolveInteractive,
  validateFlowchart,
  type FlowAccent,
  type FlowEdgeKind,
  type FlowNode,
  type FlowNodeType,
  type FlowchartInteractive,
  type FlowchartSpec,
} from "@/lib/flowchart/types";
import { ALL_CHARTS, CHART_GROUPS, STARTER_CHART } from "@/lib/flowchart/charts";
import { FlowchartCanvas } from "./flowchart-canvas";
import { ACCENT_NAMES } from "./flowchart-nodes";
import { DownloadButton, FlowchartLegend, deriveLegend } from "./flowchart-chrome";

/* -------------------------------------------------------------------------
 * Small form primitives
 * ---------------------------------------------------------------------- */

const inputCls =
  "w-full rounded-md border border-border-strong bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-copper";

function Panel({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/40 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[11px] font-semibold text-slate">{title}</span>
        {right && <span className="ml-auto">{right}</span>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate">{label}</span>
      {children}
    </label>
  );
}

function Btn({
  onClick,
  children,
  tone = "plain",
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  tone?: "plain" | "primary" | "danger";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        tone === "primary" && "border-copper bg-copper text-white hover:bg-copper-dark",
        tone === "danger" && "border-border-strong text-signal-coral hover:bg-surface-2",
        tone === "plain" && "border-border-strong text-ink-soft hover:bg-surface-2 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function Check({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-1.5 text-[11px] text-ink-soft">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3 w-3 accent-copper"
      />
      {label}
    </label>
  );
}

/* -------------------------------------------------------------------------
 * Editor
 * ---------------------------------------------------------------------- */

const NODE_TYPES: { id: FlowNodeType; label: string }[] = [
  { id: "start", label: "Start" },
  { id: "process", label: "Process" },
  { id: "decision", label: "Decision" },
  { id: "io", label: "In/Out" },
  { id: "end", label: "End" },
  { id: "group", label: "Group" },
];

const EDGE_KINDS: FlowEdgeKind[] = ["solid", "dashed", "loop"];

const TABS = ["Boxes", "Arrows", "Lanes", "Trace", "Chart"] as const;
type Tab = (typeof TABS)[number];

let idCounter = 0;
const nextId = () => `n${Date.now().toString(36)}${idCounter++}`;

export interface FlowchartEditorProps {
  spec: FlowchartSpec;
  onChange: (spec: FlowchartSpec) => void;
  /** Offer the built-in algorithm charts as starting points. */
  showTemplates?: boolean;
  /** Offer raw JSON in/out. */
  showJson?: boolean;
  height?: number;
}

/**
 * The full flowchart editor: canvas on the left, tabbed panels on the right.
 *
 * Boxes are dragged rather than only listed, because position carries meaning
 * in a diagram and the auto-layout cannot know that two branches should sit
 * side by side. Dragging writes an explicit position onto the node, and
 * "Auto-layout" clears every one of them again, so a chart is never stuck in
 * a half-hand-placed state you cannot get out of.
 */
export function FlowchartEditor({
  spec,
  onChange,
  showTemplates = false,
  showJson = false,
  height = 460,
}: FlowchartEditorProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("Boxes");
  const [edgeFrom, setEdgeFrom] = useState("");
  const [edgeTo, setEdgeTo] = useState("");
  const [edgeLabel, setEdgeLabel] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const issues = useMemo(() => validateFlowchart(spec), [spec]);
  const legend = useMemo(() => deriveLegend(spec), [spec]);
  const selectedNode = spec.nodes.find((n) => n.id === selected) ?? null;

  // Everything is edited on a deep clone so a caller holding the previous
  // spec (an undo stack, React's own state comparison) still sees the old one.
  const update = (fn: (draft: FlowchartSpec) => void) => {
    const draft: FlowchartSpec = JSON.parse(JSON.stringify(spec));
    fn(draft);
    onChange(draft);
  };

  const interactive = useMemo(
    () => ({ ...resolveInteractive(spec), draggable: true, zoom: true }),
    [spec],
  );

  const labelOf = (id: string) => spec.nodes.find((n) => n.id === id)?.text.replace(/\n/g, " ") ?? id;
  const groups = spec.nodes.filter((n) => n.type === "group");

  /* --- mutations ------------------------------------------------------ */

  const addNode = (type: FlowNodeType) => {
    const id = nextId();
    update((d) => {
      d.nodes.push({
        id,
        type,
        text: type === "decision" ? "Condition ?" : type === "group" ? "Group" : "New step",
        ...(type === "group" ? { groupLayout: "column" as const } : {}),
      });
    });
    setSelected(id);
    setTab("Boxes");
  };

  const patchNode = (id: string, patch: Partial<FlowNode>) =>
    update((d) => {
      const n = d.nodes.find((x) => x.id === id);
      if (n) Object.assign(n, patch);
    });

  const removeNode = (id: string) => {
    update((d) => {
      // Children of a deleted group would render as orphans pointing at a
      // parent that no longer exists, so they are freed rather than removed.
      for (const n of d.nodes) if (n.parentId === id) delete n.parentId;
      d.nodes = d.nodes.filter((n) => n.id !== id);
      d.edges = d.edges.filter((e) => e.from !== id && e.to !== id);
      if (d.walkthrough) d.walkthrough = d.walkthrough.filter((s) => s.node !== id);
    });
    setSelected(null);
  };

  const addEdge = () => {
    if (!edgeFrom || !edgeTo || edgeFrom === edgeTo) return;
    update((d) => {
      if (!d.edges.some((e) => e.from === edgeFrom && e.to === edgeTo && (e.label ?? "") === edgeLabel.trim())) {
        d.edges.push({ from: edgeFrom, to: edgeTo, label: edgeLabel.trim() || undefined });
      }
    });
    setEdgeLabel("");
  };

  const clearPositions = () =>
    update((d) => {
      for (const n of d.nodes) delete n.position;
    });

  const setInteractiveFlag = (key: keyof FlowchartInteractive, value: boolean) =>
    update((d) => {
      d.interactive = { ...(d.interactive ?? {}), [key]: value };
    });

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(spec, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  /* --- render --------------------------------------------------------- */

  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-3" ref={containerRef}>
        <ReactFlowProvider>
          <FlowchartCanvas
            spec={spec}
            interactive={interactive}
            height={height}
            selectedId={selected}
            onSelectNode={setSelected}
            onNodeMove={(id, position) => patchNode(id, { position })}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Btn onClick={clearPositions}>Auto-layout</Btn>
            <Btn
              onClick={() =>
                update((d) => {
                  d.direction = d.direction === "LR" ? "TB" : "LR";
                })
              }
            >
              {spec.direction === "LR" ? "Left → right" : "Top → bottom"}
            </Btn>
            <DownloadButton container={containerRef} filename={spec.title ?? "flowchart"} />
            <span className="ml-auto text-[10px] text-slate">Drag a box to place it by hand</span>
          </div>
        </ReactFlowProvider>

        <FlowchartLegend items={legend} />

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

      <div className="flex w-full flex-col gap-3 xl:w-[22rem]">
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors",
                tab === t
                  ? "border-copper bg-copper text-white"
                  : "border-border-strong text-ink-soft hover:bg-surface-2",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ---------------- Boxes ---------------- */}
        {tab === "Boxes" && (
          <>
            <Panel title="Add a box">
              <div className="flex flex-wrap gap-1.5">
                {NODE_TYPES.map((t) => (
                  <Btn key={t.id} onClick={() => addNode(t.id)}>
                    + {t.label}
                  </Btn>
                ))}
              </div>
            </Panel>

            {selectedNode ? (
              <Panel title="Selected box">
                <div className="flex flex-col gap-2">
                  <Field label="Text">
                    <textarea
                      value={selectedNode.text}
                      onChange={(e) => patchNode(selectedNode.id, { text: e.target.value })}
                      rows={2}
                      className={cn(inputCls, "resize-y")}
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Shape">
                      <select
                        value={selectedNode.type}
                        onChange={(e) => patchNode(selectedNode.id, { type: e.target.value as FlowNodeType })}
                        className={inputCls}
                      >
                        {NODE_TYPES.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Colour">
                      <select
                        value={selectedNode.accent ?? ""}
                        onChange={(e) =>
                          patchNode(selectedNode.id, { accent: (e.target.value || undefined) as FlowAccent })
                        }
                        className={inputCls}
                      >
                        <option value="">default</option>
                        {ACCENT_NAMES.map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Badge">
                      <input
                        value={selectedNode.badge ?? ""}
                        onChange={(e) => patchNode(selectedNode.id, { badge: e.target.value || undefined })}
                        placeholder="e.g. 1"
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Inside group">
                      <select
                        value={selectedNode.parentId ?? ""}
                        onChange={(e) => patchNode(selectedNode.id, { parentId: e.target.value || undefined })}
                        className={inputCls}
                      >
                        <option value="">none</option>
                        {groups
                          .filter((g) => g.id !== selectedNode.id)
                          .map((g) => (
                            <option key={g.id} value={g.id}>
                              {labelOf(g.id)}
                            </option>
                          ))}
                      </select>
                    </Field>
                  </div>

                  {(spec.lanes?.length ?? 0) > 0 && (
                    <Field label="Lane">
                      <select
                        value={selectedNode.lane ?? ""}
                        onChange={(e) => patchNode(selectedNode.id, { lane: e.target.value || undefined })}
                        className={inputCls}
                      >
                        <option value="">none</option>
                        {(spec.lanes ?? []).map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}

                  {selectedNode.type === "group" && (
                    <Field label="Stack children">
                      <select
                        value={selectedNode.groupLayout ?? "column"}
                        onChange={(e) =>
                          patchNode(selectedNode.id, { groupLayout: e.target.value as "row" | "column" })
                        }
                        className={inputCls}
                      >
                        <option value="column">stacked</option>
                        <option value="row">side by side</option>
                      </select>
                    </Field>
                  )}

                  <Field label="Note (shown on click)">
                    <textarea
                      value={selectedNode.note ?? ""}
                      onChange={(e) => patchNode(selectedNode.id, { note: e.target.value || undefined })}
                      rows={3}
                      placeholder="Why this step exists"
                      className={cn(inputCls, "resize-y")}
                    />
                  </Field>

                  <div className="flex items-center gap-3">
                    <Check
                      checked={selectedNode.mono ?? false}
                      onChange={(v) => patchNode(selectedNode.id, { mono: v || undefined })}
                      label="Mono font"
                    />
                    {selectedNode.position && (
                      <Btn onClick={() => patchNode(selectedNode.id, { position: undefined })}>Reset position</Btn>
                    )}
                  </div>

                  <Btn tone="danger" onClick={() => removeNode(selectedNode.id)}>
                    Delete box
                  </Btn>
                </div>
              </Panel>
            ) : (
              <Panel title="Selected box">
                <p className="text-[11px] italic text-slate">Click a box in the chart to edit it.</p>
              </Panel>
            )}
          </>
        )}

        {/* ---------------- Arrows ---------------- */}
        {tab === "Arrows" && (
          <>
            <Panel title="Connect two boxes">
              <div className="flex flex-col gap-2">
                <select value={edgeFrom} onChange={(e) => setEdgeFrom(e.target.value)} className={inputCls}>
                  <option value="">from…</option>
                  {spec.nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {labelOf(n.id)}
                    </option>
                  ))}
                </select>
                <select value={edgeTo} onChange={(e) => setEdgeTo(e.target.value)} className={inputCls}>
                  <option value="">to…</option>
                  {spec.nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {labelOf(n.id)}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    value={edgeLabel}
                    onChange={(e) => setEdgeLabel(e.target.value)}
                    placeholder="label, e.g. yes"
                    className={cn(inputCls, "min-w-0 flex-1")}
                  />
                  <Btn tone="primary" onClick={addEdge} disabled={!edgeFrom || !edgeTo || edgeFrom === edgeTo}>
                    Connect
                  </Btn>
                </div>
              </div>
            </Panel>

            <Panel title={`Arrows (${spec.edges.length})`}>
              <div className="flex flex-col gap-2">
                {spec.edges.length === 0 && <span className="text-[11px] italic text-slate">none yet</span>}
                {spec.edges.map((e, i) => (
                  <div key={`${e.from}-${e.to}-${i}`} className="rounded-md border border-border bg-surface p-2">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="min-w-0 flex-1 truncate text-ink-soft">
                        {labelOf(e.from)} → {labelOf(e.to)}
                      </span>
                      <button
                        type="button"
                        onClick={() => update((d) => void d.edges.splice(i, 1))}
                        aria-label={`Remove arrow from ${labelOf(e.from)} to ${labelOf(e.to)}`}
                        className="shrink-0 rounded px-1.5 text-signal-coral hover:bg-surface-2"
                      >
                        ×
                      </button>
                    </div>
                    <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                      <input
                        value={e.label ?? ""}
                        onChange={(ev) =>
                          update((d) => {
                            d.edges[i].label = ev.target.value || undefined;
                          })
                        }
                        placeholder="label"
                        aria-label="Arrow label"
                        className={inputCls}
                      />
                      <select
                        value={e.kind ?? ""}
                        onChange={(ev) =>
                          update((d) => {
                            d.edges[i].kind = (ev.target.value || undefined) as FlowEdgeKind;
                          })
                        }
                        aria-label="Arrow style"
                        className={inputCls}
                      >
                        <option value="">auto</option>
                        {EDGE_KINDS.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                      <select
                        value={e.accent ?? ""}
                        onChange={(ev) =>
                          update((d) => {
                            d.edges[i].accent = (ev.target.value || undefined) as FlowAccent;
                          })
                        }
                        aria-label="Arrow colour"
                        className={inputCls}
                      >
                        <option value="">colour</option>
                        {ACCENT_NAMES.map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </>
        )}

        {/* ---------------- Lanes ---------------- */}
        {tab === "Lanes" && (
          <Panel
            title={`Lanes (${spec.lanes?.length ?? 0})`}
            right={
              <Btn
                onClick={() =>
                  update((d) => {
                    d.lanes = [...(d.lanes ?? []), { id: nextId(), label: "New lane" }];
                  })
                }
              >
                + Lane
              </Btn>
            }
          >
            <div className="flex flex-col gap-2">
              <p className="text-[11px] italic text-slate">
                Lanes pin boxes into labelled columns. Assign a box to one from the Boxes tab.
              </p>
              {(spec.lanes ?? []).map((lane, i) => (
                <div key={lane.id} className="flex items-center gap-1.5">
                  <input
                    value={lane.label}
                    onChange={(e) =>
                      update((d) => {
                        d.lanes![i].label = e.target.value;
                      })
                    }
                    aria-label="Lane name"
                    className={cn(inputCls, "min-w-0 flex-1")}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      update((d) => {
                        const removed = d.lanes![i].id;
                        d.lanes = d.lanes!.filter((_, k) => k !== i);
                        for (const n of d.nodes) if (n.lane === removed) delete n.lane;
                      })
                    }
                    aria-label={`Remove lane ${lane.label}`}
                    className="shrink-0 rounded px-1.5 text-signal-coral hover:bg-surface-2"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* ---------------- Trace ---------------- */}
        {tab === "Trace" && (
          <Panel
            title={`Trace steps (${spec.walkthrough?.length ?? 0})`}
            right={
              <Btn
                onClick={() =>
                  update((d) => {
                    d.walkthrough = [...(d.walkthrough ?? []), { caption: "What happens here" }];
                  })
                }
              >
                + Step
              </Btn>
            }
          >
            <div className="flex flex-col gap-2">
              <p className="text-[11px] italic text-slate">
                An ordered path through the chart. Readers get play/step controls and everything ahead of the
                current step stays dimmed.
              </p>
              {(spec.walkthrough ?? []).map((step, i) => (
                <div key={i} className="rounded-md border border-border bg-surface p-2">
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate">{i + 1}</span>
                    <button
                      type="button"
                      onClick={() =>
                        update((d) => {
                          d.walkthrough = d.walkthrough!.filter((_, k) => k !== i);
                        })
                      }
                      aria-label={`Remove step ${i + 1}`}
                      className="ml-auto rounded px-1.5 text-signal-coral hover:bg-surface-2"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <select
                      value={step.node ?? ""}
                      onChange={(e) =>
                        update((d) => {
                          d.walkthrough![i].node = e.target.value || undefined;
                        })
                      }
                      aria-label="Step box"
                      className={inputCls}
                    >
                      <option value="">no box</option>
                      {spec.nodes
                        .filter((n) => n.type !== "group")
                        .map((n) => (
                          <option key={n.id} value={n.id}>
                            {labelOf(n.id)}
                          </option>
                        ))}
                    </select>
                    <select
                      value={step.edge ?? ""}
                      onChange={(e) =>
                        update((d) => {
                          d.walkthrough![i].edge = e.target.value || undefined;
                        })
                      }
                      aria-label="Step arrow"
                      className={inputCls}
                    >
                      <option value="">no arrow</option>
                      {spec.edges.map((e) => (
                        <option key={edgeKey(e)} value={edgeKey(e)}>
                          {labelOf(e.from)} → {labelOf(e.to)}
                        </option>
                      ))}
                    </select>
                    <textarea
                      value={step.caption}
                      onChange={(e) =>
                        update((d) => {
                          d.walkthrough![i].caption = e.target.value;
                        })
                      }
                      rows={2}
                      placeholder="Caption"
                      aria-label="Step caption"
                      className={cn(inputCls, "resize-y")}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* ---------------- Chart ---------------- */}
        {tab === "Chart" && (
          <>
            <Panel title="Chart">
              <div className="flex flex-col gap-2">
                <Field label="Title">
                  <input
                    value={spec.title ?? ""}
                    onChange={(e) =>
                      update((d) => {
                        d.title = e.target.value || undefined;
                      })
                    }
                    className={inputCls}
                  />
                </Field>
                <Field label="Canvas height (px)">
                  <input
                    type="number"
                    min={240}
                    max={1200}
                    value={spec.height ?? 420}
                    onChange={(e) =>
                      update((d) => {
                        d.height = Number(e.target.value) || undefined;
                      })
                    }
                    className={inputCls}
                  />
                </Field>
              </div>
            </Panel>

            <Panel title="Reader can">
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {(
                  [
                    ["notes", "Read notes"],
                    ["walkthrough", "Play the trace"],
                    ["focus", "Focus a box"],
                    ["zoom", "Zoom and pan"],
                    ["minimap", "See a minimap"],
                    ["fullscreen", "Expand"],
                    ["download", "Download PNG"],
                    ["legend", "See the legend"],
                    ["draggable", "Drag boxes"],
                  ] as [keyof FlowchartInteractive, string][]
                ).map(([key, label]) => (
                  <Check
                    key={key}
                    label={label}
                    checked={resolveInteractive(spec)[key]}
                    onChange={(v) => setInteractiveFlag(key, v)}
                  />
                ))}
              </div>
            </Panel>

            {showTemplates && (
              <Panel title="Start from">
                <select
                  value=""
                  onChange={(e) => {
                    const t = e.target.value;
                    if (!t) return;
                    const chart = t === "starter" ? STARTER_CHART : ALL_CHARTS[t];
                    if (chart) {
                      onChange(JSON.parse(JSON.stringify(chart)));
                      setSelected(null);
                    }
                  }}
                  aria-label="Load a template"
                  className={inputCls}
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
            )}

            {showJson && (
              <Panel title="JSON">
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Btn onClick={copyJson}>{copied ? "Copied" : "Copy"}</Btn>
                    <Btn
                      onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText();
                          const parsed: unknown = JSON.parse(text);
                          if (!isFlowchartSpec(parsed)) {
                            setJsonError("That JSON has no nodes/edges arrays.");
                            return;
                          }
                          setJsonError(null);
                          onChange(parsed);
                          setSelected(null);
                        } catch {
                          setJsonError("Clipboard did not contain valid JSON.");
                        }
                      }}
                    >
                      Paste
                    </Btn>
                  </div>
                  {jsonError && <span className="text-[11px] text-signal-coral">{jsonError}</span>}
                </div>
              </Panel>
            )}
          </>
        )}
      </div>
    </div>
  );
}
