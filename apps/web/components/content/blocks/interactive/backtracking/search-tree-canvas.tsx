"use client";

import { useEffect, useRef } from "react";
import { TREE_WIDTH, type BacktrackStep, type NodeStatus, type SearchNode } from "@/lib/backtracking/types";
import { cn } from "@/lib/cn";

/** Horizontal room per leaf. Below this, sibling labels start colliding. */
const LEAF_SPACING = 44;
/** Above this the drawn tree stops being readable and becomes a summary. */
const MAX_DRAWABLE_LEAVES = 60;

/** Which of the two views the canvas renders. */
export type TreeView = "tree" | "profile";

/**
 * Whether a drawn tree would still be legible at this size. Used only to
 * warn, never to switch views: choosing automatically made the component
 * appear to alternate between two visualisations for no reason the reader
 * could see, because leaf count varies with how lucky the search gets.
 */
export function isTreeDrawable(nodes: SearchNode[]): boolean {
  if (nodes.length === 0) return false;
  const hasChild = new Set(nodes.map((n) => n.parentId).filter((id): id is string => Boolean(id)));
  return nodes.filter((n) => !hasChild.has(n.id)).length <= MAX_DRAWABLE_LEAVES;
}
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
  /** Which view to render. Chosen by the caller, never inferred here. */
  view?: TreeView;
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
export function SearchTreeCanvas({ nodes, step, showGhosts = true, maxHeight = 300, view = "tree" }: SearchTreeCanvasProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const revealed = new Set(step.revealed);

  if (nodes.length === 0) {
    return <p className="text-sm text-slate">Nothing to draw yet.</p>;
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const hasChild = new Set(nodes.map((n) => n.parentId).filter((id): id is string => Boolean(id)));
  const leafCount = Math.max(nodes.filter((n) => !hasChild.has(n.id)).length, 1);
  const maxDepth = nodes.reduce((m, n) => Math.max(m, n.depth), 0);

  if (view === "profile") {
    return <TreeShapeSummary nodes={nodes} step={step} maxDepth={maxDepth} leafCount={leafCount} />;
  }

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

/**
 * What replaces the tree once it is too wide to draw: one bar per level,
 * showing how many nodes the search has opened at that depth so far.
 *
 * This is not a consolation prize. On a large run the interesting question
 * is not what any individual node holds, it is where the work is going, and
 * a depth profile answers that directly: a search that keeps failing near
 * the top looks completely different from one grinding away at the bottom.
 */
function TreeShapeSummary({
  nodes,
  step,
  maxDepth,
  leafCount,
}: {
  nodes: SearchNode[];
  step: BacktrackStep<unknown>;
  maxDepth: number;
  leafCount: number;
}) {
  const revealed = new Set(step.revealed);
  const total = new Array(maxDepth + 1).fill(0);
  const seen = new Array(maxDepth + 1).fill(0);
  const cut = new Array(maxDepth + 1).fill(0);

  for (const n of nodes) {
    total[n.depth] += 1;
    if (!revealed.has(n.id)) continue;
    seen[n.depth] += 1;
    if (step.status[n.id] === "pruned") cut[n.depth] += 1;
  }

  const widest = Math.max(...total, 1);
  const activeDepth = step.activeId ? (nodes.find((n) => n.id === step.activeId)?.depth ?? null) : null;

  return (
    <div className="rounded-lg border border-border bg-surface-2/30 p-3">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-[11px] font-semibold text-slate">Where the search is spending its time</span>
        <span className="text-[10px] text-slate">
          {nodes.length} nodes, {leafCount} leaves, {maxDepth + 1} levels
        </span>
      </div>

      {/* Capped rather than full-bleed: stretched across a wide card the
          bars would be metres from their own counts. */}
      <div className="flex max-w-2xl flex-col gap-0.5">
        {total.map((count, depth) => {
          const openedPct = (seen[depth] / widest) * 100;
          const cutPct = (cut[depth] / widest) * 100;
          const isActive = depth === activeDepth;

          return (
            <div key={depth} className="flex items-center gap-2">
              <span
                className={cn(
                  "w-12 shrink-0 text-right font-mono text-[10px] tabular-nums",
                  isActive ? "font-bold text-copper-dark" : "text-slate",
                )}
              >
                depth {depth}
              </span>
              <div className="relative h-3 min-w-0 flex-1 overflow-hidden rounded-[3px] bg-surface-3/60">
                <div
                  className={cn("absolute inset-y-0 left-0 transition-all duration-200", isActive ? "bg-copper" : "bg-border-strong")}
                  style={{ width: `${openedPct}%` }}
                />
                {/* Rejected branches sit on the right of the opened bar, so
                    the split between explored and cut is readable per level. */}
                <div
                  className="absolute inset-y-0 bg-signal-coral/70 transition-all duration-200"
                  style={{ left: `${openedPct - cutPct}%`, width: `${cutPct}%` }}
                />
              </div>
              <span className="w-14 shrink-0 font-mono text-[10px] tabular-nums text-slate">
                {seen[depth]}/{total[depth]}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-slate">
        One bar per level of the search. Copper is the level being worked on now, grey is opened, coral is rejected
        before exploring. Useful when the tree itself is too wide to read: this one is {leafCount} leaves across.
      </p>
    </div>
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
