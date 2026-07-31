import { GateType } from "@nandscape/engine";
import type { PuzzleSpec, PuzzleTestCase } from "@/types/puzzle";

function binaryCombinations(names: string[]): Record<string, 0 | 1>[] {
  const combos: Record<string, 0 | 1>[] = [];
  const count = names.length;
  for (let mask = 0; mask < 1 << count; mask++) {
    const combo: Record<string, 0 | 1> = {};
    names.forEach((name, i) => {
      combo[name] = ((mask >> (count - 1 - i)) & 1) as 0 | 1;
    });
    combos.push(combo);
  }
  return combos;
}

function truthTable(
  inputNames: string[],
  fn: (inputs: Record<string, 0 | 1>) => Record<string, 0 | 1>,
): PuzzleTestCase[] {
  return binaryCombinations(inputNames).map((inputs) => ({ row: { inputs, outputs: fn(inputs) } }));
}

const andFromNand: PuzzleSpec = {
  slug: "and-from-nand",
  title: "AND from NAND",
  description:
    "The NAND gate is universal, every other gate can be built from nothing but NAND. Start by building AND using only NAND gates.",
  difficulty: "easy",
  tags: ["combinational", "boolean-algebra"],
  gateBudget: 2,
  allowedGateTypes: [GateType.NAND],
  inputs: [{ name: "A" }, { name: "B" }],
  outputs: [{ name: "Y" }],
  testCases: truthTable(["A", "B"], ({ A, B }) => ({ Y: A && B ? 1 : 0 })),
};

export const DEFAULT_PUZZLES: PuzzleSpec[] = [
  andFromNand,
];

export function getDefaultPuzzle(slug: string): PuzzleSpec | undefined {
  return DEFAULT_PUZZLES.find((p) => p.slug === slug);
}