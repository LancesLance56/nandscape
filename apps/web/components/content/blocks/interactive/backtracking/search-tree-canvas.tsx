"use client";

import { TREE_WIDTH, type BacktrackStep, type NodeStatus, type SearchNode } from "@/lib/backtracking/types";
import { cn } from "@/lib/cn";
import { RfTree, type RfTreeNode } from "../shared/rf-tree";

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
 * The tree is a React Flow canvas: it pans and zooms live rather than
 * scrolling. Layout coordinates arrive normalised to TREE_WIDTH from
 * layoutTree and are scaled to pixels here (not via a viewBox, which would
 * shrink the labels along with the spacing and make a wide tree unreadable).
 */
export function SearchTreeCanvas({ nodes, step, showGhosts = true, maxHeight = 300, view = "tree" }: SearchTreeCanvasProps) {
  const revealed = new Set(step.revealed);

  if (nodes.length === 0) {
    return <p className="text-sm text-slate">Nothing to draw yet.</p>;
  }

  const hasChild = new Set(nodes.map((n) => n.parentId).filter((id): id is string => Boolean(id)));
  const leafCount = Math.max(nodes.filter((n) => !hasChild.has(n.id)).length, 1);
  const maxDepth = nodes.reduce((m, n) => Math.max(m, n.depth), 0);

  if (view === "profile") {
    return <TreeShapeSummary nodes={nodes} step={step} maxDepth={maxDepth} leafCount={leafCount} />;
  }

  const renderWidth = Math.max(360, leafCount * LEAF_SPACING);
  const renderHeight = (maxDepth + 1) * 62 + 20;

  const treeNodes: RfTreeNode[] = [];
  for (const n of nodes) {
    const shown = revealed.has(n.id);
    if (!shown && !showGhosts) continue;

    const status = step.status[n.id];
    const style = nodeStyle(status, shown);
    const isPruned = status === "pruned";

    treeNodes.push({
      id: n.id,
      parentId: n.parentId,
      x: n.x,
      y: n.y,
      width: nodeWidth(n.label),
      label: shown ? n.label : "",
      fill: style.fill,
      stroke: style.stroke,
      text: style.text,
      dash: style.dash,
      strokeWidth: status === "active" ? 2.4 : 1.5,
      opacity: style.opacity,
      slash: isPruned && shown,
      edgeStroke: isPruned ? "var(--signal-coral)" : shown ? "var(--border-strong)" : "var(--border)",
      edgeWidth: status === "onPath" || status === "active" ? 2.2 : 1.3,
      edgeDash: isPruned ? "4 3" : !shown ? "2 3" : undefined,
      edgeOpacity: shown ? (isPruned ? 0.6 : 1) : 0.3,
    });
  }

  return (
    <RfTree
      nodes={treeNodes}
      layoutWidth={TREE_WIDTH}
      renderWidth={renderWidth}
      renderHeight={renderHeight}
      nodeHeight={NODE_H}
      activeId={step.activeId}
      maxHeight={maxHeight}
      ariaLabel="Backtracking search tree"
    />
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
