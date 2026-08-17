"use client";

import { useId } from "react";
import { layoutFlowchart, type FlowchartSpec, type PlacedNode } from "@/lib/flowchart/types";
import { cn } from "@/lib/cn";

/** Standard flowchart shapes: pill for terminals, diamond for decisions. */
function shapeFor(node: PlacedNode, fill: string, stroke: string, strokeWidth: number) {
  const { x, y, w, h } = node;

  if (node.type === "start" || node.type === "end") {
    return <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  }
  if (node.type === "decision") {
    const pts = `${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`;
    return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />;
  }
  if (node.type === "io") {
    const skew = 14;
    const pts = `${x + skew},${y} ${x + w},${y} ${x + w - skew},${y + h} ${x},${y + h}`;
    return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />;
  }
  return <rect x={x} y={y} width={w} height={h} rx={7} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
}

const PALETTE: Record<PlacedNode["type"], { fill: string; stroke: string; text: string }> = {
  start: { fill: "var(--signal-green)", stroke: "var(--signal-green)", text: "#ffffff" },
  end: { fill: "var(--signal-green)", stroke: "var(--signal-green)", text: "#ffffff" },
  decision: { fill: "var(--copper-bg)", stroke: "var(--copper)", text: "var(--copper-dark)" },
  process: { fill: "var(--surface-card)", stroke: "var(--border-strong)", text: "var(--ink)" },
  io: { fill: "var(--surface-2)", stroke: "var(--border-strong)", text: "var(--ink)" },
};

export function FlowchartCanvas({
  spec,
  selectedId,
  onSelect,
  maxHeight = 620,
  className,
}: {
  spec: FlowchartSpec;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  maxHeight?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const layout = layoutFlowchart(spec);

  if (layout.nodes.length === 0) {
    return <p className="rounded-lg border border-dashed border-border-strong p-6 text-center text-sm text-slate">Nothing to draw yet.</p>;
  }

  return (
    <div className={cn("overflow-auto rounded-lg border border-border bg-surface-2/30 p-3", className)} style={{ maxHeight }}>
      <svg
        width={layout.width}
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="img"
        aria-label={spec.title ? `${spec.title} flowchart` : "Flowchart"}
        className="block"
      >
        <defs>
          <marker id={`${uid}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--border-strong)" />
          </marker>
          <marker id={`${uid}-arrow-loop`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--copper)" />
          </marker>
        </defs>

        {layout.edges.map((edge, i) => {
          if (edge.points.length < 2) return null;
          const d = edge.points.map((pt, k) => `${k === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ");

          return (
            <g key={`e-${i}`}>
              <path
                d={d}
                fill="none"
                stroke={edge.back ? "var(--copper)" : "var(--border-strong)"}
                strokeWidth={edge.back ? 1.8 : 1.6}
                strokeDasharray={edge.back ? "5 4" : undefined}
                markerEnd={`url(#${uid}-${edge.back ? "arrow-loop" : "arrow"})`}
              />
              {edge.label && edge.labelAt && (
                <>
                  <rect
                    x={edge.labelAt.x - edge.label.length * 3.4 - 4}
                    y={edge.labelAt.y - 8}
                    width={edge.label.length * 6.8 + 8}
                    height={15}
                    rx={4}
                    fill="var(--surface-card)"
                    stroke="var(--border)"
                    strokeWidth={0.8}
                  />
                  <text
                    x={edge.labelAt.x}
                    y={edge.labelAt.y + 3}
                    textAnchor="middle"
                    className="text-[10px] font-bold"
                    fill={edge.back ? "var(--copper-dark)" : "var(--slate)"}
                  >
                    {edge.label}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {layout.nodes.map((node) => {
          const colors = PALETTE[node.type];
          const selected = selectedId === node.id;
          const lines = node.text.split("\n");
          const clickable = Boolean(onSelect);

          return (
            <g
              key={node.id}
              onClick={clickable ? () => onSelect?.(node.id) : undefined}
              style={clickable ? { cursor: "pointer" } : undefined}
              className="transition-opacity"
            >
              {shapeFor(node, colors.fill, selected ? "var(--ink)" : colors.stroke, selected ? 3 : 1.8)}
              {lines.map((line, li) => (
                <text
                  key={li}
                  x={node.x + node.w / 2}
                  y={node.y + node.h / 2 + 4 - ((lines.length - 1) * 15) / 2 + li * 15}
                  textAnchor="middle"
                  className="text-[11px] font-semibold"
                  fill={colors.text}
                  style={{ pointerEvents: "none" }}
                >
                  {line}
                </text>
              ))}
              {node.note && (
                <circle
                  cx={node.x + node.w - 8}
                  cy={node.y + 8}
                  r={3}
                  fill={selected ? "var(--ink)" : "var(--copper)"}
                  style={{ pointerEvents: "none" }}
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function FlowchartLegend() {
  const item = (label: string, node: React.ReactNode) => (
    <span key={label} className="flex items-center gap-1.5 text-[11px] text-slate">
      {node}
      {label}
    </span>
  );
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {item("start / end", <span className="inline-block h-3 w-6 rounded-full bg-signal-green" />)}
      {item("process", <span className="inline-block h-3 w-6 rounded-[3px] border-2 border-border-strong bg-surface-card" />)}
      {item(
        "decision",
        <svg width="18" height="12" aria-hidden>
          <polygon points="9,0 18,6 9,12 0,6" fill="var(--copper-bg)" stroke="var(--copper)" strokeWidth="1.5" />
        </svg>,
      )}
      {item("loop back", <span className="inline-block h-0 w-6 border-t-2 border-dashed border-copper" />)}
    </div>
  );
}
