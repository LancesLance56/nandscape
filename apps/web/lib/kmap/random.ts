/**
 * Random K-map problem generation for the practice tool.
 *
 * Uniformly random truth tables make bad practice problems. Roughly half of
 * them either simplify to something trivial (one big group, or the constant
 * 1) or scatter into isolated 1s that no amount of grouping improves. Both
 * teach nothing, and the second is actively discouraging.
 *
 * So the generator builds problems the way an exam setter does: pick a few
 * product terms, paint their cells, and keep the result only if it is
 * actually worth solving. The difficulty levels differ in how much room
 * there is to get it wrong.
 */

import { type CellValue, type Implicant, emptyCells, mintermsOf, mintermsWhere } from "./kmap";
import { solveKMap, type KMapSolution } from "./solve";

export type Difficulty = "easy" | "medium" | "hard";

export interface KMapProblem {
  variables: string[];
  cells: CellValue[];
  solution: KMapSolution;
  difficulty: Difficulty;
  /** The seed that produced it, so a problem can be linked to or replayed. */
  seed: number;
}

const VAR_NAMES = ["A", "B", "C", "D"];

/** Deterministic PRNG so a seed always yields the same problem. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface DifficultySpec {
  varCount: number;
  /** How many product terms to paint before simplification. */
  terms: [number, number];
  /** Literals per painted term. Fewer literals means bigger, easier groups. */
  literals: [number, number];
  dontCares: [number, number];
  /** Reject problems whose minimal cover is outside this range. */
  solutionTerms: [number, number];
}

const SPECS: Record<Difficulty, DifficultySpec> = {
  easy: {
    varCount: 3,
    terms: [2, 3],
    literals: [1, 2],
    dontCares: [0, 0],
    solutionTerms: [2, 3],
  },
  medium: {
    varCount: 4,
    terms: [2, 4],
    literals: [2, 3],
    dontCares: [0, 2],
    solutionTerms: [2, 4],
  },
  hard: {
    varCount: 4,
    terms: [3, 5],
    literals: [2, 4],
    dontCares: [2, 4],
    solutionTerms: [3, 5],
  },
};

function randInt(rand: () => number, [lo, hi]: [number, number]): number {
  return lo + Math.floor(rand() * (hi - lo + 1));
}

/** A random cube with the given number of literals. */
function randomTerm(rand: () => number, varCount: number, literals: number): Implicant {
  const positions = Array.from({ length: varCount }, (_, i) => i);
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  const fixed = positions.slice(0, literals);
  let mask = (1 << varCount) - 1;
  let bits = 0;
  for (const p of fixed) {
    mask &= ~(1 << p);
    if (rand() < 0.5) bits |= 1 << p;
  }
  return { bits, mask };
}

/**
 * Is this problem worth putting in front of someone?
 *
 * The checks reject, in order: constant functions, maps so full or so empty
 * that grouping is trivial, solutions outside the intended difficulty band,
 * and (the important one) problems where the naive "circle each 1 on its
 * own" answer is already optimal, which would teach exactly the wrong
 * lesson about what K-maps are for.
 */
function isWorthSolving(cells: CellValue[], spec: DifficultySpec, solution: KMapSolution): boolean {
  if (solution.isContradiction || solution.isTautology) return false;

  const ones = mintermsWhere(cells, 1).length;
  const total = cells.length;
  if (ones < 3) return false;
  if (ones > total - 2) return false;

  const [minTerms, maxTerms] = spec.solutionTerms;
  if (solution.cover.length < minTerms || solution.cover.length > maxTerms) return false;

  // There has to be something to gain from grouping: at least one group in
  // the minimal cover must span more than a single cell.
  const hasRealGroup = solution.cover.some((imp) => mintermsOf(imp, spec.varCount).length > 1);
  if (!hasRealGroup) return false;

  // And the minimal answer must genuinely beat listing the minterms.
  return solution.cover.length < ones;
}

/**
 * Generate a problem for the given difficulty. Tries seeds in sequence from
 * the supplied one until a problem passes the quality filter, so callers get
 * a usable problem rather than an occasional dud.
 */
export function generateProblem(difficulty: Difficulty, seed: number): KMapProblem {
  const spec = SPECS[difficulty];
  const variables = VAR_NAMES.slice(0, spec.varCount);

  for (let attempt = 0; attempt < 400; attempt++) {
    const trySeed = (seed + attempt * 2654435761) >>> 0;
    const rand = mulberry32(trySeed);

    const cells = emptyCells(spec.varCount);
    const termCount = randInt(rand, spec.terms);
    for (let t = 0; t < termCount; t++) {
      const imp = randomTerm(rand, spec.varCount, randInt(rand, spec.literals));
      for (const m of mintermsOf(imp, spec.varCount)) cells[m] = 1;
    }

    const dcCount = randInt(rand, spec.dontCares);
    const zeros = mintermsWhere(cells, 0);
    for (let d = 0; d < dcCount && zeros.length > 0; d++) {
      const idx = Math.floor(rand() * zeros.length);
      cells[zeros[idx]] = "x";
      zeros.splice(idx, 1);
    }

    const solution = solveKMap(cells, spec.varCount);
    if (isWorthSolving(cells, spec, solution)) {
      return { variables, cells, solution, difficulty, seed: trySeed };
    }
  }

  // Deterministic fallback so the tool always renders something solvable
  // rather than throwing if the filter is ever tightened too far.
  const cells = emptyCells(spec.varCount);
  for (const m of [0, 1, 4, 5, 3]) if (m < cells.length) cells[m] = 1;
  return {
    variables,
    cells,
    solution: solveKMap(cells, spec.varCount),
    difficulty,
    seed,
  };
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}
