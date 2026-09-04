import type { CompareMode } from "@/types/practice";

/**
 * Judging a returned value against the expected one.
 *
 * Comparison happens on parsed JSON values, never on printed text. That is the
 * main practical benefit of the function-stub model over diffing stdout: a
 * solution is not marked wrong for printing `[0, 1]` where the expected output
 * was written `[0,1]`, and `1` never accidentally equals `"1"`.
 */

const DEFAULT_EPSILON = 1e-6;

export interface CompareOptions {
  mode: CompareMode;
  epsilon?: number;
}

export function valuesMatch(actual: unknown, expected: unknown, options: CompareOptions): boolean {
  const epsilon = options.epsilon ?? DEFAULT_EPSILON;

  switch (options.mode) {
    case "float":
      return floatEqual(actual, expected, epsilon);
    case "unordered":
      return unorderedEqual(actual, expected);
    case "exact":
    default:
      return exactEqual(actual, expected);
  }
}

function exactEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  // JSON has one number type, so a driver may hand back 2 where the author
  // wrote 2.0. Treating those as different would fail correct solutions for a
  // reason that exists nowhere in the problem.
  if (typeof a === "number" && typeof b === "number") {
    return a === b || (Number.isNaN(a) && Number.isNaN(b));
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, index) => exactEqual(item, b[index]));
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    if (aKeys.length !== bKeys.length) return false;
    if (!aKeys.every((key, index) => key === bKeys[index])) return false;
    return aKeys.every((key) => exactEqual(a[key], b[key]));
  }

  return false;
}

function floatEqual(a: unknown, b: unknown, epsilon: number): boolean {
  if (typeof a === "number" && typeof b === "number") {
    if (Number.isNaN(a) && Number.isNaN(b)) return true;
    if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b;
    // Relative tolerance once the magnitudes are large, absolute near zero -
    // a fixed absolute epsilon is far too strict for values in the millions
    // and far too loose for values around 1e-9.
    const scale = Math.max(1, Math.abs(a), Math.abs(b));
    return Math.abs(a - b) <= epsilon * scale;
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, index) => floatEqual(item, b[index], epsilon));
  }

  return exactEqual(a, b);
}

/**
 * Same elements, any order, at the top level only.
 *
 * Top level only is the deliberate choice: for "return every pair summing to
 * k", the order of the pairs is arbitrary but the order *within* each pair is
 * usually part of the answer. Recursing would quietly accept `[1, 0]` where
 * the problem asked for ascending indices.
 *
 * Matching is by greedy pairing rather than by sorting, because the elements
 * may be arrays or objects, which have no meaningful sort order. Quadratic,
 * which is irrelevant at the sizes a test case holds.
 */
function unorderedEqual(a: unknown, b: unknown): boolean {
  // Exact, not float. This mode means "the same items, in any order";
  // tolerance is what `float` is for, and the editor disables the epsilon
  // input outside float mode - so applying epsilon here contradicts both the
  // label the author reads and the control they are given.
  if (!Array.isArray(a) || !Array.isArray(b)) return exactEqual(a, b);
  if (a.length !== b.length) return false;

  const claimed = new Array<boolean>(b.length).fill(false);

  return a.every((item) => {
    const matchIndex = b.findIndex(
      (candidate, index) => !claimed[index] && exactEqual(item, candidate),
    );
    if (matchIndex === -1) return false;
    claimed[matchIndex] = true;
    return true;
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Render a value the way the results panel shows it - compact JSON, so an
 * expected/actual pair lines up visually and a long array does not explode
 * into one line per element.
 */
export function formatValue(value: unknown): string {
  if (value === undefined) return "undefined";
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}
