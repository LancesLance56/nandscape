/**
 * Flowcharts for the backtracking problems.
 *
 * Every one of these is the same skeleton: a stopping test, a loop over the
 * available choices, a validity test that prunes, and choose / explore /
 * un-choose inside the loop. Drawing them side by side is the point. Once
 * you can see that n-queens and palindrome partitioning are the identical
 * chart with different boxes, the family stops being seven things to
 * remember.
 *
 * Backtracking is recursive, so the same limitation applies as in the
 * sorting charts: a flowchart describes one call, and the recursive step is
 * drawn as an ordinary process box.
 */

import type { FlowchartSpec } from "./types";

export const BACKTRACKING_TEMPLATE_CHART: FlowchartSpec = {
  title: "The backtracking template",
  nodes: [
    { id: "start", type: "start", text: "backtrack(state)" },
    {
      id: "issol",
      type: "decision",
      text: "is state a\nsolution ?",
      note: "The stopping condition. Without it the recursion never bottoms out, and with the wrong one you record partial answers.",
    },
    { id: "record", type: "process", text: "record(state)", note: "Record a copy. Storing the shared state itself means every recorded answer ends up pointing at the same object." },
    { id: "ret1", type: "end", text: "return" },
    { id: "init", type: "process", text: "i = 0", note: "Index into the choices available from this state." },
    { id: "loop", type: "decision", text: "i < choices ?" },
    { id: "ret2", type: "end", text: "return", note: "Out of choices at this level, so hand control back to the caller. This return is the backtrack." },
    {
      id: "valid",
      type: "decision",
      text: "choice[i] legal ?",
      note: "The pruning test, and the only thing separating backtracking from brute force. Failing here means the entire subtree under this choice is never built.",
    },
    { id: "choose", type: "process", text: "apply choice\n(choose)" },
    { id: "explore", type: "process", text: "backtrack(state)\n(explore)", note: "One level deeper. This call runs all the way to completion before the next choice at this level is tried." },
    {
      id: "undo",
      type: "process",
      text: "undo choice\n(un-choose)",
      note: "The step people forget. State is shared across the whole search, so a choice left applied silently corrupts every branch explored after it.",
    },
    { id: "next", type: "process", text: "i = i + 1" },
  ],
  edges: [
    { from: "start", to: "issol" },
    { from: "issol", to: "record", label: "yes" },
    { from: "issol", to: "init", label: "no" },
    { from: "record", to: "ret1" },
    { from: "init", to: "loop" },
    { from: "loop", to: "valid", label: "yes" },
    { from: "loop", to: "ret2", label: "no" },
    { from: "valid", to: "choose", label: "yes" },
    { from: "valid", to: "next", label: "no (prune)" },
    { from: "choose", to: "explore" },
    { from: "explore", to: "undo" },
    { from: "undo", to: "next" },
    { from: "next", to: "loop" },
  ],
};

export const SUBSETS_CHART: FlowchartSpec = {
  title: "Subsets",
  nodes: [
    { id: "start", type: "start", text: "subsets(start, current)" },
    { id: "record", type: "process", text: "record a copy\nof current", note: "Every node is an answer here, so recording happens on entry rather than at a leaf. That is what makes this tree have 2^n nodes and 2^n answers." },
    { id: "init", type: "process", text: "i = start", note: "Starting at `start` rather than 0 is what stops {a,b} and {b,a} both being generated." },
    { id: "loop", type: "decision", text: "i < n ?" },
    { id: "ret", type: "end", text: "return" },
    { id: "choose", type: "process", text: "current.push(a[i])" },
    { id: "explore", type: "process", text: "subsets(i + 1, current)" },
    { id: "undo", type: "process", text: "current.pop()" },
    { id: "next", type: "process", text: "i = i + 1" },
  ],
  edges: [
    { from: "start", to: "record" },
    { from: "record", to: "init" },
    { from: "init", to: "loop" },
    { from: "loop", to: "choose", label: "yes" },
    { from: "loop", to: "ret", label: "no" },
    { from: "choose", to: "explore" },
    { from: "explore", to: "undo" },
    { from: "undo", to: "next" },
    { from: "next", to: "loop" },
  ],
};

export const PERMUTATIONS_CHART: FlowchartSpec = {
  title: "Permutations (used array)",
  nodes: [
    { id: "start", type: "start", text: "permute(current, used)" },
    { id: "full", type: "decision", text: "current.length\n== n ?", note: "Only a full-length arrangement is a permutation, so unlike subsets, only the leaves are answers." },
    { id: "record", type: "process", text: "record a copy" },
    { id: "ret1", type: "end", text: "return" },
    { id: "init", type: "process", text: "i = 0", note: "Every position scans all n characters, not a suffix, because any unused character may go next." },
    { id: "loop", type: "decision", text: "i < n ?" },
    { id: "ret2", type: "end", text: "return" },
    { id: "used", type: "decision", text: "used[i] ?", note: "Already placed higher up this path, so it cannot be used again on this branch." },
    { id: "choose", type: "process", text: "used[i] = true\ncurrent.push(a[i])" },
    { id: "explore", type: "process", text: "permute(current, used)" },
    { id: "undo", type: "process", text: "current.pop()\nused[i] = false" },
    { id: "next", type: "process", text: "i = i + 1" },
  ],
  edges: [
    { from: "start", to: "full" },
    { from: "full", to: "record", label: "yes" },
    { from: "full", to: "init", label: "no" },
    { from: "record", to: "ret1" },
    { from: "init", to: "loop" },
    { from: "loop", to: "used", label: "yes" },
    { from: "loop", to: "ret2", label: "no" },
    { from: "used", to: "next", label: "yes (skip)" },
    { from: "used", to: "choose", label: "no" },
    { from: "choose", to: "explore" },
    { from: "explore", to: "undo" },
    { from: "undo", to: "next" },
    { from: "next", to: "loop" },
  ],
};

export const N_QUEENS_CHART: FlowchartSpec = {
  title: "N-Queens",
  nodes: [
    { id: "start", type: "start", text: "placeQueens(row)" },
    { id: "done", type: "decision", text: "row == n ?", note: "Every row has a queen, so by construction no two share a row, and the checks below guaranteed the rest." },
    { id: "record", type: "process", text: "record the board" },
    { id: "ret1", type: "end", text: "return" },
    { id: "init", type: "process", text: "col = 0", note: "One queen per row is a decision made before the search starts. It is what shrinks 64-choose-8 to 8 columns per row." },
    { id: "loop", type: "decision", text: "col < n ?" },
    { id: "ret2", type: "end", text: "return\n(backtrack)", note: "No column in this row works, so the queen placed in the row above must be wrong. Returning lets the caller move it." },
    { id: "safe", type: "decision", text: "(row, col)\nattacked ?", note: "Checked against columns and both diagonals of the queens already placed. This is O(1) with three sets." },
    { id: "choose", type: "process", text: "place queen\nat (row, col)" },
    { id: "explore", type: "process", text: "placeQueens(row + 1)" },
    { id: "undo", type: "process", text: "remove queen\nfrom (row, col)" },
    { id: "next", type: "process", text: "col = col + 1" },
  ],
  edges: [
    { from: "start", to: "done" },
    { from: "done", to: "record", label: "yes" },
    { from: "done", to: "init", label: "no" },
    { from: "record", to: "ret1" },
    { from: "init", to: "loop" },
    { from: "loop", to: "safe", label: "yes" },
    { from: "loop", to: "ret2", label: "no" },
    { from: "safe", to: "next", label: "yes (prune)" },
    { from: "safe", to: "choose", label: "no" },
    { from: "choose", to: "explore" },
    { from: "explore", to: "undo" },
    { from: "undo", to: "next" },
    { from: "next", to: "loop" },
  ],
};

export const PALINDROME_CHART: FlowchartSpec = {
  title: "Palindrome partitioning",
  nodes: [
    { id: "start", type: "start", text: "partition(start, parts)" },
    { id: "done", type: "decision", text: "start == n ?", note: "The whole string has been consumed, so every character is inside some palindromic piece." },
    { id: "record", type: "process", text: "record parts" },
    { id: "ret1", type: "end", text: "return" },
    { id: "init", type: "process", text: "end = start", note: "The choice at each level is where the next piece ends, so the branching factor shrinks as start moves right." },
    { id: "loop", type: "decision", text: "end < n ?" },
    { id: "ret2", type: "end", text: "return" },
    { id: "ispal", type: "decision", text: "s[start..end] a\npalindrome ?", note: "The prune. Unlike n-queens, this test depends only on the piece itself, which is what allows it to be precomputed into a table." },
    { id: "choose", type: "process", text: "parts.push(piece)" },
    { id: "explore", type: "process", text: "partition(end + 1, parts)" },
    { id: "undo", type: "process", text: "parts.pop()" },
    { id: "next", type: "process", text: "end = end + 1" },
  ],
  edges: [
    { from: "start", to: "done" },
    { from: "done", to: "record", label: "yes" },
    { from: "done", to: "init", label: "no" },
    { from: "record", to: "ret1" },
    { from: "init", to: "loop" },
    { from: "loop", to: "ispal", label: "yes" },
    { from: "loop", to: "ret2", label: "no" },
    { from: "ispal", to: "next", label: "no (prune)" },
    { from: "ispal", to: "choose", label: "yes" },
    { from: "choose", to: "explore" },
    { from: "explore", to: "undo" },
    { from: "undo", to: "next" },
    { from: "next", to: "loop" },
  ],
};

export const M_COLORING_CHART: FlowchartSpec = {
  title: "Graph m-coloring",
  nodes: [
    { id: "start", type: "start", text: "color(i)" },
    { id: "done", type: "decision", text: "i == nodeCount ?", note: "Every node has a colour and no check ever failed, so the colouring is valid." },
    { id: "ret1", type: "end", text: "return true" },
    { id: "init", type: "process", text: "c = 0" },
    { id: "loop", type: "decision", text: "c < m ?" },
    { id: "ret2", type: "end", text: "return false\n(backtrack)", note: "Every colour was rejected for this node, so an earlier node must be recoloured. This is the failure that propagates upward." },
    { id: "ok", type: "decision", text: "a neighbour\nalready has c ?", note: "The prune, and the only constraint in the problem." },
    { id: "choose", type: "process", text: "colors[node] = c" },
    { id: "explore", type: "decision", text: "color(i + 1)\nsucceeded ?", note: "Unlike the enumeration problems, this one stops at the first success, so the recursive call returns a boolean rather than nothing." },
    { id: "win", type: "end", text: "return true" },
    { id: "undo", type: "process", text: "uncolor node" },
    { id: "next", type: "process", text: "c = c + 1" },
  ],
  edges: [
    { from: "start", to: "done" },
    { from: "done", to: "ret1", label: "yes" },
    { from: "done", to: "init", label: "no" },
    { from: "init", to: "loop" },
    { from: "loop", to: "ok", label: "yes" },
    { from: "loop", to: "ret2", label: "no" },
    { from: "ok", to: "next", label: "yes (prune)" },
    { from: "ok", to: "choose", label: "no" },
    { from: "choose", to: "explore" },
    { from: "explore", to: "win", label: "yes" },
    { from: "explore", to: "undo", label: "no" },
    { from: "undo", to: "next" },
    { from: "next", to: "loop" },
  ],
};

export const SUDOKU_CHART: FlowchartSpec = {
  title: "Sudoku solver",
  nodes: [
    { id: "start", type: "start", text: "solve()" },
    { id: "pick", type: "process", text: "cell = pick an\nempty cell", note: "Which cell is picked here is the whole ballgame. Reading order works; fewest-candidates-first does a quarter of the work." },
    { id: "none", type: "decision", text: "no empty cell ?" },
    { id: "ret1", type: "end", text: "return true\n(solved)" },
    { id: "init", type: "process", text: "v = 1" },
    { id: "loop", type: "decision", text: "v <= 9 ?" },
    { id: "ret2", type: "end", text: "return false\n(backtrack)", note: "No digit fits, so a guess made earlier was wrong. If the chosen cell had zero candidates, this fires immediately." },
    { id: "legal", type: "decision", text: "v legal in row,\ncolumn and box ?", note: "The three sudoku constraints, all checked at once." },
    { id: "choose", type: "process", text: "board[cell] = v" },
    { id: "explore", type: "decision", text: "solve()\nsucceeded ?" },
    { id: "win", type: "end", text: "return true" },
    { id: "undo", type: "process", text: "board[cell] = 0", note: "Erasing the guess is what lets the next value be tried in a clean board." },
    { id: "next", type: "process", text: "v = v + 1" },
  ],
  edges: [
    { from: "start", to: "pick" },
    { from: "pick", to: "none" },
    { from: "none", to: "ret1", label: "yes" },
    { from: "none", to: "init", label: "no" },
    { from: "init", to: "loop" },
    { from: "loop", to: "legal", label: "yes" },
    { from: "loop", to: "ret2", label: "no" },
    { from: "legal", to: "next", label: "no (prune)" },
    { from: "legal", to: "choose", label: "yes" },
    { from: "choose", to: "explore" },
    { from: "explore", to: "win", label: "yes" },
    { from: "explore", to: "undo", label: "no" },
    { from: "undo", to: "next" },
    { from: "next", to: "loop" },
  ],
};

export const BACKTRACKING_CHARTS: Record<string, FlowchartSpec> = {
  "backtracking-template": BACKTRACKING_TEMPLATE_CHART,
  subsets: SUBSETS_CHART,
  permutations: PERMUTATIONS_CHART,
  "n-queens": N_QUEENS_CHART,
  palindrome: PALINDROME_CHART,
  "m-coloring": M_COLORING_CHART,
  sudoku: SUDOKU_CHART,
};
