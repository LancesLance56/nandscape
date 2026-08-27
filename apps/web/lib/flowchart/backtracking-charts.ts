/**
 * Flowcharts for the backtracking problems.
 *
 * Every one of these is the same skeleton: a stopping test, a loop over the
 * available choices, a validity test that prunes, and choose / explore /
 * un-choose inside the loop. Drawing them side by side is the point. Once you
 * can see that n-queens and palindrome partitioning are the identical chart
 * with different boxes, the family stops being seven things to remember.
 *
 * That three-step cycle is drawn as a labelled group in every chart, so the
 * shared shape is visible at a glance rather than something you have to take
 * on trust. Inside it the colours are fixed and mean the same thing
 * everywhere: blue applies a choice, violet recurses, coral takes the choice
 * back. Coral because un-choosing is the step people forget, and a chart
 * should put its warning where the mistake happens.
 *
 * Backtracking is recursive, so the same limitation applies as in the sorting
 * charts: a flowchart describes one call, and the recursive step is drawn as
 * an ordinary process box.
 */

import type { FlowchartSpec, FlowNode } from "./types";

/** The choose / explore / un-choose group, which is identical in every chart. */
function cycle(
  parts: { choose: string; explore: string; undo: string },
  notes: { choose?: string; explore?: string; undo?: string } = {},
): FlowNode[] {
  return [
    { id: "cycle", type: "group", text: "choose · explore · un-choose", groupLayout: "column" },
    { id: "choose", type: "process", text: parts.choose, accent: "blue", parentId: "cycle", note: notes.choose },
    { id: "explore", type: "process", text: parts.explore, accent: "violet", parentId: "cycle", note: notes.explore },
    { id: "undo", type: "process", text: parts.undo, accent: "coral", parentId: "cycle", note: notes.undo },
  ];
}

/** Every chart in this family shares a legend, since every chart shares the shape. */
const FAMILY_LEGEND: FlowchartSpec["legend"] = [
  { label: "start / end", shape: "start", accent: "green" },
  { label: "decision", shape: "decision", accent: "copper" },
  { label: "apply a choice", shape: "process", accent: "blue" },
  { label: "recurse", shape: "process", accent: "violet" },
  { label: "take it back", shape: "process", accent: "coral" },
  { label: "loop back", kind: "edge", shape: "decision", accent: "copper" },
];

export const BACKTRACKING_TEMPLATE_CHART: FlowchartSpec = {
  title: "The backtracking template",
  direction: "LR",
  nodes: [
    { id: "start", type: "start", text: "backtrack(state)" },
    {
      id: "issol",
      type: "decision",
      text: "is state a\nsolution ?",
      badge: "1",
      note: "The stopping condition. Without it the recursion never bottoms out, and with the wrong one you record partial answers.",
    },
    {
      id: "record",
      type: "process",
      text: "record(state)",
      note: "Record a copy. Storing the shared state itself means every recorded answer ends up pointing at the same object, which is empty by the time the search finishes.",
    },
    { id: "ret1", type: "end", text: "return" },
    { id: "init", type: "process", text: "i = 0", note: "Index into the choices available from this state." },
    { id: "loop", type: "decision", text: "i < choices ?" },
    {
      id: "ret2",
      type: "end",
      text: "return",
      note: "Out of choices at this level, so hand control back to the caller. This return is the backtrack.",
    },
    {
      id: "valid",
      type: "decision",
      text: "choice[i] legal ?",
      badge: "2",
      accent: "amber",
      note: "The pruning test, and the only thing separating backtracking from brute force. Failing here means the entire subtree under this choice is never built.",
    },
    ...cycle(
      { choose: "apply choice", explore: "backtrack(state)", undo: "undo choice" },
      {
        choose: "Mutate the shared state so the deeper call sees this choice as already made.",
        explore: "One level deeper. This call runs all the way to completion before the next choice at this level is tried.",
        undo: "The step people forget. State is shared across the whole search, so a choice left applied silently corrupts every branch explored after it.",
      },
    ),
    { id: "next", type: "process", text: "i = i + 1" },
  ],
  edges: [
    { id: "t1", from: "start", to: "issol" },
    { id: "t2", from: "issol", to: "record", label: "yes" },
    { id: "t3", from: "issol", to: "init", label: "no" },
    { id: "t4", from: "record", to: "ret1" },
    { id: "t5", from: "init", to: "loop" },
    { id: "t6", from: "loop", to: "valid", label: "yes" },
    { id: "t7", from: "loop", to: "ret2", label: "no" },
    { id: "t8", from: "valid", to: "choose", label: "yes" },
    { id: "t9", from: "valid", to: "next", label: "no (prune)" },
    { id: "t10", from: "choose", to: "explore" },
    { id: "t11", from: "explore", to: "undo" },
    { id: "t12", from: "undo", to: "next" },
    { id: "t13", from: "next", to: "loop" },
  ],
  legend: FAMILY_LEGEND,
};

export const SUBSETS_CHART: FlowchartSpec = {
  title: "Subsets",
  direction: "LR",
  nodes: [
    { id: "start", type: "start", text: "subsets(start, current)" },
    {
      id: "record",
      type: "process",
      text: "record a copy\nof current",
      badge: "!",
      accent: "amber",
      note: "Every node is an answer here, so recording happens on entry rather than at a leaf. That is what makes this tree have 2^n nodes and 2^n answers, with no wasted work anywhere.",
    },
    {
      id: "init",
      type: "process",
      text: "i = start",
      note: "Starting at `start` rather than 0 is what stops {a,b} and {b,a} both being generated.",
    },
    { id: "loop", type: "decision", text: "i < n ?" },
    { id: "ret", type: "end", text: "return" },
    ...cycle(
      { choose: "current.push(a[i])", explore: "subsets(i + 1, current)", undo: "current.pop()" },
      {
        explore: "i + 1, not start + 1. Each level may only pick from what comes after its own choice.",
        undo: "Without this pop, the next iteration of the loop would build on top of a choice that was supposed to be finished.",
      },
    ),
    { id: "next", type: "process", text: "i = i + 1" },
  ],
  edges: [
    { id: "s1", from: "start", to: "record" },
    { id: "s2", from: "record", to: "init" },
    { id: "s3", from: "init", to: "loop" },
    { id: "s4", from: "loop", to: "choose", label: "yes" },
    { id: "s5", from: "loop", to: "ret", label: "no" },
    { id: "s6", from: "choose", to: "explore" },
    { id: "s7", from: "explore", to: "undo" },
    { id: "s8", from: "undo", to: "next" },
    { id: "s9", from: "next", to: "loop" },
  ],
  legend: FAMILY_LEGEND,
  walkthrough: [
    { node: "start", caption: "Generating subsets of [a, b]. This is the outermost call: start = 0, current = []." },
    { node: "record", caption: "Record a copy of current, which is the empty set. Yes, that counts as a subset." },
    { node: "init", caption: "i = start = 0." },
    { node: "loop", caption: "i < n, that is 0 < 2 ? Yes." },
    { node: "choose", caption: "Push a[0] = a. current is now [a]." },
    {
      node: "explore",
      caption: "Recurse with start = 1. That call records [a], then goes on to record [a, b] before returning.",
    },
    { node: "undo", caption: "Pop. current is back to [], exactly as it was before this choice was made." },
    { node: "next", caption: "i = 1." },
    { node: "loop", caption: "1 < 2 ? Yes, there is still a choice left at this level." },
    { node: "choose", caption: "Push a[1] = b. current is now [b]." },
    {
      node: "explore",
      caption: "Recurse with start = 2. That call records [b] and finds no further choices. Note it never produces [b, a]: start has moved past a.",
    },
    { node: "undo", caption: "Pop. current is [] again." },
    { node: "next", caption: "i = 2." },
    { node: "loop", caption: "2 < 2 ? No. Out of choices." },
    { node: "ret", caption: "Return. Four subsets recorded: [], [a], [a, b], [b]. That is 2^2, as promised." },
  ],
  interactive: { walkthrough: true },
};

export const PERMUTATIONS_CHART: FlowchartSpec = {
  title: "Permutations (used array)",
  direction: "LR",
  nodes: [
    { id: "start", type: "start", text: "permute(current, used)" },
    {
      id: "full",
      type: "decision",
      text: "current.length\n== n ?",
      badge: "1",
      note: "Only a full-length arrangement is a permutation, so unlike subsets, only the leaves are answers.",
    },
    { id: "record", type: "process", text: "record a copy" },
    { id: "ret1", type: "end", text: "return" },
    {
      id: "init",
      type: "process",
      text: "i = 0",
      note: "Every position scans all n characters, not a suffix, because any unused character may go next. This is the structural difference from subsets.",
    },
    { id: "loop", type: "decision", text: "i < n ?" },
    { id: "ret2", type: "end", text: "return" },
    {
      id: "used",
      type: "decision",
      text: "used[i] ?",
      badge: "2",
      accent: "amber",
      note: "Already placed higher up this path, so it cannot be used again on this branch. The used array is what replaces the `start` index that subsets relies on.",
    },
    ...cycle(
      {
        choose: "used[i] = true\ncurrent.push(a[i])",
        explore: "permute(current, used)",
        undo: "current.pop()\nused[i] = false",
      },
      { undo: "Both halves have to be undone. Popping without clearing used[i] loses that character for every later branch." },
    ),
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
  legend: FAMILY_LEGEND,
};

export const N_QUEENS_CHART: FlowchartSpec = {
  title: "N-Queens",
  direction: "LR",
  nodes: [
    { id: "start", type: "start", text: "placeQueens(row)" },
    {
      id: "done",
      type: "decision",
      text: "row == n ?",
      badge: "1",
      note: "Every row has a queen, so by construction no two share a row, and the checks below guaranteed the rest.",
    },
    { id: "record", type: "process", text: "record the board" },
    { id: "ret1", type: "end", text: "return" },
    {
      id: "init",
      type: "process",
      text: "col = 0",
      note: "One queen per row is a decision made before the search starts. It is what shrinks 64-choose-8 to 8 columns per row.",
    },
    { id: "loop", type: "decision", text: "col < n ?" },
    {
      id: "ret2",
      type: "end",
      text: "return\n(backtrack)",
      accent: "coral",
      note: "No column in this row works, so the queen placed in the row above must be wrong. Returning lets the caller move it.",
    },
    {
      id: "safe",
      type: "decision",
      text: "(row, col)\nattacked ?",
      badge: "2",
      accent: "amber",
      note: "Checked against columns and both diagonals of the queens already placed. This is O(1) with three sets, and it is where nearly all the search space disappears.",
    },
    ...cycle(
      {
        choose: "place queen\nat (row, col)",
        explore: "placeQueens(row + 1)",
        undo: "remove queen\nfrom (row, col)",
      },
      { undo: "The board is one shared array. A queen left behind poisons every arrangement tried after this one." },
    ),
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
  legend: FAMILY_LEGEND,
};

export const PALINDROME_CHART: FlowchartSpec = {
  title: "Palindrome partitioning",
  direction: "LR",
  nodes: [
    { id: "start", type: "start", text: "partition(start, parts)" },
    {
      id: "done",
      type: "decision",
      text: "start == n ?",
      badge: "1",
      note: "The whole string has been consumed, so every character is inside some palindromic piece.",
    },
    { id: "record", type: "process", text: "record parts" },
    { id: "ret1", type: "end", text: "return" },
    {
      id: "init",
      type: "process",
      text: "end = start",
      note: "The choice at each level is where the next piece ends, so the branching factor shrinks as start moves right.",
    },
    { id: "loop", type: "decision", text: "end < n ?" },
    { id: "ret2", type: "end", text: "return" },
    {
      id: "ispal",
      type: "decision",
      text: "s[start..end] a\npalindrome ?",
      badge: "2",
      accent: "amber",
      note: "The prune. Unlike n-queens, this test depends only on the piece itself and not on the choices above it, which is what allows it to be precomputed into a table.",
    },
    ...cycle(
      { choose: "parts.push(piece)", explore: "partition(end + 1, parts)", undo: "parts.pop()" },
      { explore: "end + 1: the next piece starts one past where this one stopped." },
    ),
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
  legend: FAMILY_LEGEND,
};

export const M_COLORING_CHART: FlowchartSpec = {
  title: "Graph m-coloring",
  direction: "LR",
  nodes: [
    { id: "start", type: "start", text: "color(i)" },
    {
      id: "done",
      type: "decision",
      text: "i == nodeCount ?",
      badge: "1",
      note: "Every node has a colour and no check ever failed, so the colouring is valid.",
    },
    { id: "ret1", type: "end", text: "return true" },
    { id: "init", type: "process", text: "c = 0" },
    { id: "loop", type: "decision", text: "c < m ?" },
    {
      id: "ret2",
      type: "end",
      text: "return false\n(backtrack)",
      accent: "coral",
      note: "Every colour was rejected for this node, so an earlier node must be recoloured. This is the failure that propagates upward.",
    },
    {
      id: "ok",
      type: "decision",
      text: "a neighbour\nalready has c ?",
      badge: "2",
      accent: "amber",
      note: "The prune, and the only constraint in the problem.",
    },
    { id: "cycle", type: "group", text: "choose · explore · un-choose", groupLayout: "column" },
    { id: "choose", type: "process", text: "colors[node] = c", accent: "blue", parentId: "cycle" },
    {
      id: "explore",
      type: "decision",
      text: "color(i + 1)\nsucceeded ?",
      accent: "violet",
      parentId: "cycle",
      note: "Unlike the enumeration problems, this one stops at the first success, so the recursive call returns a boolean rather than nothing. That boolean is what lets success short-circuit all the way out.",
    },
    {
      id: "undo",
      type: "process",
      text: "uncolor node",
      accent: "coral",
      parentId: "cycle",
      note: "Only reached when the deeper call failed. On success the colouring is kept and returned straight up.",
    },
    { id: "win", type: "end", text: "return true" },
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
  legend: FAMILY_LEGEND,
};

export const SUDOKU_CHART: FlowchartSpec = {
  title: "Sudoku solver",
  direction: "LR",
  nodes: [
    { id: "start", type: "start", text: "solve()" },
    {
      id: "pick",
      type: "process",
      text: "cell = pick an\nempty cell",
      accent: "amber",
      badge: "!",
      note: "Which cell is picked here is the whole ballgame. Reading order works; fewest-candidates-first does a quarter of the work, because it fails fast on the cells most likely to fail at all.",
    },
    { id: "none", type: "decision", text: "no empty cell ?", badge: "1" },
    { id: "ret1", type: "end", text: "return true\n(solved)" },
    { id: "init", type: "process", text: "v = 1" },
    { id: "loop", type: "decision", text: "v <= 9 ?" },
    {
      id: "ret2",
      type: "end",
      text: "return false\n(backtrack)",
      accent: "coral",
      note: "No digit fits, so a guess made earlier was wrong. If the chosen cell had zero candidates, this fires immediately, which is exactly the fast failure a good cell-picker is buying.",
    },
    {
      id: "legal",
      type: "decision",
      text: "v legal in row,\ncolumn and box ?",
      badge: "2",
      accent: "amber",
      note: "The three sudoku constraints, all checked at once.",
    },
    { id: "cycle", type: "group", text: "choose · explore · un-choose", groupLayout: "column" },
    { id: "choose", type: "process", text: "board[cell] = v", accent: "blue", parentId: "cycle" },
    { id: "explore", type: "decision", text: "solve()\nsucceeded ?", accent: "violet", parentId: "cycle" },
    {
      id: "undo",
      type: "process",
      text: "board[cell] = 0",
      accent: "coral",
      parentId: "cycle",
      note: "Erasing the guess is what lets the next value be tried on a clean board.",
    },
    { id: "win", type: "end", text: "return true" },
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
  legend: FAMILY_LEGEND,
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
