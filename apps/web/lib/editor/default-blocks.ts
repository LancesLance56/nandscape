import { CircuitBuilder } from "./circuit-builder";
import { fullAdder, halfAdder } from "./subcircuits";
import { deriveBlockPorts } from "./block-ports";
import type { SubcircuitBlockDefinition } from "@/types/subcircuit-block";

function buildBlock(
  id: string,
  name: string,
  description: string,
  build: (b: CircuitBuilder) => void,
): SubcircuitBlockDefinition {
  const b = new CircuitBuilder();
  build(b);
  const { nodes, edges } = b.build();
  const { inputs, outputs } = deriveBlockPorts(nodes);
  return { id, name, description, inputs, outputs, nodes, edges, builtIn: true, updatedAt: 0 };
}

function buildHalfAdderBlock(): SubcircuitBlockDefinition {
  return buildBlock(
    "builtin-half-adder",
    "Half Adder",
    "SUM (XOR) and CARRY (AND) for two bits.",
    (b) => {
      const inA = b.input("A", 40, 40);
      const inB = b.input("B", 40, 200);
      const ha = halfAdder(b, inA.out(0), inB.out(0), 260, 40);
      const sum = b.output("SUM", 500, 40);
      const carry = b.output("CARRY", 500, 200);
      b.connect(ha.sum, sum.in(0));
      b.connect(ha.carry, carry.in(0));
    },
  );
}

function buildFourBitAdderBlock(): SubcircuitBlockDefinition {
  return buildBlock(
    "builtin-4bit-adder",
    "4-Bit Adder",
    "Ripple-carry adds A[3:0] + B[3:0] + CIN -> S[3:0] and COUT.",
    (b) => {
      const cin = b.input("CIN", 40, -20);
      let carry = cin.out(0);
      for (let i = 0; i < 4; i++) {
        const y0 = i * 220;
        const inA = b.input(`A${i}`, 40, y0 + 40);
        const inB = b.input(`B${i}`, 40, y0 + 140);
        const sum = b.output(`S${i}`, 560, y0 + 60);
        const fa = fullAdder(b, inA.out(0), inB.out(0), carry, 240, y0 + 60);
        b.connect(fa.sum, sum.in(0));
        carry = fa.cout;
      }
      const cout = b.output("COUT", 780, 3 * 220 + 200);
      b.connect(carry, cout.in(0));
    },
  );
}

let cachedBuiltins: SubcircuitBlockDefinition[] | null = null;

export function getBuiltinSubcircuitBlocks(): SubcircuitBlockDefinition[] {
  if (!cachedBuiltins) {
    cachedBuiltins = [buildHalfAdderBlock(), buildFourBitAdderBlock()];
  }
  return cachedBuiltins;
}