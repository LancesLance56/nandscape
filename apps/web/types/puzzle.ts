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
  testCases: PuzzleTestCase[];
  [p: string]: unknown;
}