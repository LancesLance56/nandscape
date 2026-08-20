"use client";

import { useEffect, useRef } from "react";
import { CALL_TREE_WIDTH, type CallNode, type CallStatus, type CallStep } from "@/lib/dp/types";

/**
 * The recursion tree.
 *
 * Deliberately not the backtracking search tree, even though the two look
 * similar. A search tree is about which branches were refused; this one is
 * about which calls were *repeated*, so it carries return values in the nodes
 * and rings the calls whose answer was already worked out elsewhere. Those are
 * different questions, and one renderer trying to answer both would end up
 * saying neither clearly.
 */

/** Horizontal room per leaf. Below this, sibling labels start colliding. */
const LEAF_SPACING = 66;
const NODE_W = 58;
const NODE_H = 34;

function nodeWidth(label: string): number {
  return Math.max(NODE_W, label.length * 6.6 + 12);
}

/**
 * Fill / border / text per status.
 *
 * Base cases are solid green because they are the thing every other value
 * eventually rests on, and the induction reading falls apart if the reader
 * cannot pick them out at a glance. Cache hits are copper and dashed: a hit
 * returns a real answer, so it is not a failure, but nothing was computed
 * inside it and the dashes say so.
 */
function nodeStyle(status: CallStatus | undefined, revealed: boolean) {
  if (!revealed) {
    return { fill: "transparent", stroke: "var(--border)", text: "var(--border-strong)", dash: "2 3", opacity: 0.3 };
  }
  switch (status) {
    case "active":
      return { fill: "var(--copper)", stroke: "var(--copper-dark)", text: "var(--copper-ink)", dash: undefined, opacity: 1 };
    case "onStack":
      return { fill: "var(--copper-bg)", stroke: "var(--copper)", text: "var(--copper-dark)", dash: undefined, opacity: 1 };
    case "base":
      return { fill: "var(--signal-green)", stroke: "var(--signal-green-strong)", text: "#ffffff", dash: undefined, opacity: 1 };
    case "returned":
      return {
        fill: "var(--signal-green-bg)",
        stroke: "var(--signal-green)",
        text: "var(--signal-green-strong)",
        dash: undefined,
        opacity: 1,
      };
    case "cacheHit":
      return { fill: "var(--copper-bg)", stroke: "var(--copper)", text: "var(--copper-dark)", dash: "4 3", opacity: 1 };
    default:
      return { fill: "var(--surface-2)", stroke: "var(--border-strong)", text: "var(--ink-soft)", dash: undefined, opacity: 0.9 };
  }
}

/**
 * Which calls are asking a question that was already asked.
 *
 * Computed from the finished node list rather than from the frame, so the ring
 * marking a repeat does not appear and vanish as the run moves around. The
 * first call with a given key is the original; everything after it is work the
 * program is about to do twice.
 */
function repeatedIds(nodes: CallNode[]): Set<string> {
  const seen = new Set<string>();
  const repeats = new Set<string>();
  for (const n of nodes) {
    if (seen.has(n.key)) repeats.add(n.id);
    else seen.add(n.key);
  }
  return repeats;
}

interface CallTreeCanvasProps {
  nodes: CallNode[];
  step: CallStep;
  /** Ring the calls whose answer was already computed somewhere to the left. */
  markRepeats?: boolean;
  maxHeight?: number;
}

export function CallTreeCanvas({ nodes, step, markRepeats = false, maxHeight = 340 }: CallTreeCanvasProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (nodes.length === 0) {
    return <p className="text-sm text-slate">Nothing to draw yet.</p>;
  }

  const revealed = new Set(step.revealed);
  const repeats = markRepeats ? repeatedIds(nodes) : new Set<string>();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const hasChild = new Set(nodes.map((n) => n.parentId).filter((id): id is string => Boolean(id)));
  const leaves = Math.max(nodes.filter((n) => !hasChild.has(n.id)).length, 1);
  const maxDepth = nodes.reduce((m, n) => Math.max(m, n.depth), 0);

  const renderWidth = Math.max(340, leaves * LEAF_SPACING);
  const renderHeight = (maxDepth + 1) * 60 + 24;
  const sx = (x: number) => (x * renderWidth) / CALL_TREE_WIDTH;

  const activeNode = step.activeId ? byId.get(step.activeId) : null;

  return (
    <TreeScroller scrollRef={scrollRef} activeX={activeNode ? sx(activeNode.x) : null} maxHeight={maxHeight}>
      <svg
        width={renderWidth}
        height={renderHeight}
        viewBox={`0 0 ${renderWidth} ${renderHeight}`}
        role="img"
        aria-label="Recursion call tree"
        className="block"
      >
        {nodes.map((n) => {
          if (!n.parentId) return null;
          const parent = byId.get(n.parentId);
          if (!parent) return null;
          const shown = revealed.has(n.id);
          const status = step.status[n.id];

          return (
            <line
              key={`e-${n.id}`}
              x1={sx(parent.x)}
              y1={parent.y + NODE_H / 2}
              x2={sx(n.x)}
              y2={n.y - NODE_H / 2}
              stroke={shown ? "var(--border-strong)" : "var(--border)"}
              strokeWidth={status === "onStack" || status === "active" ? 2.2 : 1.3}
              strokeDasharray={shown ? undefined : "2 3"}
              opacity={shown ? 1 : 0.3}
            />
          );
        })}

        {nodes.map((n) => {
          const shown = revealed.has(n.id);
          const status = step.status[n.id];
          const style = nodeStyle(status, shown);
          const w = nodeWidth(n.label);
          const value = step.values[n.id];
          const hasValue = shown && value !== undefined;

          return (
            <g key={n.id} opacity={style.opacity} className="transition-opacity duration-200">
              {/* The repeat ring sits outside the node rather than recolouring
                  it, so a call can be both a repeat and, say, a base case
                  without the two facts competing for the same pixels. */}
              {shown && repeats.has(n.id) && (
                <rect
                  x={sx(n.x) - w / 2 - 3.5}
                  y={n.y - NODE_H / 2 - 3.5}
                  width={w + 7}
                  height={NODE_H + 7}
                  rx={10}
                  fill="none"
                  stroke="var(--signal-coral)"
                  strokeWidth={1.4}
                  strokeDasharray="3 2"
                  opacity={0.8}
                />
              )}
              <rect
                x={sx(n.x) - w / 2}
                y={n.y - NODE_H / 2}
                width={w}
                height={NODE_H}
                rx={8}
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth={status === "active" ? 2.4 : 1.5}
                strokeDasharray={style.dash}
              />
              {shown && (
                <text
                  x={sx(n.x)}
                  y={hasValue ? n.y - 2 : n.y + 4}
                  textAnchor="middle"
                  className="text-[10.5px] font-bold"
                  fill={style.text}
                  style={{ pointerEvents: "none" }}
                >
                  {n.label}
                </text>
              )}
              {hasValue && (
                <text
                  x={sx(n.x)}
                  y={n.y + 11}
                  textAnchor="middle"
                  className="text-[10px] font-semibold tabular-nums"
                  fill={style.text}
                  style={{ pointerEvents: "none" }}
                >
                  {`= ${value}`}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </TreeScroller>
  );
}

/** Keeps the active call in view without dragging the tree around every frame. */
function TreeScroller({
  scrollRef,
  activeX,
  maxHeight,
  children,
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  activeX: number | null;
  maxHeight: number;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || activeX === null) return;

    const target = activeX - el.clientWidth / 2;
    const max = el.scrollWidth - el.clientWidth;
    const next = Math.max(0, Math.min(target, max));

    // Only nudge when the call is actually off-screen. Re-centring on every
    // frame makes the tree look like it is drifting on its own.
    const visibleLeft = el.scrollLeft + 40;
    const visibleRight = el.scrollLeft + el.clientWidth - 40;
    if (activeX < visibleLeft || activeX > visibleRight) {
      el.scrollTo({ left: next, behavior: "smooth" });
    }
  }, [activeX, scrollRef]);

  return (
    <div
      ref={scrollRef}
      style={{ maxHeight }}
      className="overflow-auto rounded-lg border border-border bg-surface-2/30 p-2"
    >
      {children}
    </div>
  );
}

/** Colour key, so the statuses are not guesswork. */
export function CallTreeLegend({ showRepeats, showHits }: { showRepeats: boolean; showHits: boolean }) {
  const items: { label: string; status: CallStatus }[] = [
    { label: "running now", status: "active" },
    { label: "waiting on a child", status: "onStack" },
    { label: "base case", status: "base" },
    { label: "returned a value", status: "returned" },
    ...(showHits ? ([{ label: "answered from the memo", status: "cacheHit" }] as const) : []),
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((item) => {
        const s = nodeStyle(item.status, true);
        return (
          <span key={item.label} className="flex items-center gap-1.5 text-[11px] text-slate">
            <span
              aria-hidden
              className="inline-block h-3 w-5 rounded-[4px] border"
              style={{
                background: s.fill === "transparent" ? "transparent" : s.fill,
                borderColor: s.stroke,
                borderStyle: s.dash ? "dashed" : "solid",
              }}
            />
            {item.label}
          </span>
        );
      })}
      {showRepeats && (
        <span className="flex items-center gap-1.5 text-[11px] text-slate">
          <span
            aria-hidden
            className="inline-block h-3 w-5 rounded-[4px] border border-dashed"
            style={{ borderColor: "var(--signal-coral)" }}
          />
          a question already answered elsewhere
        </span>
      )}
    </div>
  );
}
