/**
 * Minimal sum-of-products via Quine-McCluskey.
 *
 * The widget needs a genuinely minimal answer, not merely a correct one: it
 * grades the reader's grouping against this, so "your solution has more
 * terms than necessary" has to actually be true. That rules out the greedy
 * cover most K-map demos ship with, which is correct but not always minimal.
 *
 * The pipeline is the textbook one: combine adjacent implicants until
 * nothing merges (prime implicants), take the ones that uniquely cover some
 * minterm (essential), then search exactly for the cheapest way to cover
 * what is left. At four variables the search space is small enough that the
 * exact step is cheap, and MAX_VARS keeps it that way.
 */

import {
  type CellValue,
  type Implicant,
  implicantKey,
  literalCount,
  mintermsOf,
  mintermsWhere,
} from "./kmap";

export interface KMapSolution {
  /** The chosen minimal cover. Empty means the function is constant 0. */
  cover: Implicant[];
  /** Every prime implicant, including ones the cover did not need. */
  primeImplicants: Implicant[];
  /** The subset of primes forced into any minimal cover. */
  essential: Implicant[];
  /** True when the function is 1 everywhere (cover is the single empty cube). */
  isTautology: boolean;
  /** True when there are no 1s at all. */
  isContradiction: boolean;
  /**
   * Other covers that are exactly as cheap. K-maps frequently have several
   * equally minimal answers, and a grader that accepted only one of them
   * would be wrong; the practice widget checks membership in this list.
   */
  alternativeCovers: Implicant[][];
}

/** Combine two implicants differing in exactly one fixed bit, or null. */
function combine(a: Implicant, b: Implicant): Implicant | null {
  if (a.mask !== b.mask) return null;
  const diff = a.bits ^ b.bits;
  if (diff === 0 || (diff & (diff - 1)) !== 0) return null;
  return { bits: a.bits & ~diff, mask: a.mask | diff };
}

/**
 * Prime implicants over the ON-set plus the don't-cares. Don't-cares
 * participate in merging (that is the whole point of them, they let groups
 * grow) but are not required to be covered later.
 *
 * No variable count needed: merging only ever inspects the bits already
 * present in the minterms, so the width of the space is implicit.
 */
export function primeImplicants(minterms: number[]): Implicant[] {
  if (minterms.length === 0) return [];

  let current: Implicant[] = minterms.map((m) => ({ bits: m, mask: 0 }));
  const primes = new Map<string, Implicant>();

  while (current.length > 0) {
    const merged = new Map<string, Implicant>();
    const used = new Set<string>();

    for (let i = 0; i < current.length; i++) {
      for (let j = i + 1; j < current.length; j++) {
        const c = combine(current[i], current[j]);
        if (!c) continue;
        merged.set(implicantKey(c), c);
        used.add(implicantKey(current[i]));
        used.add(implicantKey(current[j]));
      }
    }

    // Anything that never merged this round can never merge later, since
    // merging only ever removes fixed bits.
    for (const imp of current) {
      if (!used.has(implicantKey(imp))) primes.set(implicantKey(imp), imp);
    }

    current = [...merged.values()];
  }

  return [...primes.values()];
}

interface CoverSearchResult {
  best: Implicant[][];
  cost: [number, number];
}

/** Terms first, then total literals. The conventional minimality criterion. */
function costOf(cover: Implicant[], varCount: number): [number, number] {
  let literals = 0;
  for (const imp of cover) literals += literalCount(imp, varCount);
  return [cover.length, literals];
}

function cheaper(a: [number, number], b: [number, number]): boolean {
  return a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
}

/**
 * Exact minimum cover of `required` using `primes`, collecting every cover
 * that ties for cheapest.
 *
 * Branches on the least-covered remaining minterm rather than on implicants.
 * That keeps the branching factor down to the number of primes covering one
 * specific minterm, which for a 4-variable map is a handful, and it makes
 * the "must pick something that covers this" reasoning exhaustive by
 * construction.
 */
function searchMinimumCovers(
  required: number[],
  primes: Implicant[],
  varCount: number,
  limitAlternatives = 8,
): CoverSearchResult {
  const coverage = new Map<number, Implicant[]>();
  for (const m of required) coverage.set(m, []);
  for (const imp of primes) {
    for (const m of mintermsOf(imp, varCount)) {
      coverage.get(m)?.push(imp);
    }
  }

  let best: Implicant[][] = [];
  let bestCost: [number, number] = [Infinity, Infinity];

  const chosen: Implicant[] = [];

  const recurse = (remaining: Set<number>) => {
    if (remaining.size === 0) {
      const cost = costOf(chosen, varCount);
      if (cheaper(cost, bestCost)) {
        bestCost = cost;
        best = [[...chosen]];
      } else if (cost[0] === bestCost[0] && cost[1] === bestCost[1] && best.length < limitAlternatives) {
        const key = (c: Implicant[]) => c.map(implicantKey).sort().join("|");
        const k = key(chosen);
        if (!best.some((c) => key(c) === k)) best.push([...chosen]);
      }
      return;
    }

    // Bound: even one more term cannot beat a strictly cheaper best.
    if (chosen.length + 1 > bestCost[0]) return;

    // Branch on the hardest minterm: fewest primes able to cover it.
    let target = -1;
    let options: Implicant[] = [];
    for (const m of remaining) {
      const opts = coverage.get(m) ?? [];
      if (target === -1 || opts.length < options.length) {
        target = m;
        options = opts;
      }
    }
    if (options.length === 0) return; // unreachable for a well-formed problem

    for (const imp of options) {
      const covered = mintermsOf(imp, varCount);
      const next = new Set(remaining);
      for (const m of covered) next.delete(m);

      chosen.push(imp);
      recurse(next);
      chosen.pop();
    }
  };

  recurse(new Set(required));
  return { best, cost: bestCost };
}

/**
 * Solve a K-map to a minimal sum of products.
 *
 * `cells` may contain don't-cares, which are allowed into groups but never
 * required to be covered.
 */
export function solveKMap(cells: CellValue[], varCount: number): KMapSolution {
  const ones = mintermsWhere(cells, 1);
  const dontCares = mintermsWhere(cells, "x");

  if (ones.length === 0) {
    return {
      cover: [],
      primeImplicants: [],
      essential: [],
      isTautology: false,
      isContradiction: true,
      alternativeCovers: [],
    };
  }

  // Every non-zero cell is 1: the function is the constant 1, expressed as
  // the cube with every variable eliminated.
  if (ones.length + dontCares.length === cells.length && ones.length > 0) {
    const all: Implicant = { bits: 0, mask: (1 << varCount) - 1 };
    return {
      cover: [all],
      primeImplicants: [all],
      essential: [all],
      isTautology: true,
      isContradiction: false,
      alternativeCovers: [],
    };
  }

  const primes = primeImplicants([...ones, ...dontCares].sort((a, b) => a - b));

  // Essential primes: the only one covering some required minterm. Taking
  // them up front is safe (any minimal cover must include them) and shrinks
  // the exact search a lot.
  const coveringCount = new Map<number, Implicant[]>();
  for (const m of ones) coveringCount.set(m, []);
  for (const imp of primes) {
    for (const m of mintermsOf(imp, varCount)) coveringCount.get(m)?.push(imp);
  }

  const essential: Implicant[] = [];
  const essentialKeys = new Set<string>();
  for (const [, covers] of coveringCount) {
    if (covers.length === 1 && !essentialKeys.has(implicantKey(covers[0]))) {
      essential.push(covers[0]);
      essentialKeys.add(implicantKey(covers[0]));
    }
  }

  const stillNeeded = ones.filter(
    (m) => !essential.some((imp) => mintermsOf(imp, varCount).includes(m)),
  );

  if (stillNeeded.length === 0) {
    return {
      cover: essential,
      primeImplicants: primes,
      essential,
      isTautology: false,
      isContradiction: false,
      alternativeCovers: [],
    };
  }

  const remainingPrimes = primes.filter((imp) => !essentialKeys.has(implicantKey(imp)));
  const { best } = searchMinimumCovers(stillNeeded, remainingPrimes, varCount);

  const covers = best.map((extra) => [...essential, ...extra]);
  return {
    cover: covers[0] ?? essential,
    primeImplicants: primes,
    essential,
    isTautology: false,
    isContradiction: false,
    alternativeCovers: covers.slice(1),
  };
}

/**
 * Is the reader's set of groups a valid minimal answer?
 *
 * Deliberately not a comparison against one canonical cover. A K-map often
 * has several equally minimal solutions, so this checks the two properties
 * that actually matter: the groups reproduce the function, and they use no
 * more terms (and no more literals) than the true optimum.
 */
export interface CoverGrade {
  coversAllOnes: boolean;
  includesZero: boolean;
  /** Groups that could be dropped without breaking the cover. */
  redundant: Implicant[];
  termCount: number;
  optimalTermCount: number;
  optimalLiteralCount: number;
  literalCount: number;
  isMinimal: boolean;
}

export function gradeCover(
  userCover: Implicant[],
  cells: CellValue[],
  varCount: number,
  solution: KMapSolution,
): CoverGrade {
  const covered = new Set<number>();
  for (const imp of userCover) for (const m of mintermsOf(imp, varCount)) covered.add(m);

  const ones = mintermsWhere(cells, 1);
  const coversAllOnes = ones.every((m) => covered.has(m));
  const includesZero = [...covered].some((m) => cells[m] === 0);

  // A group is redundant when every 1 it covers is also covered by another
  // group. Don't-cares are ignored: covering them is free either way.
  const redundant: Implicant[] = [];
  for (const imp of userCover) {
    const mine = mintermsOf(imp, varCount).filter((m) => cells[m] === 1);
    const others = userCover.filter((o) => o !== imp);
    const otherCovered = new Set<number>();
    for (const o of others) for (const m of mintermsOf(o, varCount)) otherCovered.add(m);
    if (mine.every((m) => otherCovered.has(m))) redundant.push(imp);
  }

  let literals = 0;
  for (const imp of userCover) literals += literalCount(imp, varCount);
  let optimalLiterals = 0;
  for (const imp of solution.cover) optimalLiterals += literalCount(imp, varCount);

  return {
    coversAllOnes,
    includesZero,
    redundant,
    termCount: userCover.length,
    optimalTermCount: solution.cover.length,
    literalCount: literals,
    optimalLiteralCount: optimalLiterals,
    isMinimal:
      coversAllOnes &&
      !includesZero &&
      userCover.length === solution.cover.length &&
      literals === optimalLiterals,
  };
}
