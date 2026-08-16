"use client";

import { useEffect, useRef } from "react";
import { TREE_WIDTH, type BacktrackStep, type NodeStatus, type SearchNode } from "@/lib/backtracking/types";

/** Horizontal room per leaf. Below this, sibling labels start colliding. */
const LEAF_SPACING = 44;
const NODE_H = 24;
const MIN_NODE_W = 26;

function nodeWidth(label: string): number {
  return Math.max(MIN_NODE_W, label.length * 7.2 + 14);
}

/**
 * Fill / text / border per status. Pruned and dead are deliberately
 * different: pruned is a branch the constraint check refused to build (drawn
 * dashed and hollow, because there is nothing underneath it), dead is a
 * branch that was fully built and simply produced no answer.
 */
function nodeStyle(status: NodeStatus | undefined, revealed: boolean) {
  if (!revealed) {
    return { fill: "transparent", stroke: "var(--border)", text: "var(--border-strong)", dash: "2 3", opacity: 0.35 };
  }
  switch (status) {
    case "active":
      return { fill: "var(--copper)", stroke: "var(--copper-dark)", text: "#ffffff", dash: undefined, opacity: 1 };
    case "onPath":
      return { fill: "var(--copper-bg)", stroke: "var(--copper)", text: "var(--copper-dark)", dash: undefined, opacity: 1 };
    case "solution":
      return { fill: "var(--signal-green)", stroke: "var(--signal-green)", text: "#ffffff", dash: undefined, opacity: 1 };
    case "pruned":
      return { fill: "transparent", stroke: "var(--signal-coral)", text: "var(--signal-coral)", dash: "4 3", opacity: 0.9 };
    case "dead":
      return { fill: "var(--surface-2)", stroke: "var(--border-strong)", text: "var(--slate)", dash: undefined, opacity: 0.65 };
    default:
      return { fill: "var(--surface-2)", stroke: "var(--border-strong)", text: "var(--ink-soft)", dash: undefined, opacity: 0.9 };
  }
}

interface SearchTreeCanvasProps {
  nodes: SearchNode[];
  step: BacktrackStep<unknown>;
  /** Draw nodes not yet reached as faint outlines, so the tree keeps its final
   *  shape from frame one instead of jumping around as it grows. */
  showGhosts?: boolean;
  maxHeight?: number;
}

/**
 * The state-space tree. Draws whatever a BacktrackStep describes and knows
 * nothing about which problem produced it, which is what lets subsets,
 * permutations, n-queens, palindromes and colouring share one renderer.
 *
 * Coordinates arrive normalised to TREE_WIDTH from layoutTree, and get scaled
 * here rather than through a viewBox: scaling the viewBox would shrink the
 * labels along with the spacing, and a wide tree would end up unreadable
 * instead of merely scrollable.
 */
export function SearchTreeCanvas({ nodes, step, showGhosts = true, maxHeight = 340 }: SearchTreeCanvasProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const revealed = new Set(step.revealed);

  if (nodes.length === 0) {
    return <p className="text-sm text-slate">Nothing to draw yet.</p>;
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const hasChild = new Set(nodes.map((n) => n.parentId).filter((id): id is string => Boolean(id)));
  const leafCount = Math.max(nodes.filter((n) => !hasChild.has(n.id)).length, 1);
  const maxDepth = nodes.reduce((m, n) => Math.max(m, n.depth), 0);

  const renderWidth = Math.max(360, leafCount * LEAF_SPACING);
  const renderHeight = (maxDepth + 1) * 62 + 20;
  const sx = (x: number) => (x * renderWidth) / TREE_WIDTH;

  const activeNode = step.activeId ? byId.get(step.activeId) : null;

  return (
    <TreeScroller scrollRef={scrollRef} activeX={activeNode ? sx(activeNode.x) : null} maxHeight={maxHeight}>
      <svg
        width={renderWidth}
        height={renderHeight}
        viewBox={`0 0 ${renderWidth} ${renderHeight}`}
        role="img"
        aria-label="Backtracking search tree"
        className="block"
      >
        {nodes.map((n) => {
          if (!n.parentId) return null;
          const parent = byId.get(n.parentId);
          if (!parent) return null;

          const shown = revealed.has(n.id);
          if (!shown && !showGhosts) return null;

          const status = step.status[n.id];
          const isPruned = status === "pruned";

          return (
            <line
              key={`e-${n.id}`}
              x1={sx(parent.x)}
              y1={parent.y + NODE_H / 2}
              x2={sx(n.x)}
              y2={n.y - NODE_H / 2}
              stroke={isPruned ? "var(--signal-coral)" : shown ? "var(--border-strong)" : "var(--border)"}
              strokeWidth={status === "onPath" || status === "active" ? 2.2 : 1.3}
              strokeDasharray={isPruned ? "4 3" : !shown ? "2 3" : undefined}
              opacity={shown ? (isPruned ? 0.6 : 1) : 0.3}
            />
          );
        })}

        {nodes.map((n) => {
          const shown = revealed.has(n.id);
          if (!shown && !showGhosts) return null;

          const status = step.status[n.id];
          const style = nodeStyle(status, shown);
          const w = nodeWidth(n.label);

          return (
            <g key={n.id} opacity={style.opacity} className="transition-opacity duration-200">
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
                  y={n.y + 4}
                  textAnchor="middle"
                  className="text-[11px] font-bold"
                  fill={style.text}
                  style={{ pointerEvents: "none" }}
                >
                  {n.label}
                </text>
              )}
              {/* A slash through rejected nodes, so the reason reads even in
                  a screenshot where the coral border alone is ambiguous. */}
              {status === "pruned" && shown && (
                <line
                  x1={sx(n.x) - w / 2 + 4}
                  y1={n.y + NODE_H / 2 - 4}
                  x2={sx(n.x) + w / 2 - 4}
                  y2={n.y - NODE_H / 2 + 4}
                  stroke="var(--signal-coral)"
                  strokeWidth={1.4}
                  opacity={0.75}
                />
              )}
            </g>
          );
        })}
      </svg>
    </TreeScroller>
  );
}

/** Keeps the active node in view as the search walks sideways. */
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

    // Only nudge when the node is actually off-screen, otherwise every frame
    // re-centres the view and the tree appears to drift on its own.
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

/** Colour key for the tree, so the statuses are not guesswork. */
export function TreeLegend({ showDead = true }: { showDead?: boolean }) {
  const items: { label: string; status: NodeStatus }[] = [
    { label: "on the current path", status: "onPath" },
    { label: "trying now", status: "active" },
    { label: "solution", status: "solution" },
    { label: "rejected before exploring", status: "pruned" },
    ...(showDead ? ([{ label: "explored, found nothing", status: "dead" }] as const) : []),
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
    </div>
  );
}
