import { layoutTree } from "@/lib/tree-layout";

/**
 * Shared vocabulary for every backtracking teaching widget (subsets,
 * permutations, n-queens, palindrome partitioning, m-coloring, sudoku).
 *
 * The organising idea: every one of these problems is the same three-line
 * loop over a different set of choices, so every widget records the same
 * shape of frame and the canvas stays problem-agnostic. A problem only has
 * to say *what it chose and why it gave up*, never how to draw itself.
 *
 * Unlike the graph widgets, node coordinates are computed rather than
 * hand-placed (see layoutTree) - a search tree's shape falls out of the
 * recursion and there is nothing for an author to lay out by hand.
 */

/** A node in the state-space tree: one call frame, one candidate choice. */
export interface SearchNode {
  id: string;
  parentId: string | null;
  /** Drawn inside the node. Kept to a couple of characters where possible. */
  label: string;
  depth: number;
  /** The partial solution as of this node, for the side panel readout. */
  partial: string;
  x: number;
  y: number;
}

/**
 * `pruned` and `dead` both mean "no solution down here", and they are drawn
 * differently on purpose. `pruned` is the interesting one: the constraint
 * check rejected the choice up front, so the whole subtree was never built.
 * `dead` is a branch that was explored in full and simply produced nothing,
 * which is what you get *without* a good pruning test. Seeing the two side by
 * side is most of the argument for why pruning matters.
 */
export type NodeStatus = "active" | "onPath" | "explored" | "pruned" | "dead" | "solution";

/**
 * One frame of a backtracking run.
 *
 * `P` is the problem-specific payload (a board, a colour map, a set of cut
 * positions). It is a type parameter rather than a loose record so a widget
 * reads `step.payload.queens` with real types instead of casting an
 * `unknown` on every access.
 */
export interface BacktrackStep<P = unknown> {
  caption: string;
  /** Node ids discovered so far. Undiscovered nodes render as faint ghosts. */
  revealed: string[];
  status: Record<string, NodeStatus>;
  activeId: string | null;
  /** Root-to-current labels, rendered as the call stack. */
  path: string[];
  /** Completed solutions in discovery order. */
  solutions: string[];
  /** Nodes entered. The honest measure of work done. */
  visited: number;
  /** Branches rejected by a constraint check before being explored. */
  pruned: number;
  /** Problem-specific extras: the board, the colour map, the cut positions. */
  payload?: P;
}

/** What a problem generator hands back to a widget. */
export interface BacktrackRun<P = unknown> {
  nodes: SearchNode[];
  steps: BacktrackStep<P>[];
  /** True when the run hit the step cap and stopped early. */
  truncated: boolean;
}

/**
 * Every generator caps itself here. These trees grow factorially, and a
 * widget that quietly tries to lay out 40,000 nodes just locks the tab.
 */
export const MAX_STEPS = 600;

/**
 * Layout space the generators lay trees out in. The canvas renders this
 * through a viewBox, so these are aspect-ratio units rather than pixels and
 * a wide tree stays legible by scaling rather than clipping.
 */
export const TREE_WIDTH = 760;
export const TREE_ROW_HEIGHT = 62;

interface RecorderOptions {
  maxSteps?: number;
}

type PendingNode = Omit<SearchNode, "x" | "y">;

/**
 * Collects the frames as a problem runs. A generator calls `enter` on the way
 * down, `leave` on the way back up, and `snapshot` whenever it wants a frame
 * captured; the recorder tracks the path, the counters, and which nodes have
 * been revealed so far.
 *
 * Recording during the run rather than reconstructing afterwards is what
 * keeps the narration honest: the caption for a frame is written at the
 * moment the algorithm made that decision, with the reason still in scope.
 */
export function createRecorder<P = unknown>(options: RecorderOptions = {}) {
  const maxSteps = options.maxSteps ?? MAX_STEPS;

  const nodes: PendingNode[] = [];
  const steps: BacktrackStep<P>[] = [];
  const status: Record<string, NodeStatus> = {};
  const revealed: string[] = [];
  const solutions: string[] = [];
  const stack: PendingNode[] = [];

  let visited = 0;
  let pruned = 0;
  let counter = 0;
  let stopped = false;

  const currentId = (): string | null => stack[stack.length - 1]?.id ?? null;

  /** Everything on the stack is "on the path" unless it is the active tip. */
  function markPath(activeId: string | null) {
    for (const frame of stack) {
      if (frame.id !== activeId) status[frame.id] = "onPath";
    }
  }

  /** Capture a frame. Returns false once the cap is hit, so a generator can bail. */
  function snapshot(caption: string, extra: { activeId?: string | null; payload?: P } = {}): boolean {
    if (steps.length >= maxSteps) {
      stopped = true;
      return false;
    }

    const activeId = extra.activeId !== undefined ? extra.activeId : currentId();
    markPath(activeId);
    if (activeId && status[activeId] !== "pruned" && status[activeId] !== "solution") {
      status[activeId] = "active";
    }

    steps.push({
      caption,
      revealed: [...revealed],
      status: { ...status },
      activeId,
      path: stack.map((f) => f.label),
      solutions: [...solutions],
      visited,
      pruned,
      payload: extra.payload,
    });
    return true;
  }

  function addNode(label: string, partial: string): PendingNode {
    const parent = stack[stack.length - 1] ?? null;
    const node: PendingNode = {
      id: `n${counter++}`,
      parentId: parent?.id ?? null,
      label,
      depth: stack.length,
      partial,
    };
    nodes.push(node);
    revealed.push(node.id);
    return node;
  }

  /** Push a node and make it the active tip. Returns its id. */
  function enter(label: string, partial: string): string {
    const node = addNode(label, partial);
    stack.push(node);
    status[node.id] = "active";
    visited += 1;
    return node.id;
  }

  /**
   * Pop the active node. `outcome` records how the branch ended, which is
   * what the canvas colours it by afterwards.
   */
  function leave(outcome: Exclude<NodeStatus, "active" | "onPath"> = "explored") {
    const node = stack.pop();
    if (node) status[node.id] = outcome;
  }

  /**
   * Record a branch rejected before it was entered. It still gets a node so
   * the reader can see the choice was considered, but no subtree is built
   * under it. This is the frame that makes pruning visible.
   *
   * `payload` is worth passing for the board-based problems: a rejection
   * frame with no payload would blank the board out at exactly the moment
   * the reader wants to see which square was refused and why.
   */
  function prune(label: string, partial: string, caption: string, payload?: P) {
    const node = addNode(label, partial);
    status[node.id] = "pruned";
    pruned += 1;
    snapshot(caption, { activeId: node.id, payload });
  }

  function solution(text: string) {
    solutions.push(text);
    const id = currentId();
    if (id) status[id] = "solution";
  }

  /** Lay the tree out and hand back the finished run. */
  function finish(width: number, rowHeight: number): BacktrackRun<P> {
    return { nodes: layoutTree(nodes, width, rowHeight), steps, truncated: stopped };
  }

  return {
    get stopped() {
      return stopped;
    },
    enter,
    leave,
    prune,
    solution,
    snapshot,
    finish,
  };
}

/**
 * Re-exported so the existing widgets keep importing tree utilities from the
 * backtracking vocabulary they already depend on, while the implementation
 * lives somewhere the dynamic-programming widgets can reach it too.
 */
export { layoutTree, treeDepth } from "@/lib/tree-layout";

export function formatSet(items: (string | number)[]): string {
  return items.length === 0 ? "{ }" : `{ ${items.join(", ")} }`;
}

export function formatList(items: (string | number)[]): string {
  return items.length === 0 ? "[ ]" : `[${items.join(", ")}]`;
}
