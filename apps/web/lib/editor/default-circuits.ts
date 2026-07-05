import { GateType, SignalState } from "@nandscape/engine";
import { createGateNode, createIoNode } from "@/components/editor/nodes/node-registry";
import type { EditorNode, EditorEdge } from "@/types/editor";

export interface DefaultCircuit {
  id: string;
  name: string;
  description: string;
  build: () => { nodes: EditorNode[]; edges: EditorEdge[] };
}

function wire(id: string, source: string, sourceHandle: string, target: string, targetHandle: string): EditorEdge {
  return { id, source, target, sourceHandle, targetHandle, type: "wire", data: {} };
}

const andFromNand: DefaultCircuit = {
  id: "and-from-nand",
  name: "AND from NAND",
  description: "AND = NOT(NAND(a, b)) — the first gate every Nandscape puzzle builds on.",
  build: () => {
    const inputA = createIoNode({ x: 40, y: 40 }, "input", "A", { id: "demo_and_in_a" });
    const inputB = createIoNode({ x: 40, y: 160 }, "input", "B", { id: "demo_and_in_b" });
    const nand = createGateNode({ x: 240, y: 90 }, GateType.NAND, { id: "demo_and_nand" });
    const not = createGateNode({ x: 420, y: 90 }, GateType.NOT, { id: "demo_and_not" });
    const output = createIoNode({ x: 600, y: 90 }, "output", "OUT", { id: "demo_and_out" });

    return {
      nodes: [inputA, inputB, nand, not, output],
      edges: [
        wire("e1", inputA.id, "out-0", nand.id, "in-0"),
        wire("e2", inputB.id, "out-0", nand.id, "in-1"),
        wire("e3", nand.id, "out-0", not.id, "in-0"),
        wire("e4", not.id, "out-0", output.id, "in-0"),
      ],
    };
  },
};

const halfAdder: DefaultCircuit = {
  id: "half-adder",
  name: "Half Adder",
  description: "Adds two bits, producing SUM (XOR) and CARRY (AND).",
  build: () => {
    const inputA = createIoNode({ x: 40, y: 40 }, "input", "A", { id: "demo_ha_in_a" });
    const inputB = createIoNode({ x: 40, y: 200 }, "input", "B", { id: "demo_ha_in_b" });
    const xor = createGateNode({ x: 280, y: 40 }, GateType.XOR, { id: "demo_ha_xor" });
    const and = createGateNode({ x: 280, y: 200 }, GateType.AND, { id: "demo_ha_and" });
    const sum = createIoNode({ x: 500, y: 40 }, "output", "SUM", { id: "demo_ha_sum" });
    const carry = createIoNode({ x: 500, y: 200 }, "output", "CARRY", { id: "demo_ha_carry" });

    return {
      nodes: [inputA, inputB, xor, and, sum, carry],
      edges: [
        wire("e1", inputA.id, "out-0", xor.id, "in-0"),
        wire("e2", inputB.id, "out-0", xor.id, "in-1"),
        wire("e3", inputA.id, "out-0", and.id, "in-0"),
        wire("e4", inputB.id, "out-0", and.id, "in-1"),
        wire("e5", xor.id, "out-0", sum.id, "in-0"),
        wire("e6", and.id, "out-0", carry.id, "in-0"),
      ],
    };
  },
};

const srLatch: DefaultCircuit = {
  id: "sr-latch-nand",
  name: "SR Latch (NAND)",
  description: "Two cross-coupled NAND gates form a 1-bit memory cell — active-low S/R, idle by default.",
  build: () => {
    const inputS = createIoNode({ x: 40, y: 40 }, "input", "S", { id: "demo_sr_in_s", value: SignalState.HIGH });
    const inputR = createIoNode({ x: 40, y: 240 }, "input", "R", { id: "demo_sr_in_r", value: SignalState.HIGH });
    const nand1 = createGateNode({ x: 280, y: 40 }, GateType.NAND, { id: "demo_sr_nand1" });
    const nand2 = createGateNode({ x: 280, y: 240 }, GateType.NAND, { id: "demo_sr_nand2" });
    const q = createIoNode({ x: 500, y: 40 }, "output", "Q", { id: "demo_sr_q" });
    const qn = createIoNode({ x: 500, y: 240 }, "output", "QN", { id: "demo_sr_qn" });

    return {
      nodes: [inputS, inputR, nand1, nand2, q, qn],
      edges: [
        wire("e1", inputS.id, "out-0", nand1.id, "in-0"),
        wire("e2", inputR.id, "out-0", nand2.id, "in-1"),
        wire("e3", nand1.id, "out-0", nand2.id, "in-0"),
        wire("e4", nand2.id, "out-0", nand1.id, "in-1"),
        wire("e5", nand1.id, "out-0", q.id, "in-0"),
        wire("e6", nand2.id, "out-0", qn.id, "in-0"),
      ],
    };
  },
};

export const DEFAULT_CIRCUITS: DefaultCircuit[] = [andFromNand, halfAdder, srLatch];

export function getDefaultCircuit(id: string): DefaultCircuit | undefined {
  return DEFAULT_CIRCUITS.find((c) => c.id === id);
}
