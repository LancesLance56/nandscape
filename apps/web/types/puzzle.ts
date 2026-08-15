import type { GateType } from "@nandscape/engine";

export type PuzzleDifficulty = "easy" | "medium" | "hard" | "expert";

export type PrismaDifficulty = "EASY" | "MEDIUM" | "HARD" | "EXPERT";

export function difficultyFromPrisma(d: PrismaDifficulty): PuzzleDifficulty {
  return d.toLowerCase() as PuzzleDifficulty;
}

export function difficultyToPrisma(d: PuzzleDifficulty): PrismaDifficulty {
  return d.toUpperCase() as PrismaDifficulty;
}

export interface PuzzlePort {
  name: string;
  defaultValue?: 0 | 1;
}

export interface TruthTableRow {
  inputs: Record<string, 0 | 1>;
  outputs: Record<string, 0 | 1>;
}

export interface SequentialStep {
  setInputs?: Record<string, 0 | 1>;
  pulseClock?: string;
  expectOutputs: Record<string, 0 | 1>;
}

export interface PuzzleTestCase {
  row?: TruthTableRow;
  sequence?: SequentialStep[];
}

export type GateRestrictionDisplay = "hide" | "disable";

/**
 * Optional hint for the puzzle's starter graph: instead of one Output node
 * per port, group a run of related output ports into a single Bus Output
 * (a combined decimal/binary readout) or Seven-Segment Display node. Purely
 * a starter-canvas/display concern,  grading still checks each named port
 * independently (see grade-puzzle.ts), and any port not covered by a group
 * falls back to a plain Output node exactly like today.
 */
export interface BusOutputDisplayGroup {
  type: "bus";
  /** Must be a subset of this puzzle's `outputs` names, index 0 = MSB (top pin). */
  names: string[];
}

export interface SevenSegmentDisplayGroup {
  type: "seven-segment";
  /** Segment names in a, b, c, d, e, f, g order,  must match this puzzle's `outputs` names. */
  names: [string, string, string, string, string, string, string];
}

export type OutputDisplayGroup = BusOutputDisplayGroup | SevenSegmentDisplayGroup;

/**
 * Input-side mirror of OutputDisplayGroup: group a run of related input
 * ports into a single Bus Input node (N independently toggleable lanes with
 * one combined decimal/binary readout) instead of N separate Input toggles.
 * Purely a starter-canvas/display concern,  grading still resolves each
 * named port independently by walking bus-input nodes' names/values (see
 * grade-puzzle.ts), and any port not covered by a group falls back to a
 * plain Input node exactly like today.
 */
export interface BusInputDisplayGroup {
  type: "bus";
  /** Must be a subset of this puzzle's `inputs` names, index 0 = MSB (top pin). */
  names: string[];
}

export type InputDisplayGroup = BusInputDisplayGroup;

export interface PuzzleSpec {
  slug: string;
  title: string;
  description: string;
  difficulty: PuzzleDifficulty;
  tags: string[];
  gateBudget: number | null;
  allowedGateTypes?: GateType[] | null;
  disallowedGateTypes?: GateType[] | null;
  gateRestrictionDisplay?: GateRestrictionDisplay;
  inputs: PuzzlePort[];
  outputs: PuzzlePort[];
  inputDisplay?: InputDisplayGroup[];
  outputDisplay?: OutputDisplayGroup[];
  testCases: PuzzleTestCase[];
  [p: string]: unknown;
}