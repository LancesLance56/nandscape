// TODO: Make this seeding instead using json like for blogs too

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

const twoToOneMultiplexer: PuzzleSpec = {
  slug: "two-to-one-multiplexer",
  title: "2-to-1 Multiplexer",
  description:
    "No gate types are off-limits this time,  just a tight budget. Output A when SEL is 0, and B when SEL is 1.",
  difficulty: "easy",
  tags: ["combinational", "selectors"],
  gateBudget: 4,
  inputs: [{ name: "SEL" }, { name: "A" }, { name: "B" }],
  outputs: [{ name: "Y" }],
  testCases: truthTable(["SEL", "A", "B"], ({ SEL, A, B }) => ({ Y: SEL ? B : A })),
};

const xorFromScratch: PuzzleSpec = {
  slug: "xor-from-scratch",
  title: "XOR From Scratch",
  description:
    "XOR and XNOR are banned this time. Build a 2-input XOR out of AND, OR, NAND, and NOT instead,  every other gate is fair game.",
  difficulty: "easy",
  tags: ["combinational", "boolean-algebra"],
  gateBudget: 5,
  disallowedGateTypes: [GateType.XOR, GateType.XNOR],
  inputs: [{ name: "A" }, { name: "B" }],
  outputs: [{ name: "Y" }],
  testCases: truthTable(["A", "B"], ({ A, B }) => ({ Y: A !== B ? 1 : 0 })),
};

const oneBitEqualityChecker: PuzzleSpec = {
  slug: "one-bit-equality-checker",
  title: "1-Bit Equality Checker",
  description:
    "XNOR would make this trivial, so it's banned. Output HIGH whenever A and B match, using XOR, NOT, or anything else instead.",
  difficulty: "easy",
  tags: ["combinational", "comparators"],
  gateBudget: 3,
  disallowedGateTypes: [GateType.XNOR],
  inputs: [{ name: "A" }, { name: "B" }],
  outputs: [{ name: "EQ" }],
  testCases: truthTable(["A", "B"], ({ A, B }) => ({ EQ: A === B ? 1 : 0 })),
};

const halfAdderNandOnly: PuzzleSpec = {
  slug: "half-adder",
  title: "Half Adder (NAND only)",
  description:
    "Add two single bits, producing SUM and CARRY as separate outputs. The catch: you only have NAND gates to build it from, so XOR isn't free this time.",
  difficulty: "medium",
  tags: ["combinational", "arithmetic"],
  gateBudget: 9,
  allowedGateTypes: [GateType.NAND],
  inputs: [{ name: "A" }, { name: "B" }],
  outputs: [{ name: "SUM" }, { name: "CARRY" }],
  testCases: truthTable(["A", "B"], ({ A, B }) => ({
    SUM: A !== B ? 1 : 0,
    CARRY: A && B ? 1 : 0,
  })),
};

const halfAdderNorOnly: PuzzleSpec = {
  slug: "half-adder-nor-only",
  title: "Half Adder (NOR only)",
  description:
    "NOR is universal too. Every gate on the canvas,  even AND, OR, and NOT,  has to be built from NOR alone. Produce SUM and CARRY for two bits.",
  difficulty: "medium",
  tags: ["combinational", "arithmetic"],
  gateBudget: 12,
  allowedGateTypes: [GateType.NOR],
  inputs: [{ name: "A" }, { name: "B" }],
  outputs: [{ name: "SUM" }, { name: "CARRY" }],
  testCases: truthTable(["A", "B"], ({ A, B }) => ({
    SUM: A !== B ? 1 : 0,
    CARRY: A && B ? 1 : 0,
  })),
};

const threeInputMajorityVoter: PuzzleSpec = {
  slug: "three-input-majority-voter",
  title: "3-Input Majority Voter",
  description:
    "Again, no gate restrictions,  just keep the gate count down. Output HIGH whenever at least two of the three inputs are HIGH.",
  difficulty: "medium",
  tags: ["combinational", "boolean-algebra"],
  gateBudget: 7,
  inputs: [{ name: "A" }, { name: "B" }, { name: "C" }],
  outputs: [{ name: "OUT" }],
  testCases: truthTable(["A", "B", "C"], ({ A, B, C }) => ({
    OUT: (A && B) || (B && C) || (A && C) ? 1 : 0,
  })),
};

const fullAdderNoXor: PuzzleSpec = {
  slug: "full-adder-no-xor",
  title: "Full Adder Without XOR",
  description:
    "Add two bits plus a carry-in,  but XOR and XNOR are banned, so the parity logic has to come from AND, OR, NAND, and NOT instead.",
  difficulty: "hard",
  tags: ["combinational", "arithmetic"],
  gateBudget: 18,
  disallowedGateTypes: [GateType.XOR, GateType.XNOR],
  inputs: [{ name: "A" }, { name: "B" }, { name: "CIN" }],
  outputs: [{ name: "SUM" }, { name: "COUT" }],
  testCases: truthTable(["A", "B", "CIN"], ({ A, B, CIN }) => {
    const total = A + B + CIN;
    return { SUM: total % 2 === 1 ? 1 : 0, COUT: total >= 2 ? 1 : 0 };
  }),
};

const oneBitMemoryCell: PuzzleSpec = {
  slug: "sr-latch-1-bit-memory",
  title: "1-Bit Memory Cell",
  description:
    "Build a circuit that remembers a single bit using two cross-coupled NAND gates. Inputs are active-low: pulse S low to set, R low to reset, and hold both high to remember whatever it last saw.",
  difficulty: "hard",
  tags: ["sequential", "memory"],
  gateBudget: 2,
  allowedGateTypes: [GateType.NAND],
  inputs: [{ name: "S", defaultValue: 1 }, { name: "R", defaultValue: 1 }],
  outputs: [{ name: "Q" }, { name: "QN" }],
  testCases: [
    {
      sequence: [
        { setInputs: { S: 0, R: 1 }, expectOutputs: { Q: 1, QN: 0 } },
        { setInputs: { S: 1, R: 1 }, expectOutputs: { Q: 1, QN: 0 } },
        { setInputs: { S: 1, R: 0 }, expectOutputs: { Q: 0, QN: 1 } },
        { setInputs: { S: 1, R: 1 }, expectOutputs: { Q: 0, QN: 1 } },
      ],
    },
  ],
};

const gatedDLatchNorOnly: PuzzleSpec = {
  slug: "gated-d-latch-nor-only",
  title: "Gated D Latch (NOR only)",
  description:
    "Build a transparent-when-enabled D latch using nothing but NOR gates,  you'll need to derive AND, OR, and NOT from NOR before you even get to the latch itself.",
  difficulty: "hard",
  tags: ["sequential", "memory"],
  gateBudget: 15,
  allowedGateTypes: [GateType.NOR],
  inputs: [{ name: "D", defaultValue: 0 }, { name: "E", defaultValue: 0 }],
  outputs: [{ name: "Q" }, { name: "QN" }],
  testCases: [
    {
      sequence: [
        { setInputs: { D: 1, E: 1 }, expectOutputs: { Q: 1, QN: 0 } },
        { setInputs: { D: 0, E: 1 }, expectOutputs: { Q: 0, QN: 1 } },
        { setInputs: { E: 0 }, expectOutputs: { Q: 0, QN: 1 } },
        { setInputs: { D: 1 }, expectOutputs: { Q: 0, QN: 1 } },
        { setInputs: { E: 1 }, expectOutputs: { Q: 1, QN: 0 } },
      ],
    },
  ],
};

export const DEFAULT_PUZZLES: PuzzleSpec[] = [
  andFromNand,
  twoToOneMultiplexer,
  xorFromScratch,
  oneBitEqualityChecker,
  halfAdderNandOnly,
  halfAdderNorOnly,
  threeInputMajorityVoter,
  fullAdderNoXor,
  oneBitMemoryCell,
  gatedDLatchNorOnly,
];

export function getDefaultPuzzle(slug: string): PuzzleSpec | undefined {
  return DEFAULT_PUZZLES.find((p) => p.slug === slug);
}