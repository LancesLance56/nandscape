/**
 * Recursion and memoisation, recorded as call trees.
 *
 * Three problems, chosen so the trees look as different as possible from each
 * other. Factorial recurses once per call and its tree is a straight chain,
 * which is the shape that makes the induction reading obvious. Fibonacci
 * recurses twice and its tree explodes, which is the argument for a memo.
 * Binomial coefficients take two arguments, so the memo has to be keyed on a
 * pair, and that is the step that leads into a two-dimensional table.
 *
 * Each generator is the real recursive function with recorder calls sitting
 * where the calls and returns actually happen. Nothing is reconstructed after
 * the fact, so a frame cannot claim the algorithm did something it did not.
 */

import { createCallRecorder, type CallRun } from "./types";

export type RecursionProblem = "factorial" | "fib" | "binomial";
export type RecursionMode = "naive" | "memo";

export interface RecursionOptions {
  problem: RecursionProblem;
  mode: RecursionMode;
  n: number;
  /** Only read by the binomial problem. */
  k?: number;
}

/* -------------------------------------------------------------------------- */

/**
 * n! as a chain of calls.
 *
 * Memoising this one saves nothing, and that is worth seeing rather than being
 * told: every call has a different argument, so the cache is written n times
 * and read never. Overlapping subproblems are a property of the problem, not
 * something a technique can add.
 */
function factorialRun({ mode, n }: RecursionOptions): CallRun {
  const rec = createCallRecorder();
  const memo = new Map<string, number>();

  function go(x: number): number {
    const label = `fact(${x})`;
    const key = String(x);

    if (mode === "memo" && memo.has(key)) {
      const cached = memo.get(key) as number;
      rec.hit(label, key, cached, `${label} is already in the memo. Return ${cached} without recursing.`);
      return cached;
    }

    rec.enter(
      label,
      key,
      x <= 1
        ? `${label} is called. This one is small enough to answer outright.`
        : `${label} is called. It cannot finish until fact(${x - 1}) comes back, so it waits.`,
    );

    if (x <= 1) {
      if (mode === "memo") {
        memo.set(key, 1);
        rec.memoSet(key, 1);
      }
      rec.ret(1, `${label} is the base case. Return 1, and the chain starts unwinding from here.`, true);
      return 1;
    }

    const sub = go(x - 1);
    const value = x * sub;
    if (mode === "memo") {
      memo.set(key, value);
      rec.memoSet(key, value);
    }
    rec.ret(value, `fact(${x - 1}) came back as ${sub}. Multiply by ${x} and ${label} returns ${value}.`);
    return value;
  }

  const answer = go(Math.max(0, n));
  return rec.finish(
    ["fact(0) = 1", "fact(1) = 1", "fact(n) = n x fact(n - 1)"],
    `fact(${n}) = ${answer.toLocaleString("en-US")}`,
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Fibonacci, the standard argument for memoisation.
 *
 * Naive mode is the one to watch first. The same call turns up again and again
 * in different parts of the tree, and every repeat rebuilds a subtree that was
 * already built somewhere to its left.
 */
function fibRun({ mode, n }: RecursionOptions): CallRun {
  const rec = createCallRecorder();
  const memo = new Map<string, number>();

  function go(x: number): number {
    const label = `fib(${x})`;
    const key = String(x);

    if (mode === "memo" && memo.has(key)) {
      const cached = memo.get(key) as number;
      rec.hit(label, key, cached, `${label} was worked out earlier. Read ${cached} from the memo and stop here.`);
      return cached;
    }

    if (rec.stopped) return 0;

    rec.enter(
      label,
      key,
      x <= 1
        ? `${label} is called, and it is small enough to answer on the spot.`
        : `${label} is called. It needs fib(${x - 1}) and fib(${x - 2}), and it takes the left one first.`,
    );

    if (x <= 1) {
      if (mode === "memo") {
        memo.set(key, x);
        rec.memoSet(key, x);
      }
      rec.ret(x, `${label} is a base case, so it returns ${x} immediately.`, true);
      return x;
    }

    const a = go(x - 1);
    const b = go(x - 2);
    const value = a + b;
    if (mode === "memo") {
      memo.set(key, value);
      rec.memoSet(key, value);
    }
    rec.ret(value, `Both halves are back: ${a} and ${b}. ${label} returns ${value}.`);
    return value;
  }

  const answer = go(Math.max(0, n));
  return rec.finish(["fib(0) = 0", "fib(1) = 1", "fib(n) = fib(n - 1) + fib(n - 2)"], `fib(${n}) = ${answer}`);
}

/* -------------------------------------------------------------------------- */

/**
 * Binomial coefficients, where the memo key is a pair.
 *
 * This is the bridge into the table widgets. Once a cache has to be keyed on
 * two numbers, the natural place to keep it is a grid, and a grid filled in a
 * sensible order is the bottom-up version of the same algorithm.
 */
function binomialRun({ mode, n, k = 2 }: RecursionOptions): CallRun {
  const rec = createCallRecorder();
  const memo = new Map<string, number>();

  function go(a: number, b: number): number {
    const label = `C(${a},${b})`;
    const key = `${a},${b}`;

    if (mode === "memo" && memo.has(key)) {
      const cached = memo.get(key) as number;
      rec.hit(label, key, cached, `${label} is in the memo under the key ${key}. Return ${cached}.`);
      return cached;
    }

    if (rec.stopped) return 0;

    const isBase = b === 0 || b === a;
    rec.enter(
      label,
      key,
      isBase
        ? `${label} is called. Choosing none, or choosing all of them, leaves exactly one option.`
        : `${label} is called. Split on the first item: either it is in the group or it is not.`,
    );

    if (isBase) {
      if (mode === "memo") {
        memo.set(key, 1);
        rec.memoSet(key, 1);
      }
      rec.ret(1, `${label} is a base case and returns 1.`, true);
      return 1;
    }

    const left = go(a - 1, b - 1);
    const right = go(a - 1, b);
    const value = left + right;
    if (mode === "memo") {
      memo.set(key, value);
      rec.memoSet(key, value);
    }
    rec.ret(value, `Take it: ${left} ways. Leave it: ${right} ways. ${label} returns ${value}.`);
    return value;
  }

  const safeN = Math.max(1, n);
  const safeK = Math.min(Math.max(0, k), safeN);
  const answer = go(safeN, safeK);
  return rec.finish(
    ["C(n,0) = 1", "C(n,n) = 1", "C(n,k) = C(n - 1, k - 1) + C(n - 1, k)"],
    `C(${safeN},${safeK}) = ${answer}`,
  );
}

/* -------------------------------------------------------------------------- */

export function recursionSteps(options: RecursionOptions): CallRun {
  switch (options.problem) {
    case "factorial":
      return factorialRun(options);
    case "binomial":
      return binomialRun(options);
    case "fib":
    default:
      return fibRun(options);
  }
}

/** Closed forms, used to check a run rather than to produce one. */
export const REFERENCE = {
  factorial: (n: number): number => (n <= 1 ? 1 : n * REFERENCE.factorial(n - 1)),
  fib: (n: number): number => (n <= 1 ? n : REFERENCE.fib(n - 1) + REFERENCE.fib(n - 2)),
  binomial: (n: number, k: number): number => {
    if (k === 0 || k === n) return 1;
    return REFERENCE.binomial(n - 1, k - 1) + REFERENCE.binomial(n - 1, k);
  },
};
