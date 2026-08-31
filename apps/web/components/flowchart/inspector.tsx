"use client";

import { cn } from "@/lib/cn";
import { ACCENT_NAMES } from "@/components/content/blocks/interactive/flowchart/flowchart-nodes";
import { edgeIndex } from "@/lib/flowchart/edit";
import {
  edgeKey,
  resolveInteractive,
  type FlowAccent,
  type FlowEdge,
  type FlowEdgeKind,
  type FlowNode,
  type FlowNodeType,
  type FlowSide,
  type FlowchartInteractive,
  type FlowchartSpec,
} from "@/lib/flowchart/types";
import { Btn, Check, Field, Section, inputCls } from "./controls";

const NODE_TYPES: { id: FlowNodeType; label: string }[] = [
  { id: "start", label: "Start" },
  { id: "process", label: "Process" },
  { id: "decision", label: "Decision" },
  { id: "io", label: "Input / output" },
  { id: "end", label: "End" },
  { id: "group", label: "Group" },
];

const EDGE_KINDS: { id: FlowEdgeKind | ""; label: string }[] = [
  { id: "", label: "auto" },
  { id: "solid", label: "solid" },
  { id: "dashed", label: "dashed" },
  { id: "loop", label: "loop" },
];

const SIDES: FlowSide[] = ["top", "right", "bottom", "left"];

export interface InspectorProps {
  spec: FlowchartSpec;
  edit: (fn: (draft: FlowchartSpec) => void, coalesce?: string) => void;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onDeleteNode: (id: string) => void;
  onDeleteEdge: (key: string) => void;
  /** Chart-wide settings only make sense where the chart is the document. */
  showChartSettings?: boolean;
}

/**
 * One panel that shows whatever is selected.
 *
 * The previous editor had five tabs, and the tab you needed was almost never
 * the tab you were on: selecting a box put its properties behind a click, and
 * editing an arrow meant finding it in a list of every arrow in the chart.
 * Selection is the only context that matters here, so it drives the panel
 * outright - and with nothing selected the panel becomes the place for the
 * settings that belong to the chart as a whole.
 */
export function Inspector({
  spec,
  edit,
  selectedNodeId,
  selectedEdgeId,
  onDeleteNode,
  onDeleteEdge,
  showChartSettings = true,
}: InspectorProps) {
  const node = selectedNodeId ? spec.nodes.find((n) => n.id === selectedNodeId) : undefined;
  const edgeAt = selectedEdgeId ? edgeIndex(spec, selectedEdgeId) : -1;
  const edge = edgeAt >= 0 ? spec.edges[edgeAt] : undefined;

  const labelOf = (id: string) => spec.nodes.find((n) => n.id === id)?.text.replace(/\n/g, " ") ?? id;

  const patchNode = (patch: Partial<FlowNode>, coalesce?: string) =>
    edit((d) => {
      const target = d.nodes.find((n) => n.id === selectedNodeId);
      if (target) Object.assign(target, patch);
    }, coalesce);

  if (node) {
    const groups = spec.nodes.filter((n) => n.type === "group" && n.id !== node.id);

    return (
      <>
        <Section title={node.type === "group" ? "Group" : "Box"}>
          <div className="flex flex-col gap-2.5">
            <Field label="Label" hint="Or double-click the box on the canvas and type.">
              <textarea
                value={node.text}
                onChange={(e) => patchNode({ text: e.target.value }, `text:${node.id}`)}
                rows={2}
                className={cn(inputCls, "resize-y")}
              />
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Shape">
                <select
                  value={node.type}
                  onChange={(e) => patchNode({ type: e.target.value as FlowNodeType })}
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
                  value={node.accent ?? ""}
                  onChange={(e) => patchNode({ accent: (e.target.value || undefined) as FlowAccent })}
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

            <Field label="Note" hint="Shown to a reader who clicks this box. The why, not the what.">
              <textarea
                value={node.note ?? ""}
                onChange={(e) => patchNode({ note: e.target.value || undefined }, `note:${node.id}`)}
                rows={3}
                placeholder="Why this step exists"
                className={cn(inputCls, "resize-y")}
              />
            </Field>
          </div>
        </Section>

        <Section title="Placement">
          <div className="flex flex-col gap-2.5">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Badge">
                <input
                  value={node.badge ?? ""}
                  onChange={(e) => patchNode({ badge: e.target.value || undefined }, `badge:${node.id}`)}
                  placeholder="e.g. 1"
                  className={inputCls}
                />
              </Field>
              <Field label="Inside group">
                <select
                  value={node.parentId ?? ""}
                  onChange={(e) => patchNode({ parentId: e.target.value || undefined })}
                  className={inputCls}
                  disabled={groups.length === 0}
                >
                  <option value="">none</option>
                  {groups.map((g) => (
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
                  value={node.lane ?? ""}
                  onChange={(e) => patchNode({ lane: e.target.value || undefined })}
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

            {node.type === "group" && (
              <Field label="Stack children">
                <select
                  value={node.groupLayout ?? "column"}
                  onChange={(e) => patchNode({ groupLayout: e.target.value as "row" | "column" })}
                  className={inputCls}
                >
                  <option value="column">stacked</option>
                  <option value="row">side by side</option>
                </select>
              </Field>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Check
                checked={node.mono ?? false}
                onChange={(v) => patchNode({ mono: v || undefined })}
                label="Mono font"
              />
              {node.position && (
                <Btn onClick={() => patchNode({ position: undefined })} title="Hand this box back to the layout">
                  Unpin
                </Btn>
              )}
            </div>
            {node.position && (
              <p className="text-[10px] leading-snug text-slate">
                Pinned at {node.position.x}, {node.position.y} because it was dragged. Unpin to let the
                automatic layout place it again.
              </p>
            )}
          </div>
        </Section>

        <Section title="Danger">
          <Btn tone="danger" onClick={() => onDeleteNode(node.id)}>
            Delete this box
          </Btn>
        </Section>
      </>
    );
  }

  if (edge) {
    const patchEdge = (fn: (e: FlowEdge) => void, coalesce?: string) =>
      edit((d) => {
        const target = d.edges[edgeAt];
        if (target) fn(target);
      }, coalesce);

    return (
      <>
        <Section title="Arrow">
          <div className="flex flex-col gap-2.5">
            <p className="rounded-md border border-border bg-surface-2/50 px-2 py-1.5 text-[11px] text-ink-soft">
              {labelOf(edge.from)} <span className="text-slate">to</span> {labelOf(edge.to)}
            </p>

            <Field label="Label" hint="Branches out of a decision need one each, usually yes and no.">
              <input
                value={edge.label ?? ""}
                onChange={(e) =>
                  patchEdge((x) => {
                    x.label = e.target.value || undefined;
                  }, `edge-label:${selectedEdgeId}`)
                }
                placeholder="yes"
                className={inputCls}
              />
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Style">
                <select
                  value={edge.kind ?? ""}
                  onChange={(e) =>
                    patchEdge((x) => {
                      x.kind = (e.target.value || undefined) as FlowEdgeKind;
                    })
                  }
                  className={inputCls}
                >
                  {EDGE_KINDS.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Colour">
                <select
                  value={edge.accent ?? ""}
                  onChange={(e) =>
                    patchEdge((x) => {
                      x.accent = (e.target.value || undefined) as FlowAccent;
                    })
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
              <Field label="Leaves from">
                <select
                  value={edge.fromSide ?? ""}
                  onChange={(e) =>
                    patchEdge((x) => {
                      x.fromSide = (e.target.value || undefined) as FlowSide;
                    })
                  }
                  className={inputCls}
                >
                  <option value="">auto</option>
                  {SIDES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Arrives at">
                <select
                  value={edge.toSide ?? ""}
                  onChange={(e) =>
                    patchEdge((x) => {
                      x.toSide = (e.target.value || undefined) as FlowSide;
                    })
                  }
                  className={inputCls}
                >
                  <option value="">auto</option>
                  {SIDES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Check
              checked={edge.animated ?? false}
              onChange={(v) =>
                patchEdge((x) => {
                  x.animated = v || undefined;
                })
              }
              label="Animate the dashes"
            />
          </div>
        </Section>

        <Section title="Danger">
          <div className="flex flex-wrap gap-2">
            <Btn
              onClick={() =>
                patchEdge((x) => {
                  const from = x.from;
                  x.from = x.to;
                  x.to = from;
                  // The chosen sides described the old direction, so keeping
                  // them would attach the reversed arrow to the wrong edges
                  // of both boxes.
                  delete x.fromSide;
                  delete x.toSide;
                })
              }
            >
              Reverse
            </Btn>
            <Btn tone="danger" onClick={() => onDeleteEdge(edgeKey(edge))}>
              Delete this arrow
            </Btn>
          </div>
        </Section>
      </>
    );
  }

  if (!showChartSettings) {
    return (
      <Section title="Nothing selected">
        <p className="text-[11px] leading-relaxed text-slate">Click a box or an arrow to edit it.</p>
      </Section>
    );
  }

  const interactive = resolveInteractive(spec);
  const setFlag = (key: keyof FlowchartInteractive, value: boolean) =>
    edit((d) => {
      d.interactive = { ...(d.interactive ?? {}), [key]: value };
    });

  return (
    <>
      <Section title="Chart">
        <div className="flex flex-col gap-2.5">
          <Field label="Title">
            <input
              value={spec.title ?? ""}
              onChange={(e) =>
                edit((d) => {
                  d.title = e.target.value || undefined;
                }, "title")
              }
              placeholder="Untitled chart"
              className={inputCls}
            />
          </Field>
          <Field label="Subtitle">
            <input
              value={spec.subtitle ?? ""}
              onChange={(e) =>
                edit((d) => {
                  d.subtitle = e.target.value || undefined;
                }, "subtitle")
              }
              className={inputCls}
            />
          </Field>
          <Field label="Flow direction">
            <select
              value={spec.direction ?? "TB"}
              onChange={(e) =>
                edit((d) => {
                  d.direction = e.target.value as "TB" | "LR";
                })
              }
              className={inputCls}
            >
              <option value="TB">top to bottom</option>
              <option value="LR">left to right</option>
            </select>
          </Field>
        </div>
      </Section>

      <Section
        title={`Lanes (${spec.lanes?.length ?? 0})`}
        right={
          <Btn
            onClick={() =>
              edit((d) => {
                d.lanes = [...(d.lanes ?? []), { id: `lane${Date.now().toString(36)}`, label: "New lane" }];
              })
            }
          >
            Add
          </Btn>
        }
      >
        <div className="flex flex-col gap-2">
          <p className="text-[10px] leading-snug text-slate">
            Labelled columns that say where each step runs. Assign a box to one from its own panel.
          </p>
          {(spec.lanes ?? []).map((lane, i) => (
            <div key={lane.id} className="flex items-center gap-1.5">
              <input
                value={lane.label}
                onChange={(e) =>
                  edit((d) => {
                    d.lanes![i].label = e.target.value;
                  }, `lane:${lane.id}`)
                }
                aria-label="Lane name"
                className={cn(inputCls, "min-w-0 flex-1")}
              />
              <button
                type="button"
                onClick={() =>
                  edit((d) => {
                    const removed = d.lanes![i].id;
                    d.lanes = d.lanes!.filter((_, k) => k !== i);
                    for (const n of d.nodes) if (n.lane === removed) delete n.lane;
                  })
                }
                aria-label={`Remove lane ${lane.label}`}
                className="shrink-0 rounded px-1.5 text-signal-coral hover:bg-surface-2"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title={`Trace (${spec.walkthrough?.length ?? 0} steps)`}
        right={
          <Btn
            onClick={() =>
              edit((d) => {
                d.walkthrough = [...(d.walkthrough ?? []), { caption: "What happens here" }];
              })
            }
          >
            Add
          </Btn>
        }
      >
        <div className="flex flex-col gap-2">
          <p className="text-[10px] leading-snug text-slate">
            An ordered path through the chart. Readers get play and step controls, and everything ahead of
            the current step stays dimmed.
          </p>
          {(spec.walkthrough ?? []).map((step, i) => (
            <div key={i} className="rounded-md border border-border bg-surface p-2">
              <div className="mb-1.5 flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate">{i + 1}</span>
                <button
                  type="button"
                  onClick={() =>
                    edit((d) => {
                      d.walkthrough = d.walkthrough!.filter((_, k) => k !== i);
                    })
                  }
                  aria-label={`Remove step ${i + 1}`}
                  className="ml-auto rounded px-1.5 text-signal-coral hover:bg-surface-2"
                >
                  &times;
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                <select
                  value={step.node ?? ""}
                  onChange={(e) =>
                    edit((d) => {
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
                    edit((d) => {
                      d.walkthrough![i].edge = e.target.value || undefined;
                    })
                  }
                  aria-label="Step arrow"
                  className={inputCls}
                >
                  <option value="">no arrow</option>
                  {spec.edges.map((e) => (
                    <option key={edgeKey(e)} value={edgeKey(e)}>
                      {labelOf(e.from)} to {labelOf(e.to)}
                    </option>
                  ))}
                </select>
                <textarea
                  value={step.caption}
                  onChange={(e) =>
                    edit((d) => {
                      d.walkthrough![i].caption = e.target.value;
                    }, `caption:${i}`)
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
      </Section>

      <Section title="Readers can">
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
            <Check key={key} label={label} checked={interactive[key]} onChange={(v) => setFlag(key, v)} />
          ))}
        </div>
      </Section>
    </>
  );
}
