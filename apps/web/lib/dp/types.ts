/**
 * Shared vocabulary for the dynamic-programming teaching widgets.
 *
 * Two shapes cover everything in the section. A *call tree* is what a plain
 * recursive function does, one node per call, and it is where memoisation is
 * argued for: you can watch the same call happen five times. A *table* is what
 * the bottom-up version fills in, one cell per subproblem, and it is where the
 * recurrence becomes something you can point at.
 *
 * Both are recorded frame by frame while the real algorithm runs, rather than
 * reconstructed afterwards, so the caption on a frame is written at the moment
 * that decision was made with the reason still in scope. That is the rule the
 * backtracking widgets follow, and it is here for the same reason.
 */

import { layoutTree, type Placed } from "@/lib/tree-layout";

/* -------------------------------------------------------------------------- */
/* Call trees                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * What happened to one call.
 *
 * `cacheHit` is the status this whole section is built around. A cache hit and
 * a base case both return immediately, and drawing them the same way would
 * hide the only interesting difference between the slow version and the fast
 * one, so they are separate on purpose.
 */
export type CallStatus = "pending" | "active" | "onStack" | "base" | "returned" | "cacheHit";

/** One call in the recursion tree. Positions come from the shared layout. */
export interface PendingCall {
  id: string;
  parentId: string | null;
  depth: number;
  /** Drawn in the node, e.g. fib(5). */
  label: string;
  /** How the memo keys this call. Two calls with the same key are one subproblem. */
  key: string;
}

export type CallNode = Placed<PendingCall>;

/** One entry in the memo, in the order it was written. */
export interface MemoEntry {
  key: string;
  value: number;
}

/** One frame of a recursive run. */
export interface CallStep {
  caption: string;
  /** Calls made so far. Everything else renders as a faint ghost. */
  revealed: string[];
  status: Record<string, CallStatus>;
  /** Return value per call id, once that call has returned. */
  values: Record<string, number>;
  activeId: string | null;
  /** Root-to-current labels, rendered as the call stack. */
  stack: string[];
  memo: MemoEntry[];
  /** Calls entered. The honest measure of work done. */
  calls: number;
  /** Calls answered straight from the memo, without recursing. */
  hits: number;
}

export interface CallRun {
  nodes: CallNode[];
  steps: CallStep[];
  /** The recurrence this run implements, listed above the tree. */
  recurrence: string[];
  answer: string;
  truncated: boolean;
}

/**
 * Frame cap. A naive Fibonacci tree roughly doubles with every step of n,
 * which is exactly the lesson, and also exactly why a widget that tried to lay
 * out the whole thing would lock the tab.
 */
export const MAX_CALL_STEPS = 900;
export const CALL_TREE_WIDTH = 780;
export const CALL_ROW_HEIGHT = 60;

interface CallRecorderOptions {
  maxSteps?: number;
}

/**
 * Collects frames while a recursive function runs.
 *
 * A generator calls enter on the way down and ret on the way back up, in the
 * same places the real function would call and return, so the recorded shape
 * is the function's own shape rather than a retelling of it.
 */
export function createCallRecorder(options: CallRecorderOptions = {}) {
  const maxSteps = options.maxSteps ?? MAX_CALL_STEPS;

  const nodes: PendingCall[] = [];
  const steps: CallStep[] = [];
  const status: Record<string, CallStatus> = {};
  const values: Record<string, number> = {};
  const revealed: string[] = [];
  const memo: MemoEntry[] = [];
  const stack: PendingCall[] = [];

  let calls = 0;
  let hits = 0;
  let counter = 0;
  let stopped = false;

  function add(label: string, key: string): PendingCall {
    const parent = stack[stack.length - 1] ?? null;
    const node: PendingCall = {
      id: `c${counter++}`,
      parentId: parent?.id ?? null,
      depth: stack.length,
      label,
      key,
    };
    nodes.push(node);
    revealed.push(node.id);
    return node;
  }

  function snapshot(caption: string, activeId?: string | null): boolean {
    if (steps.length >= maxSteps) {
      stopped = true;
      return false;
    }
    const active = activeId !== undefined ? activeId : (stack[stack.length - 1]?.id ?? null);
    // Everything still on the stack is waiting on a child, apart from the tip.
    for (const frame of stack) {
      if (frame.id !== active) status[frame.id] = "onStack";
    }
    steps.push({
      caption,
      revealed: [...revealed],
      status: { ...status },
      values: { ...values },
      activeId: active,
      stack: stack.map((f) => f.label),
      memo: memo.map((m) => ({ ...m })),
      calls,
      hits,
    });
    return true;
  }

  /** Push a call and make it the active one. */
  function enter(label: string, key: string, caption: string): string {
    const node = add(label, key);
    stack.push(node);
    status[node.id] = "active";
    calls += 1;
    snapshot(caption, node.id);
    return node.id;
  }

  /**
   * Return from the active call. The base flag separates a value that came
   * from the stopping condition from one that came from combining children,
   * which is the distinction the induction framing rests on.
   */
  function ret(value: number, caption: string, base = false) {
    const node = stack[stack.length - 1];
    if (!node) return;
    values[node.id] = value;
    status[node.id] = base ? "base" : "returned";
    snapshot(caption, node.id);
    stack.pop();
  }

  /**
   * A call answered straight out of the memo. It still gets a node, because
   * the reader needs to see that the call was made at all; it just never grows
   * a subtree beneath it, and that missing subtree is the entire saving.
   */
  function hit(label: string, key: string, value: number, caption: string) {
    const node = add(label, key);
    calls += 1;
    hits += 1;
    values[node.id] = value;
    status[node.id] = "cacheHit";
    snapshot(caption, node.id);
  }

  function memoSet(key: string, value: number) {
    if (!memo.some((m) => m.key === key)) memo.push({ key, value });
  }

  function finish(recurrence: string[], answer: string): CallRun {
    return {
      nodes: layoutTree(nodes, CALL_TREE_WIDTH, CALL_ROW_HEIGHT),
      steps,
      recurrence,
      answer,
      truncated: stopped,
    };
  }

  return {
    get stopped() {
      return stopped;
    },
    enter,
    ret,
    hit,
    memoSet,
    snapshot,
    finish,
  };
}

/* -------------------------------------------------------------------------- */
/* Tables                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * How a cell is drawn on the current frame.
 *
 * The dep state is the one doing the teaching. It marks the cells the active
 * cell is reading right now, which is the recurrence made visible. Without it
 * a filling table is just numbers appearing in order.
 */
export type CellState = "empty" | "active" | "dep" | "filled" | "base" | "path";

export interface CellRef {
  r: number;
  c: number;
}

/** One frame of a table being filled. */
export interface TableStep {
  caption: string;
  /** null means not computed yet. */
  values: (number | null)[][];
  state: CellState[][];
  active: CellRef | null;
  /** Cells the active cell is reading. Drawn as arrows into the active cell. */
  deps: CellRef[];
  /** The arithmetic for the active cell, e.g. dp[2][3] = 1 + dp[1][2] = 4. */
  formula: string | null;
  /** Cells on the reconstructed answer, once the fill is done. */
  path: CellRef[];
  /** Cells written. For these algorithms that is the running cost. */
  filled: number;
}

export interface TableRun {
  rowLabels: string[];
  colLabels: string[];
  /** Named beside the axes, e.g. letters of GATTACA. */
  rowTitle: string;
  colTitle: string;
  steps: TableStep[];
  /** The rule, listed above the table in the widget's own words. */
  recurrence: string[];
  answer: string;
  /** What the same problem costs with no table, for the side-by-side comparison. */
  naiveCalls?: number;
  truncated: boolean;
}

export const MAX_TABLE_STEPS = 400;

interface TableRecorderOptions {
  rows: number;
  cols: number;
  maxSteps?: number;
}

/**
 * Collects frames while a table is filled.
 *
 * The recorder owns the value grid, so a generator writes a cell once and the
 * frame history follows on its own. An earlier version had each generator keep
 * its own copy alongside the frames, and the two fell out of step the moment a
 * traceback walked backwards over cells it had already written.
 */
export function createTableRecorder({ rows, cols, maxSteps = MAX_TABLE_STEPS }: TableRecorderOptions) {
  const values: (number | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
  const base: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const steps: TableStep[] = [];
  let filled = 0;
  let stopped = false;
  let path: CellRef[] = [];

  function stateGrid(active: CellRef | null, deps: CellRef[]): CellState[][] {
    const grid: CellState[][] = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => {
        if (values[r][c] === null) return "empty";
        return base[r][c] ? "base" : "filled";
      }),
    );
    for (const p of path) grid[p.r][p.c] = "path";
    for (const d of deps) grid[d.r][d.c] = "dep";
    if (active) grid[active.r][active.c] = "active";
    return grid;
  }

  function snapshot(
    caption: string,
    opts: { active?: CellRef | null; deps?: CellRef[]; formula?: string | null } = {},
  ): boolean {
    if (steps.length >= maxSteps) {
      stopped = true;
      return false;
    }
    const active = opts.active ?? null;
    const deps = opts.deps ?? [];
    steps.push({
      caption,
      values: values.map((row) => [...row]),
      state: stateGrid(active, deps),
      active,
      deps: deps.map((d) => ({ ...d })),
      formula: opts.formula ?? null,
      path: path.map((p) => ({ ...p })),
      filled,
    });
    return true;
  }

  /** Write a cell and capture the frame that explains it. */
  function write(
    r: number,
    c: number,
    value: number,
    caption: string,
    opts: { deps?: CellRef[]; formula?: string; isBase?: boolean } = {},
  ): boolean {
    values[r][c] = value;
    if (opts.isBase) base[r][c] = true;
    filled += 1;
    return snapshot(caption, { active: { r, c }, deps: opts.deps, formula: opts.formula ?? null });
  }

  /** A look-before-you-write frame, for cells whose rule weighs several options. */
  function consider(r: number, c: number, caption: string, deps: CellRef[], formula?: string): boolean {
    return snapshot(caption, { active: { r, c }, deps, formula: formula ?? null });
  }

  function extendPath(cell: CellRef) {
    path = [...path, cell];
  }

  function read(r: number, c: number): number {
    return values[r][c] ?? 0;
  }

  function finish(meta: {
    rowLabels: string[];
    colLabels: string[];
    rowTitle: string;
    colTitle: string;
    recurrence: string[];
    answer: string;
    naiveCalls?: number;
  }): TableRun {
    return { ...meta, steps, truncated: stopped };
  }

  return {
    get stopped() {
      return stopped;
    },
    values,
    read,
    write,
    consider,
    snapshot,
    extendPath,
    finish,
  };
}
