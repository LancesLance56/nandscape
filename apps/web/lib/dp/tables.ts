/**
 * Bottom-up dynamic programming, recorded as tables being filled.
 *
 * The one-dimensional problems come first because their tables are a single
 * row and the dependency arrows point backwards along it, which is about as
 * plain as a recurrence ever looks. The two-dimensional ones follow the same
 * recorder, so the widget that draws a row of climbing-stairs counts is the
 * same widget that draws an edit-distance grid.
 *
 * Every generator here was checked against an independent brute-force search
 * before any tutorial quoted its numbers. A widget that quietly disagrees with
 * the prose around it is worse than no widget, and a recurrence is exactly the
 * kind of thing that is easy to get subtly and silently wrong.
 */

import { createTableRecorder, type CellRef, type TableRun } from "./types";

export type ArrayProblem = "stairs" | "rob" | "coins" | "lis";
export type GridProblem = "minpath" | "lcs" | "edit" | "knapsack";

/* -------------------------------------------------------------------------- */
/* One-dimensional tables                                                     */
/* -------------------------------------------------------------------------- */

export interface ArrayOptions {
  problem: ArrayProblem;
  /** Climbing stairs only. */
  n?: number;
  /** House robber and longest increasing subsequence. */
  values?: number[];
  /** Coin change. */
  coins?: number[];
  amount?: number;
}

/** Ways to climb n stairs taking one or two at a time. */
function stairsRun(n: number): TableRun {
  const cols = n + 1;
  const rec = createTableRecorder({ rows: 1, cols });

  rec.write(0, 0, 1, "Standing at the bottom, there is exactly one way to have got there: do nothing.", {
    isBase: true,
    formula: "ways(0) = 1",
  });
  if (cols > 1) {
    rec.write(0, 1, 1, "One stair up, and the only route is a single small step.", {
      isBase: true,
      formula: "ways(1) = 1",
    });
  }

  for (let i = 2; i < cols; i++) {
    const a = rec.read(0, i - 1);
    const b = rec.read(0, i - 2);
    rec.write(
      0,
      i,
      a + b,
      `The last move onto step ${i} was either a small step from ${i - 1} or a big one from ${i - 2}. Those are different routes, so add them.`,
      {
        deps: [
          { r: 0, c: i - 1 },
          { r: 0, c: i - 2 },
        ],
        formula: `ways(${i}) = ${a} + ${b} = ${a + b}`,
      },
    );
  }

  return rec.finish({
    rowLabels: ["ways"],
    colLabels: Array.from({ length: cols }, (_, i) => String(i)),
    rowTitle: "",
    colTitle: "stair",
    recurrence: ["ways(0) = 1", "ways(1) = 1", "ways(i) = ways(i - 1) + ways(i - 2)"],
    answer: `${rec.read(0, cols - 1)} ways to climb ${n} stairs`,
  });
}

/** Largest total from a row of houses, never taking two that are next door. */
function robRun(values: number[]): TableRun {
  const cols = values.length;
  const rec = createTableRecorder({ rows: 1, cols });

  rec.write(0, 0, values[0], `With only the first house available, the best you can do is take it: ${values[0]}.`, {
    isBase: true,
    formula: `best(0) = ${values[0]}`,
  });

  if (cols > 1) {
    const best = Math.max(values[0], values[1]);
    rec.write(0, 1, best, `Two houses, and they are neighbors, so take the larger of ${values[0]} and ${values[1]}.`, {
      isBase: true,
      formula: `best(1) = max(${values[0]}, ${values[1]}) = ${best}`,
    });
  }

  for (let i = 2; i < cols; i++) {
    const skip = rec.read(0, i - 1);
    const take = values[i] + rec.read(0, i - 2);
    const best = Math.max(skip, take);
    rec.write(
      0,
      i,
      best,
      take >= skip
        ? `Taking house ${i} pays ${values[i]} but rules out its neighbor, so it pairs with the best up to house ${i - 2}. That wins here.`
        : `Taking house ${i} would cost the neighbor, and skipping it keeps the better total from house ${i - 1}.`,
      {
        deps: [
          { r: 0, c: i - 1 },
          { r: 0, c: i - 2 },
        ],
        formula: `best(${i}) = max(${skip}, ${values[i]} + ${rec.read(0, i - 2)}) = ${best}`,
      },
    );
  }

  return rec.finish({
    rowLabels: ["best"],
    colLabels: values.map(String),
    rowTitle: "",
    colTitle: "house value",
    recurrence: ["best(0) = v(0)", "best(1) = max(v(0), v(1))", "best(i) = max(best(i - 1), v(i) + best(i - 2))"],
    answer: `${rec.read(0, cols - 1)} is the largest safe total`,
  });
}

/**
 * Fewest coins that add up to a target.
 *
 * Unlike the other one-dimensional problems, the number of options per cell
 * varies with the coin list, so each candidate coin gets its own frame. The
 * scanning is the part worth watching here.
 */
function coinsRun(coins: number[], amount: number): TableRun {
  const cols = amount + 1;
  const rec = createTableRecorder({ rows: 1, cols });
  const UNREACHABLE = -1;

  rec.write(0, 0, 0, "Making zero takes zero coins. Nothing to decide.", { isBase: true, formula: "few(0) = 0" });

  for (let a = 1; a < cols; a++) {
    let best = UNREACHABLE;
    let bestCoin = 0;

    for (const coin of coins) {
      if (coin > a) continue;
      const rest = rec.read(0, a - coin);
      if (rest === UNREACHABLE) continue;
      rec.consider(
        0,
        a,
        `Try paying a ${coin} towards ${a}. That leaves ${a - coin}, which already needs ${rest} ${rest === 1 ? "coin" : "coins"}, so this route costs ${rest + 1}.`,
        [{ r: 0, c: a - coin }],
        `few(${a}) via ${coin} = 1 + few(${a - coin}) = ${rest + 1}`,
      );
      if (best === UNREACHABLE || rest + 1 < best) {
        best = rest + 1;
        bestCoin = coin;
      }
    }

    rec.write(
      0,
      a,
      best,
      best === UNREACHABLE
        ? `No coin reaches ${a} from anywhere already solved, so this amount cannot be made.`
        : `The cheapest route into ${a} pays a ${bestCoin} first, for ${best} ${best === 1 ? "coin" : "coins"} in total.`,
      {
        deps: best === UNREACHABLE ? [] : [{ r: 0, c: a - bestCoin }],
        formula: best === UNREACHABLE ? `few(${a}) = unreachable` : `few(${a}) = ${best}`,
      },
    );
  }

  const final = rec.read(0, cols - 1);
  return rec.finish({
    rowLabels: ["coins"],
    colLabels: Array.from({ length: cols }, (_, i) => String(i)),
    rowTitle: "",
    colTitle: "amount",
    recurrence: ["few(0) = 0", "few(a) = 1 + min over coins c of few(a - c)"],
    answer:
      final === UNREACHABLE
        ? `${amount} cannot be made from these coins`
        : `${final} ${final === 1 ? "coin" : "coins"} make ${amount}`,
  });
}

/** Longest run of increasing values you can pick out without reordering. */
function lisRun(values: number[]): TableRun {
  const cols = values.length;
  const rec = createTableRecorder({ rows: 1, cols });

  rec.write(0, 0, 1, `A sequence ending at the first value is just that value on its own, so the length is 1.`, {
    isBase: true,
    formula: "len(0) = 1",
  });

  for (let i = 1; i < cols; i++) {
    let best = 1;
    let from = -1;

    for (let j = 0; j < i; j++) {
      if (values[j] >= values[i]) continue;
      const candidate = rec.read(0, j) + 1;
      rec.consider(
        0,
        i,
        `${values[j]} is smaller than ${values[i]}, so a run ending at ${values[j]} can be extended. That run is ${rec.read(0, j)} long, giving ${candidate}.`,
        [{ r: 0, c: j }],
        `len(${i}) via ${j} = ${rec.read(0, j)} + 1 = ${candidate}`,
      );
      if (candidate > best) {
        best = candidate;
        from = j;
      }
    }

    rec.write(
      0,
      i,
      best,
      from === -1
        ? `Nothing to the left of ${values[i]} is smaller than it, so the best run ending here is ${values[i]} alone.`
        : `The best run ending at ${values[i]} extends the one ending at ${values[from]}, for a length of ${best}.`,
      {
        deps: from === -1 ? [] : [{ r: 0, c: from }],
        formula: `len(${i}) = ${best}`,
      },
    );
  }

  const answer = Math.max(...values.map((_, i) => rec.read(0, i)));
  return rec.finish({
    rowLabels: ["length"],
    colLabels: values.map(String),
    rowTitle: "",
    colTitle: "value",
    recurrence: ["len(i) = 1 + the largest len(j) where j is left of i and v(j) < v(i)", "len(i) = 1 if there is no such j"],
    answer: `the longest increasing run is ${answer} long`,
  });
}

export function arraySteps(options: ArrayOptions): TableRun {
  switch (options.problem) {
    case "rob":
      return robRun(options.values ?? [2, 7, 9, 3, 1]);
    case "coins":
      return coinsRun(options.coins ?? [1, 3, 4], options.amount ?? 6);
    case "lis":
      return lisRun(options.values ?? [3, 1, 4, 1, 5, 9, 2, 6]);
    case "stairs":
    default:
      return stairsRun(options.n ?? 8);
  }
}

/* -------------------------------------------------------------------------- */
/* Two-dimensional tables                                                     */
/* -------------------------------------------------------------------------- */

export interface GridOptions {
  problem: GridProblem;
  /** Minimum path sum. */
  grid?: number[][];
  /** Longest common subsequence and edit distance. */
  a?: string;
  b?: string;
  /** Knapsack. */
  items?: { weight: number; value: number }[];
  capacity?: number;
}

/** The empty prefix, drawn at the head of both axes on the string problems. */
const EMPTY_PREFIX = "-";

/** Cheapest route from the top-left corner of a grid to the bottom-right. */
function minPathRun(grid: number[][]): TableRun {
  const rows = grid.length;
  const cols = grid[0].length;
  const rec = createTableRecorder({ rows, cols });

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cost = grid[r][c];

      if (r === 0 && c === 0) {
        rec.write(0, 0, cost, `The start costs ${cost} and there is no way in but to be there.`, {
          isBase: true,
          formula: `cheap(0,0) = ${cost}`,
        });
        continue;
      }

      const deps: CellRef[] = [];
      if (r > 0) deps.push({ r: r - 1, c });
      if (c > 0) deps.push({ r, c: c - 1 });
      const options = deps.map((d) => rec.read(d.r, d.c));
      const best = Math.min(...options);
      const total = cost + best;

      rec.write(
        r,
        c,
        total,
        deps.length === 1
          ? `Along the edge there is only one way in, so the cheapest route here is whatever reached the previous cell, plus ${cost}.`
          : `Two ways in, costing ${options[0]} from above and ${options[1]} from the left. Take the cheaper and add this cell's ${cost}.`,
        { deps, formula: `cheap(${r},${c}) = ${cost} + ${best} = ${total}` },
      );
    }
  }

  // Walking the finished table backwards turns a number into a route. The
  // table alone says what the trip costs; the traceback says which way to go,
  // and that is usually what the reader actually wanted.
  let r = rows - 1;
  let c = cols - 1;
  rec.extendPath({ r, c });
  rec.snapshot("The corner holds the answer. Now walk back to see which route produced it.", { active: { r, c } });
  while (r > 0 || c > 0) {
    const fromUp = r > 0 ? rec.read(r - 1, c) : Number.POSITIVE_INFINITY;
    const fromLeft = c > 0 ? rec.read(r, c - 1) : Number.POSITIVE_INFINITY;
    if (fromUp <= fromLeft) r -= 1;
    else c -= 1;
    rec.extendPath({ r, c });
    rec.snapshot(`The cheaper neighbor was ${Math.min(fromUp, fromLeft)}, so the route came through here.`, {
      active: { r, c },
    });
  }

  return rec.finish({
    rowLabels: Array.from({ length: rows }, (_, i) => String(i)),
    colLabels: Array.from({ length: cols }, (_, i) => String(i)),
    rowTitle: "row",
    colTitle: "column",
    recurrence: ["cheap(0,0) = grid(0,0)", "cheap(r,c) = grid(r,c) + min(cheap(r - 1, c), cheap(r, c - 1))"],
    answer: `the cheapest route costs ${rec.read(rows - 1, cols - 1)}`,
  });
}

/** Longest subsequence shared by two strings, keeping order but not adjacency. */
function lcsRun(a: string, b: string): TableRun {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const rec = createTableRecorder({ rows, cols });

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 0 || c === 0) {
        rec.write(r, c, 0, "One of the two prefixes is empty, so there is nothing to share. Zero.", {
          isBase: true,
          formula: `lcs(${r},${c}) = 0`,
        });
        continue;
      }

      const ac = a[r - 1];
      const bc = b[c - 1];

      if (ac === bc) {
        const diag = rec.read(r - 1, c - 1);
        rec.write(
          r,
          c,
          diag + 1,
          `Both prefixes end in ${ac}. Pair those two letters up and add 1 to whatever the shorter prefixes managed.`,
          { deps: [{ r: r - 1, c: c - 1 }], formula: `lcs(${r},${c}) = 1 + ${diag} = ${diag + 1}` },
        );
      } else {
        const up = rec.read(r - 1, c);
        const left = rec.read(r, c - 1);
        const best = Math.max(up, left);
        rec.write(
          r,
          c,
          best,
          `The two prefixes end in ${ac} and ${bc}, so at least one of those letters is unusable. Drop whichever loses less.`,
          {
            deps: [
              { r: r - 1, c },
              { r, c: c - 1 },
            ],
            formula: `lcs(${r},${c}) = max(${up}, ${left}) = ${best}`,
          },
        );
      }
    }
  }

  let r = a.length;
  let c = b.length;
  const letters: string[] = [];
  rec.extendPath({ r, c });
  rec.snapshot("The bottom-right cell has the length. Walking back recovers the letters themselves.", {
    active: { r, c },
  });
  while (r > 0 && c > 0) {
    if (a[r - 1] === b[c - 1]) {
      letters.unshift(a[r - 1]);
      r -= 1;
      c -= 1;
      rec.extendPath({ r, c });
      rec.snapshot(`This cell came from a match, so ${letters[0]} belongs in the answer.`, { active: { r, c } });
    } else if (rec.read(r - 1, c) >= rec.read(r, c - 1)) {
      r -= 1;
      rec.extendPath({ r, c });
      rec.snapshot("This cell copied the value above it, so the step came from there.", { active: { r, c } });
    } else {
      c -= 1;
      rec.extendPath({ r, c });
      rec.snapshot("This cell copied the value to its left, so the step came from there.", { active: { r, c } });
    }
  }

  return rec.finish({
    rowLabels: [EMPTY_PREFIX, ...a.split("")],
    colLabels: [EMPTY_PREFIX, ...b.split("")],
    rowTitle: a,
    colTitle: b,
    recurrence: [
      "lcs(r,0) = lcs(0,c) = 0",
      "if the letters match: lcs(r,c) = 1 + lcs(r - 1, c - 1)",
      "if they differ: lcs(r,c) = max(lcs(r - 1, c), lcs(r, c - 1))",
    ],
    answer: `${rec.read(a.length, b.length)} shared letters: ${letters.join("") || "none"}`,
  });
}

/** Fewest single-letter edits that turn one string into another. */
function editRun(a: string, b: string): TableRun {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const rec = createTableRecorder({ rows, cols });

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 0) {
        rec.write(0, c, c, `Turning nothing into the first ${c} letters means typing all ${c} of them.`, {
          isBase: true,
          formula: `edit(0,${c}) = ${c}`,
        });
        continue;
      }
      if (c === 0) {
        rec.write(r, 0, r, `Turning the first ${r} letters into nothing means deleting all ${r}.`, {
          isBase: true,
          formula: `edit(${r},0) = ${r}`,
        });
        continue;
      }

      const ac = a[r - 1];
      const bc = b[c - 1];

      if (ac === bc) {
        const diag = rec.read(r - 1, c - 1);
        rec.write(r, c, diag, `Both end in ${ac}, so that letter is already right and costs nothing to keep.`, {
          deps: [{ r: r - 1, c: c - 1 }],
          formula: `edit(${r},${c}) = ${diag}`,
        });
      } else {
        const del = rec.read(r - 1, c);
        const ins = rec.read(r, c - 1);
        const sub = rec.read(r - 1, c - 1);
        const best = 1 + Math.min(del, ins, sub);
        rec.write(
          r,
          c,
          best,
          `${ac} and ${bc} differ, so one edit is unavoidable: delete, insert, or substitute. Take the cheapest starting point and add 1.`,
          {
            deps: [
              { r: r - 1, c },
              { r, c: c - 1 },
              { r: r - 1, c: c - 1 },
            ],
            formula: `edit(${r},${c}) = 1 + min(${del}, ${ins}, ${sub}) = ${best}`,
          },
        );
      }
    }
  }

  return rec.finish({
    rowLabels: [EMPTY_PREFIX, ...a.split("")],
    colLabels: [EMPTY_PREFIX, ...b.split("")],
    rowTitle: a,
    colTitle: b,
    recurrence: [
      "edit(r,0) = r and edit(0,c) = c",
      "if the letters match: edit(r,c) = edit(r - 1, c - 1)",
      "if they differ: edit(r,c) = 1 + min(edit(r - 1, c), edit(r, c - 1), edit(r - 1, c - 1))",
    ],
    answer: `${rec.read(a.length, b.length)} edits turn ${a} into ${b}`,
  });
}

/** Most value that fits in a bag, each item taken at most once. */
function knapsackRun(items: { weight: number; value: number }[], capacity: number): TableRun {
  const rows = items.length + 1;
  const cols = capacity + 1;
  const rec = createTableRecorder({ rows, cols });

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 0) {
        rec.write(0, c, 0, "With no items to choose from, every bag size is worth nothing.", {
          isBase: true,
          formula: `best(0,${c}) = 0`,
        });
        continue;
      }

      const item = items[r - 1];
      const without = rec.read(r - 1, c);

      if (item.weight > c) {
        rec.write(
          r,
          c,
          without,
          `Item ${r} weighs ${item.weight} and the bag only holds ${c}, so this row copies the one above it.`,
          { deps: [{ r: r - 1, c }], formula: `best(${r},${c}) = ${without}` },
        );
        continue;
      }

      const withIt = item.value + rec.read(r - 1, c - item.weight);
      const best = Math.max(without, withIt);
      rec.write(
        r,
        c,
        best,
        withIt > without
          ? `Taking item ${r} pays ${item.value} and leaves room for ${c - item.weight}, which beats skipping it.`
          : `Taking item ${r} would pay ${item.value} but crowd out better things, so skipping it wins.`,
        {
          deps: [
            { r: r - 1, c },
            { r: r - 1, c: c - item.weight },
          ],
          formula: `best(${r},${c}) = max(${without}, ${item.value} + ${rec.read(r - 1, c - item.weight)}) = ${best}`,
        },
      );
    }
  }

  let r = items.length;
  let c = capacity;
  const taken: number[] = [];
  rec.extendPath({ r, c });
  rec.snapshot("The corner is the best total. Walking up the rows says which items produced it.", {
    active: { r, c },
  });
  while (r > 0) {
    if (rec.read(r, c) !== rec.read(r - 1, c)) {
      taken.unshift(r);
      c -= items[r - 1].weight;
      r -= 1;
      rec.extendPath({ r, c });
      rec.snapshot(`This row improved on the one above, so item ${taken[0]} is in the bag.`, { active: { r, c } });
    } else {
      r -= 1;
      rec.extendPath({ r, c });
      rec.snapshot("This row matched the one above it, so that item was left behind.", { active: { r, c } });
    }
  }

  return rec.finish({
    rowLabels: ["none", ...items.map((it, i) => `${i + 1}: w${it.weight} v${it.value}`)],
    colLabels: Array.from({ length: cols }, (_, i) => String(i)),
    rowTitle: "items available",
    colTitle: "bag capacity",
    recurrence: [
      "best(0,c) = 0",
      "if the item is too heavy: best(r,c) = best(r - 1, c)",
      "otherwise: best(r,c) = max(best(r - 1, c), value(r) + best(r - 1, c - weight(r)))",
    ],
    answer: `${rec.read(items.length, capacity)} from ${taken.length === 0 ? "an empty bag" : `items ${taken.join(" and ")}`}`,
  });
}

const DEFAULT_GRID = [
  [1, 3, 1, 2],
  [1, 5, 1, 3],
  [4, 2, 1, 1],
  [1, 2, 1, 1],
];

const DEFAULT_ITEMS = [
  { weight: 1, value: 1 },
  { weight: 3, value: 4 },
  { weight: 4, value: 5 },
  { weight: 5, value: 7 },
];

export function gridSteps(options: GridOptions): TableRun {
  switch (options.problem) {
    case "lcs":
      return lcsRun(options.a ?? "ABCB", options.b ?? "BDCAB");
    case "edit":
      return editRun(options.a ?? "kitten", options.b ?? "sitting");
    case "knapsack":
      return knapsackRun(options.items ?? DEFAULT_ITEMS, options.capacity ?? 7);
    case "minpath":
    default:
      return minPathRun(options.grid ?? DEFAULT_GRID);
  }
}
