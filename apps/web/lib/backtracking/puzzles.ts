/**
 * Step generators for the constraint-puzzle backtracking problems: n-queens,
 * palindrome partitioning, m-coloring, and sudoku.
 *
 * These differ from the collection problems in algorithms.ts in one way that
 * matters: the answer is a board or an assignment rather than a list, so each
 * frame carries a `payload` the widget draws instead of relying on the tree
 * alone. Sudoku in particular has a search tree far too large to draw, and is
 * shown purely through its board and counters.
 */

import type { GraphSpec } from "@/lib/graph/types";
import {
  TREE_ROW_HEIGHT,
  TREE_WIDTH,
  createRecorder,
  type BacktrackRun,
} from "./types";

/* -------------------------------------------------------------------------
 * N-Queens
 * ---------------------------------------------------------------------- */

export interface QueensPayload {
  n: number;
  /** queens[r] is the column of the queen in row r. Length = rows filled. */
  queens: number[];
  /** Row the search is currently filling. */
  tryRow: number;
  tryCol: number | null;
  /** Whether the square being tried survived the conflict check. */
  ok: boolean;
  /** "row,col" of the placed queen that blocks the current try. */
  blockedBy: string | null;
}

const COL_NAMES = "abcdefgh";

function queenConflict(queens: number[], row: number, col: number): number | null {
  for (let r = 0; r < row; r++) {
    const c = queens[r];
    if (c === col) return r;
    if (row - r === Math.abs(col - c)) return r;
  }
  return null;
}

/**
 * Rows are filled top to bottom, which is the pruning that makes n-queens
 * tractable at all: fixing one queen per row removes the entire question of
 * row conflicts, and turns "choose 8 of 64 squares" into "choose a column for
 * each of 8 rows".
 */
export function nQueensSteps(n: number, stopAtFirst: boolean): BacktrackRun<QueensPayload> {
  const rec = createRecorder<QueensPayload>();
  const queens: number[] = [];

  const payload = (tryRow: number, tryCol: number | null, ok: boolean, blockedBy: number | null): QueensPayload => ({
    n,
    queens: [...queens],
    tryRow,
    tryCol,
    ok,
    blockedBy: blockedBy === null ? null : `${blockedBy},${queens[blockedBy]}`,
  });

  rec.enter("·", "empty board");
  rec.snapshot(`Place one queen per row on a ${n} by ${n} board. Start with row 1.`, {
    payload: payload(0, null, true, null),
  });

  let found = false;

  const walk = (row: number): void => {
    if (row === n) {
      rec.solution(queens.map((c, r) => `${COL_NAMES[c]}${r + 1}`).join(" "));
      rec.snapshot(`All ${n} rows filled with no queen attacking another. That is a solution.`, {
        payload: payload(row, null, true, null),
      });
      found = true;
      return;
    }

    for (let col = 0; col < n; col++) {
      const clash = queenConflict(queens, row, col);

      if (clash !== null) {
        const sameCol = queens[clash] === col;
        rec.prune(
          `${COL_NAMES[col]}${row + 1}`,
          `blocked by row ${clash + 1}`,
          `Row ${row + 1}, column ${COL_NAMES[col]} is attacked by the queen in row ${clash + 1} along ${sameCol ? "the column" : "a diagonal"}. Reject it without building anything underneath.`,
          payload(row, col, false, clash),
        );
        continue;
      }

      queens.push(col);
      rec.enter(`${COL_NAMES[col]}${row + 1}`, queens.map((c, r) => `${COL_NAMES[c]}${r + 1}`).join(" "));
      if (
        !rec.snapshot(`Row ${row + 1}: column ${COL_NAMES[col]} is safe. Place a queen and move to row ${row + 2}.`, {
          payload: payload(row, col, true, null),
        })
      )
        return;

      walk(row + 1);
      if (rec.stopped || (found && stopAtFirst)) return;

      rec.leave(queens.length === n ? "solution" : "dead");
      queens.pop();
      if (
        !rec.snapshot(`Nothing worked below row ${row + 1} column ${COL_NAMES[col]}. Lift that queen and try the next column.`, {
          payload: payload(row, null, true, null),
        })
      )
        return;
    }
  };

  walk(0);

  if (!rec.stopped && !(found && stopAtFirst)) {
    rec.leave(found ? "solution" : "dead");
    rec.snapshot(
      found
        ? "Every column in row 1 has been tried, so every solution has been found."
        : `No arrangement exists for n = ${n}. Every branch ended in a conflict.`,
      { payload: payload(0, null, true, null) },
    );
  } else if (!rec.stopped) {
    rec.snapshot("Stopping at the first solution. Drop the stop-early flag to enumerate the rest.", {
      payload: payload(n, null, true, null),
    });
  }

  return rec.finish(TREE_WIDTH, TREE_ROW_HEIGHT);
}

/** Every solution to n-queens, without the step recording. Used for the solution browser. */
export function allQueensSolutions(n: number, limit = 92): number[][] {
  const out: number[][] = [];
  const queens: number[] = [];

  const walk = (row: number) => {
    if (out.length >= limit) return;
    if (row === n) {
      out.push([...queens]);
      return;
    }
    for (let col = 0; col < n; col++) {
      if (queenConflict(queens, row, col) !== null) continue;
      queens.push(col);
      walk(row + 1);
      queens.pop();
      if (out.length >= limit) return;
    }
  };

  walk(0);
  return out;
}

/* -------------------------------------------------------------------------
 * Palindrome partitioning
 * ---------------------------------------------------------------------- */

export interface PalindromePayload {
  s: string;
  /** Substrings committed on the current path. */
  parts: string[];
  /** Index the next piece starts at. */
  start: number;
  /** Inclusive end index of the piece being tested, or null between tests. */
  end: number | null;
  isPalindrome: boolean;
}

export function isPalindrome(s: string, i: number, j: number): boolean {
  while (i < j) {
    if (s[i] !== s[j]) return false;
    i++;
    j--;
  }
  return true;
}

/**
 * Cut the string into pieces that are each palindromes.
 *
 * The choice at every level is where to put the next cut, so the branching
 * factor shrinks as the start index moves right. The palindrome test is the
 * constraint, and it fails often enough that the pruned tree is far smaller
 * than the 2^(n-1) possible cut patterns.
 */
export function palindromePartitionSteps(s: string): BacktrackRun<PalindromePayload> {
  const rec = createRecorder<PalindromePayload>();
  const parts: string[] = [];
  const n = s.length;

  const payload = (start: number, end: number | null, ok: boolean): PalindromePayload => ({
    s,
    parts: [...parts],
    start,
    end,
    isPalindrome: ok,
  });

  rec.enter("·", s);
  rec.snapshot(`Cut "${s}" into pieces that are all palindromes. The first piece starts at position 1.`, {
    payload: payload(0, null, true),
  });

  const walk = (start: number): void => {
    if (start === n) {
      rec.solution(parts.join(" | "));
      rec.snapshot(`The whole string is consumed and every piece is a palindrome: ${parts.join(" | ")}.`, {
        payload: payload(start, null, true),
      });
      return;
    }

    for (let end = start; end < n; end++) {
      const piece = s.slice(start, end + 1);
      const ok = isPalindrome(s, start, end);

      if (!ok) {
        rec.prune(
          piece,
          parts.join(" | ") || "nothing yet",
          `"${piece}" is not a palindrome, so no cut here can work. Reject it and stretch the piece by one character instead.`,
          payload(start, end, false),
        );
        continue;
      }

      parts.push(piece);
      rec.enter(piece, parts.join(" | "));
      if (
        !rec.snapshot(`"${piece}" reads the same both ways. Commit that cut and partition the rest from position ${end + 2}.`, {
          payload: payload(start, end, true),
        })
      )
        return;

      walk(end + 1);
      if (rec.stopped) return;

      rec.leave(start === n ? "solution" : "explored");
      parts.pop();
      if (
        !rec.snapshot(`Undo the cut after "${piece}" and try a longer first piece.`, {
          payload: payload(start, null, true),
        })
      )
        return;
    }
  };

  walk(0);
  if (!rec.stopped) {
    rec.leave("explored");
    rec.snapshot("Finished. Single characters are always palindromes, which guarantees at least one partition exists.", {
      payload: payload(0, null, true),
    });
  }

  return rec.finish(TREE_WIDTH, TREE_ROW_HEIGHT);
}

/* -------------------------------------------------------------------------
 * M-coloring
 * ---------------------------------------------------------------------- */

export interface ColoringPayload {
  /** Node id to colour index. Absent means uncoloured. */
  colors: Record<string, number>;
  tryNode: string | null;
  tryColor: number | null;
  ok: boolean;
  /** Neighbour that already holds the colour being tried. */
  conflictWith: string | null;
}

export const COLOR_NAMES = ["red", "green", "amber", "blue"];

function neighbourMap(graph: GraphSpec): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const n of graph.nodes) adj.set(n.id, []);
  for (const e of graph.edges) {
    adj.get(e.from)?.push(e.to);
    adj.get(e.to)?.push(e.from);
  }
  return adj;
}

/**
 * Assign one of `m` colours to every node so no edge joins two of the same.
 *
 * Nodes are coloured in the order the graph lists them. That ordering is not
 * innocent: a node with many already-coloured neighbours fails fast, so a bad
 * order can multiply the work without changing the answer, which is the
 * jumping-off point for the ordering heuristics the tutorial covers.
 */
export function mColoringSteps(graph: GraphSpec, m: number, stopAtFirst = true): BacktrackRun<ColoringPayload> {
  const rec = createRecorder<ColoringPayload>();
  const adj = neighbourMap(graph);
  const order = graph.nodes.map((n) => n.id);
  const colors: Record<string, number> = {};

  const payload = (tryNode: string | null, tryColor: number | null, ok: boolean, conflictWith: string | null): ColoringPayload => ({
    colors: { ...colors },
    tryNode,
    tryColor,
    ok,
    conflictWith,
  });

  rec.enter("·", "nothing coloured");
  rec.snapshot(`Colour every node using at most ${m} colours, with no edge joining two of the same colour.`, {
    payload: payload(null, null, true, null),
  });

  let solved = false;

  const walk = (i: number): void => {
    if (i === order.length) {
      rec.solution(order.map((id) => `${id}=${COLOR_NAMES[colors[id]]}`).join(", "));
      rec.snapshot(`Every node is coloured and no edge is broken. ${m} colours were enough.`, {
        payload: payload(null, null, true, null),
      });
      solved = true;
      return;
    }

    const node = order[i];

    for (let c = 0; c < m; c++) {
      const clash = (adj.get(node) ?? []).find((nb) => colors[nb] === c) ?? null;

      if (clash) {
        rec.prune(
          `${node}=${COLOR_NAMES[c]}`,
          `${node} cannot be ${COLOR_NAMES[c]}`,
          `${node} has neighbour ${clash}, which is already ${COLOR_NAMES[c]}. Reject this colour immediately.`,
          payload(node, c, false, clash),
        );
        continue;
      }

      colors[node] = c;
      rec.enter(`${node}=${COLOR_NAMES[c]}`, order.filter((id) => colors[id] !== undefined).map((id) => `${id}:${COLOR_NAMES[colors[id]]}`).join(" "));
      if (
        !rec.snapshot(`No neighbour of ${node} is ${COLOR_NAMES[c]}, so ${node} takes it. Move to the next node.`, {
          payload: payload(node, c, true, null),
        })
      )
        return;

      walk(i + 1);
      if (rec.stopped || (solved && stopAtFirst)) return;

      rec.leave(solved ? "solution" : "dead");
      delete colors[node];
      if (
        !rec.snapshot(`Nothing downstream worked with ${node} as ${COLOR_NAMES[c]}. Uncolour it and try the next colour.`, {
          payload: payload(node, null, true, null),
        })
      )
        return;
    }
  };

  walk(0);

  if (!rec.stopped && !solved) {
    rec.leave("dead");
    rec.snapshot(`Every combination failed, so this graph cannot be coloured with only ${m} colours.`, {
      payload: payload(null, null, false, null),
    });
  }

  return rec.finish(TREE_WIDTH, TREE_ROW_HEIGHT);
}

/* -------------------------------------------------------------------------
 * Sudoku
 * ---------------------------------------------------------------------- */

export interface SudokuPayload {
  board: number[];
  /** Cells filled in the original puzzle, which the solver may not touch. */
  givens: boolean[];
  cell: number | null;
  value: number | null;
  ok: boolean;
  /** Candidates for the active cell, for the side panel. */
  candidates: number[];
}

export type SudokuStrategy = "first" | "mrv";

function sudokuCandidates(board: number[], cell: number): number[] {
  const row = Math.floor(cell / 9);
  const col = cell % 9;
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  const taken = new Set<number>();

  for (let i = 0; i < 9; i++) {
    taken.add(board[row * 9 + i]);
    taken.add(board[i * 9 + col]);
    taken.add(board[(boxRow + Math.floor(i / 3)) * 9 + boxCol + (i % 3)]);
  }

  const out: number[] = [];
  for (let v = 1; v <= 9; v++) if (!taken.has(v)) out.push(v);
  return out;
}

/**
 * Sudoku by backtracking, with a switch for how the next cell is chosen.
 *
 * `first` takes the next empty cell in reading order. `mrv` takes the cell
 * with the fewest legal values left, the "most constrained variable"
 * heuristic. Both find the same grid; the counters are the interesting part,
 * because choosing the tightest cell first means failure surfaces near the
 * top of the tree instead of forty levels down.
 *
 * No search tree is drawn for this one. At roughly nine branches per empty
 * cell it would be unreadable, and the board already shows the state.
 */
export function sudokuSteps(puzzle: number[], strategy: SudokuStrategy): BacktrackRun<SudokuPayload> {
  const rec = createRecorder<SudokuPayload>();
  const board = [...puzzle];
  const givens = puzzle.map((v) => v !== 0);

  const payload = (cell: number | null, value: number | null, ok: boolean, candidates: number[]): SudokuPayload => ({
    board: [...board],
    givens,
    cell,
    value,
    ok,
    candidates,
  });

  const pickCell = (): number | null => {
    if (strategy === "first") {
      const idx = board.indexOf(0);
      return idx === -1 ? null : idx;
    }

    let best: number | null = null;
    let bestCount = 10;
    for (let i = 0; i < 81; i++) {
      if (board[i] !== 0) continue;
      const count = sudokuCandidates(board, i).length;
      if (count < bestCount) {
        best = i;
        bestCount = count;
        // Zero candidates means this branch is already dead; nothing beats
        // finding that out now rather than after more guessing.
        if (count === 0) break;
      }
    }
    return best;
  };

  rec.enter("·", `${board.filter((v) => v === 0).length} blanks`);
  rec.snapshot(
    strategy === "first"
      ? "Fill the next blank cell in reading order, trying 1 to 9 in turn."
      : "Fill whichever blank cell has the fewest legal values left, breaking ties by position.",
    { payload: payload(null, null, true, []) },
  );

  const walk = (): boolean => {
    const cell = pickCell();
    if (cell === null) {
      rec.solution("grid complete");
      rec.snapshot("No blanks left, so the grid is solved.", { payload: payload(null, null, true, []) });
      return true;
    }

    const candidates = sudokuCandidates(board, cell);
    const row = Math.floor(cell / 9) + 1;
    const col = (cell % 9) + 1;

    if (candidates.length === 0) {
      rec.prune(
        `r${row}c${col}`,
        "no candidates",
        `Row ${row}, column ${col} has no legal value left. This branch is dead, so back up immediately.`,
        payload(cell, null, false, []),
      );
      return false;
    }

    for (const v of candidates) {
      board[cell] = v;
      rec.enter(`${v}@r${row}c${col}`, `r${row}c${col} = ${v}`);
      if (
        !rec.snapshot(`Row ${row}, column ${col}: try ${v}. ${candidates.length === 1 ? "It was the only candidate, so this is forced." : `Candidates were ${candidates.join(", ")}.`}`, {
          payload: payload(cell, v, true, candidates),
        })
      )
        return false;

      if (walk()) {
        rec.leave("solution");
        return true;
      }
      if (rec.stopped) return false;

      rec.leave("dead");
      board[cell] = 0;
      if (
        !rec.snapshot(`${v} at row ${row}, column ${col} led nowhere. Erase it and try the next candidate.`, {
          payload: payload(cell, null, false, candidates),
        })
      )
        return false;
    }

    return false;
  };

  walk();
  return rec.finish(TREE_WIDTH, TREE_ROW_HEIGHT);
}

/**
 * A puzzle built from the standard shifted-row pattern with 48 cells removed.
 * Generated from a known-complete grid rather than copied from somewhere, so
 * the solution is guaranteed to exist and the givens are guaranteed
 * consistent, which matters when the widget's whole job is showing a correct
 * solve.
 *
 * The blank list is not arbitrary. It was picked by searching for a pattern
 * where the naive reading-order strategy has to do real backtracking (185
 * cells filled, 56 dead ends) while the most-constrained-cell heuristic walks
 * straight through (49 cells, zero dead ends), and where the naive run still
 * finishes inside MAX_STEPS so both are watchable end to end. A puzzle with
 * more givens solves without either strategy ever backing up, which would
 * make the comparison the tutorial is built around look like a wash.
 */
export function defaultSudoku(): number[] {
  const solved: number[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      solved.push(((3 * (r % 3) + Math.floor(r / 3) + c) % 9) + 1);
    }
  }

  const blanks = [
    0, 2, 3, 5, 6, 7, 8, 9, 13, 16, 18, 19, 20, 21, 22, 24, 25, 26, 28, 30, 31, 32, 33, 34, 35,
    39, 40, 42, 43, 44, 47, 49, 50, 52, 59, 60, 62, 63, 66, 67, 68, 69, 71, 72, 73, 75, 77, 78,
  ];
  const puzzle = [...solved];
  for (const i of blanks) puzzle[i] = 0;
  return puzzle;
}
