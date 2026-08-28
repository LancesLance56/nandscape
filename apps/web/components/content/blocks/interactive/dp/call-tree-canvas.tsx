"use client";

import { CALL_TREE_WIDTH, type CallNode, type CallStatus, type CallStep } from "@/lib/dp/types";
import { RfTree, type RfTreeNode } from "../shared/rf-tree";

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
  if (nodes.length === 0) {
    return <p className="text-sm text-slate">Nothing to draw yet.</p>;
  }

  const revealed = new Set(step.revealed);
  const repeats = markRepeats ? repeatedIds(nodes) : new Set<string>();
  const hasChild = new Set(nodes.map((n) => n.parentId).filter((id): id is string => Boolean(id)));
  const leaves = Math.max(nodes.filter((n) => !hasChild.has(n.id)).length, 1);
  const maxDepth = nodes.reduce((m, n) => Math.max(m, n.depth), 0);

  const renderWidth = Math.max(340, leaves * LEAF_SPACING);
  const renderHeight = (maxDepth + 1) * 60 + 24;

  const treeNodes: RfTreeNode[] = nodes.map((n) => {
    const shown = revealed.has(n.id);
    const status = step.status[n.id];
    const style = nodeStyle(status, shown);
    const value = step.values[n.id];
    const hasValue = shown && value !== undefined;

    return {
      id: n.id,
      parentId: n.parentId,
      x: n.x,
      y: n.y,
      width: nodeWidth(n.label),
      label: shown ? n.label : "",
      sublabel: hasValue ? `= ${value}` : undefined,
      fill: style.fill,
      stroke: style.stroke,
      text: style.text,
      dash: style.dash,
      strokeWidth: status === "active" ? 2.4 : 1.5,
      opacity: style.opacity,
      ring: shown && repeats.has(n.id),
      edgeStroke: shown ? "var(--border-strong)" : "var(--border)",
      edgeWidth: status === "onStack" || status === "active" ? 2.2 : 1.3,
      edgeDash: shown ? undefined : "2 3",
      edgeOpacity: shown ? 1 : 0.3,
    };
  });

  return (
    <RfTree
      nodes={treeNodes}
      layoutWidth={CALL_TREE_WIDTH}
      renderWidth={renderWidth}
      renderHeight={renderHeight}
      nodeHeight={NODE_H}
      activeId={step.activeId}
      maxHeight={maxHeight}
      ariaLabel="Recursion call tree"
    />
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
