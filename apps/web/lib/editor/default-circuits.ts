import { GateType, SignalState } from "@nandscape/engine";
import { CircuitBuilder } from "./circuit-builder";
import { orGate, norGate, halfAdder, fullAdder, halfSubtractor, fullSubtractor } from "./subcircuits";
import type { EditorNode, EditorEdge } from "@/types/editor";

export interface DefaultCircuit {
  id: string;
  name: string;
  description: string;
  build: () => { nodes: EditorNode[]; edges: EditorEdge[] };
}

const andFromNand: DefaultCircuit = {
  id: "and-from-nand",
  name: "AND from NAND",
  description: "AND = NOT(NAND(a, b)) — the first gate every Nandscape puzzle builds on.",
  build: () => {
    const b = new CircuitBuilder();
    const inA = b.input("A", 40, 40, { id: "demo_and_in_a" });
    const inB = b.input("B", 40, 160, { id: "demo_and_in_b" });
    const nand = b.gate(GateType.NAND, 240, 90, { id: "demo_and_nand" });
    const not = b.gate(GateType.NOT, 420, 90, { id: "demo_and_not" });
    const out = b.output("OUT", 600, 90, { id: "demo_and_out" });

    b.connect(inA.out(0), nand.in(0));
    b.connect(inB.out(0), nand.in(1));
    b.connect(nand.out(0), not.in(0));
    b.connect(not.out(0), out.in(0));

    return b.build();
  },
};

const halfAdderCircuit: DefaultCircuit = {
  id: "half-adder",
  name: "Half Adder",
  description: "Adds two bits, producing SUM (XOR) and CARRY (AND).",
  build: () => {
    const b = new CircuitBuilder();
    const inA = b.input("A", 40, 40, { id: "demo_ha_in_a" });
    const inB = b.input("B", 40, 200, { id: "demo_ha_in_b" });
    const ha = halfAdder(b, inA.out(0), inB.out(0), 280, 40, { xor: "demo_ha_xor", and: "demo_ha_and" });
    const sum = b.output("SUM", 500, 40, { id: "demo_ha_sum" });
    const carry = b.output("CARRY", 500, 200, { id: "demo_ha_carry" });

    b.connect(ha.sum, sum.in(0));
    b.connect(ha.carry, carry.in(0));

    return b.build();
  },
};

const srLatch: DefaultCircuit = {
  id: "sr-latch-nand",
  name: "SR Latch (NAND)",
  description: "Two cross-coupled NAND gates form a 1-bit memory cell — active-low S/R, idle by default.",
  build: () => {
    const b = new CircuitBuilder();
    const inS = b.input("S", 40, 40, { id: "demo_sr_in_s", value: SignalState.HIGH });
    const inR = b.input("R", 40, 240, { id: "demo_sr_in_r", value: SignalState.HIGH });
    const nand1 = b.gate(GateType.NAND, 280, 40, { id: "demo_sr_nand1" });
    const nand2 = b.gate(GateType.NAND, 280, 240, { id: "demo_sr_nand2" });
    const q = b.output("Q", 500, 40, { id: "demo_sr_q" });
    const qn = b.output("QN", 500, 240, { id: "demo_sr_qn" });

    b.connect(inS.out(0), nand1.in(0));
    b.connect(inR.out(0), nand2.in(1));
    b.connect(nand1.out(0), nand2.in(0));
    b.connect(nand2.out(0), nand1.in(1));
    b.connect(nand1.out(0), q.in(0));
    b.connect(nand2.out(0), qn.in(0));

    return b.build();
  },
};

const orFromNand: DefaultCircuit = {
  id: "or-from-nand",
  name: "OR from NAND",
  description: "OR = NAND(NOT a, NOT b) — De Morgan's law applied to the base gate.",
  build: () => {
    const b = new CircuitBuilder();
    const inA = b.input("A", 40, 40, { id: "demo_or_in_a" });
    const inB = b.input("B", 40, 160, { id: "demo_or_in_b" });
    const orOut = orGate(b, inA.out(0), inB.out(0), 240, 20, { not1: "demo_or_not_a", not2: "demo_or_not_b", nand: "demo_or_nand" });
    const out = b.output("OUT", 600, 90, { id: "demo_or_out" });

    b.connect(orOut, out.in(0));

    return b.build();
  },
};

const norGateCircuit: DefaultCircuit = {
  id: "nor-gate",
  name: "NOR Gate",
  description: "NOR = AND(NOT a, NOT b) — the other half of De Morgan's law.",
  build: () => {
    const b = new CircuitBuilder();
    const inA = b.input("A", 40, 40, { id: "demo_nor_in_a" });
    const inB = b.input("B", 40, 160, { id: "demo_nor_in_b" });
    const norOut = norGate(b, inA.out(0), inB.out(0), 240, 20, { not1: "demo_nor_not_a", not2: "demo_nor_not_b", and: "demo_nor_and" });
    const out = b.output("OUT", 600, 90, { id: "demo_nor_out" });

    b.connect(norOut, out.in(0));

    return b.build();
  },
};

const xnorGate: DefaultCircuit = {
  id: "xnor-gate",
  name: "XNOR Gate",
  description: "XNOR = NOT(XOR(a, b)) — outputs HIGH when the inputs agree.",
  build: () => {
    const b = new CircuitBuilder();
    const inA = b.input("A", 40, 40, { id: "demo_xnor_in_a" });
    const inB = b.input("B", 40, 160, { id: "demo_xnor_in_b" });
    const xor = b.gate(GateType.XOR, 260, 90, { id: "demo_xnor_xor" });
    const not = b.gate(GateType.NOT, 440, 90, { id: "demo_xnor_not" });
    const out = b.output("OUT", 620, 90, { id: "demo_xnor_out" });

    b.connect(inA.out(0), xor.in(0));
    b.connect(inB.out(0), xor.in(1));
    b.connect(xor.out(0), not.in(0));
    b.connect(not.out(0), out.in(0));

    return b.build();
  },
};

const buffer: DefaultCircuit = {
  id: "buffer-double-not",
  name: "Buffer (Double NOT)",
  description: "Two NOT gates in series pass the signal through unchanged — useful for demonstrating propagation delay without changing logic.",
  build: () => {
    const b = new CircuitBuilder();
    const inNode = b.input("IN", 40, 90, { id: "demo_buf_in" });
    const not1 = b.gate(GateType.NOT, 240, 90, { id: "demo_buf_not1" });
    const not2 = b.gate(GateType.NOT, 420, 90, { id: "demo_buf_not2" });
    const outNode = b.output("OUT", 600, 90, { id: "demo_buf_out" });

    b.connect(inNode.out(0), not1.in(0));
    b.connect(not1.out(0), not2.in(0));
    b.connect(not2.out(0), outNode.in(0));

    return b.build();
  },
};

const halfSubtractorCircuit: DefaultCircuit = {
  id: "half-subtractor",
  name: "Half Subtractor",
  description: "Subtracts B from A for a single bit: DIFF (XOR) and BORROW (NOT A AND B).",
  build: () => {
    const b = new CircuitBuilder();
    const inA = b.input("A", 40, 40, { id: "demo_hs_in_a" });
    const inB = b.input("B", 40, 240, { id: "demo_hs_in_b" });
    const hs = halfSubtractor(b, inA.out(0), inB.out(0), 280, 40, { xor: "demo_hs_xor", notA: "demo_hs_not_a", and: "demo_hs_and" });
    const diff = b.output("DIFF", 500, 40, { id: "demo_hs_diff" });
    const borrow = b.output("BORROW", 660, 240, { id: "demo_hs_borrow" });

    b.connect(hs.diff, diff.in(0));
    b.connect(hs.borrow, borrow.in(0));

    return b.build();
  },
};

const dLatchGated: DefaultCircuit = {
  id: "d-latch-gated",
  name: "Gated D Latch",
  description: "A D input gated by Enable, feeding a cross-coupled NAND SR latch. Transparent while E is high, holds state while E is low.",
  build: () => {
    const b = new CircuitBuilder();
    const inD = b.input("D", 40, 40, { id: "demo_dlatch_in_d" });
    const inE = b.input("E", 40, 260, { id: "demo_dlatch_in_e", value: SignalState.LOW });
    const notD = b.gate(GateType.NOT, 220, 160, { id: "demo_dlatch_not_d" });
    const nandS = b.gate(GateType.NAND, 400, 40, { id: "demo_dlatch_nand_s" });
    const nandR = b.gate(GateType.NAND, 400, 260, { id: "demo_dlatch_nand_r" });
    const nand1 = b.gate(GateType.NAND, 600, 40, { id: "demo_dlatch_nand1" });
    const nand2 = b.gate(GateType.NAND, 600, 260, { id: "demo_dlatch_nand2" });
    const q = b.output("Q", 800, 40, { id: "demo_dlatch_q" });
    const qn = b.output("QN", 800, 260, { id: "demo_dlatch_qn" });

    b.connect(inD.out(0), nandS.in(0));
    b.connect(inE.out(0), nandS.in(1));
    b.connect(inD.out(0), notD.in(0));
    b.connect(notD.out(0), nandR.in(0));
    b.connect(inE.out(0), nandR.in(1));
    b.connect(nandS.out(0), nand1.in(0));
    b.connect(nandR.out(0), nand2.in(1));
    b.connect(nand1.out(0), nand2.in(0));
    b.connect(nand2.out(0), nand1.in(1));
    b.connect(nand1.out(0), q.in(0));
    b.connect(nand2.out(0), qn.in(0));

    return b.build();
  },
};

const comparator1Bit: DefaultCircuit = {
  id: "comparator-1bit",
  name: "1-Bit Magnitude Comparator",
  description: "Compares two bits and drives exactly one of EQ, GT, LT high.",
  build: () => {
    const b = new CircuitBuilder();
    const inA = b.input("A", 40, 40, { id: "demo_cmp_in_a" });
    const inB = b.input("B", 40, 320, { id: "demo_cmp_in_b" });
    const xor = b.gate(GateType.XOR, 260, 40, { id: "demo_cmp_xor" });
    const notXor = b.gate(GateType.NOT, 440, 40, { id: "demo_cmp_not_xor" });
    const notA = b.gate(GateType.NOT, 260, 180, { id: "demo_cmp_not_a" });
    const notB = b.gate(GateType.NOT, 260, 320, { id: "demo_cmp_not_b" });
    const gtAnd = b.gate(GateType.AND, 440, 180, { id: "demo_cmp_gt_and" });
    const ltAnd = b.gate(GateType.AND, 440, 320, { id: "demo_cmp_lt_and" });
    const eq = b.output("EQ", 620, 40, { id: "demo_cmp_eq" });
    const gt = b.output("GT", 620, 180, { id: "demo_cmp_gt" });
    const lt = b.output("LT", 620, 320, { id: "demo_cmp_lt" });

    b.connect(inA.out(0), xor.in(0));
    b.connect(inB.out(0), xor.in(1));
    b.connect(xor.out(0), notXor.in(0));
    b.connect(notXor.out(0), eq.in(0));
    b.connect(inB.out(0), notB.in(0));
    b.connect(inA.out(0), gtAnd.in(0));
    b.connect(notB.out(0), gtAnd.in(1));
    b.connect(gtAnd.out(0), gt.in(0));
    b.connect(inA.out(0), notA.in(0));
    b.connect(notA.out(0), ltAnd.in(0));
    b.connect(inB.out(0), ltAnd.in(1));
    b.connect(ltAnd.out(0), lt.in(0));

    return b.build();
  },
};

const majorityVoter3: DefaultCircuit = {
  id: "majority-voter-3",
  name: "3-Input Majority Voter",
  description: "OUT = AB + BC + AC — high whenever at least two of the three inputs are high.",
  build: () => {
    const b = new CircuitBuilder();
    const inA = b.input("A", 40, 40, { id: "demo_maj_in_a" });
    const inB = b.input("B", 40, 200, { id: "demo_maj_in_b" });
    const inC = b.input("C", 40, 360, { id: "demo_maj_in_c" });
    const m1 = b.gate(GateType.AND, 240, 100, { id: "demo_maj_m1" });
    const m2 = b.gate(GateType.AND, 240, 280, { id: "demo_maj_m2" });
    const m3 = b.gate(GateType.AND, 240, 440, { id: "demo_maj_m3" });
    const outNode = b.output("OUT", 1080, 200, { id: "demo_maj_out" });

    b.connect(inA.out(0), m1.in(0));
    b.connect(inB.out(0), m1.in(1));
    b.connect(inB.out(0), m2.in(0));
    b.connect(inC.out(0), m2.in(1));
    b.connect(inA.out(0), m3.in(0));
    b.connect(inC.out(0), m3.in(1));

    const orAB = orGate(b, m1.out(0), m2.out(0), 420, 60, { not1: "demo_maj_not_m1", not2: "demo_maj_not_m2", nand: "demo_maj_or_ab" });
    const orFinal = orGate(b, orAB, m3.out(0), 740, 100, { not1: "demo_maj_not_or_ab", not2: "demo_maj_not_m3", nand: "demo_maj_or_final" });

    b.connect(orFinal, outNode.in(0));

    return b.build();
  },
};

const jkLatch: DefaultCircuit = {
  id: "jk-latch-nand",
  name: "JK Latch (Gated, NAND)",
  description: "Level-sensitive JK latch built from cross-coupled NAND gates. Note the classic race-around: if J=K=E=1 for the whole gated interval, Q can oscillate.",
  build: () => {
    const b = new CircuitBuilder();
    const inJ = b.input("J", 40, 40, { id: "demo_jk_in_j", value: SignalState.LOW });
    const inK = b.input("K", 40, 360, { id: "demo_jk_in_k", value: SignalState.LOW });
    const inE = b.input("E", 40, 200, { id: "demo_jk_in_e", value: SignalState.HIGH });
    const je = b.gate(GateType.AND, 240, 80, { id: "demo_jk_je" });
    const ke = b.gate(GateType.AND, 240, 320, { id: "demo_jk_ke" });

    const s = b.gate(GateType.NAND, 440, 80, { id: "demo_jk_s" });
    const r = b.gate(GateType.NAND, 440, 320, { id: "demo_jk_r" });

    const nandQ = b.gate(GateType.NAND, 640, 80, { id: "demo_jk_nand_q" });
    const nandQn = b.gate(GateType.NAND, 640, 320, { id: "demo_jk_nand_qn" });

    const q = b.output("Q", 840, 80, { id: "demo_jk_q" });
    const qn = b.output("QN", 840, 320, { id: "demo_jk_qn" });

    b.connect(inJ.out(0), je.in(0));
    b.connect(inE.out(0), je.in(1));

    b.connect(inK.out(0), ke.in(0));
    b.connect(inE.out(0), ke.in(1));

    b.connect(je.out(0), s.in(0));
    b.connect(nandQn.out(0), s.in(1));

    b.connect(ke.out(0), r.in(0));
    b.connect(nandQ.out(0), r.in(1));

    b.connect(s.out(0), nandQ.in(0));
    b.connect(nandQn.out(0), nandQ.in(1));

    b.connect(r.out(0), nandQn.in(0));
    b.connect(nandQ.out(0), nandQn.in(1));

    b.connect(nandQ.out(0), q.in(0));
    b.connect(nandQn.out(0), qn.in(0));

    return b.build();
  },
};

const fullAdderCircuit: DefaultCircuit = {
  id: "full-adder",
  name: "Full Adder",
  description: "Adds two bits plus a carry-in: two half adders combined with an OR to produce SUM and CARRY-OUT.",
  build: () => {
    const b = new CircuitBuilder();
    const inA = b.input("A", 40, 40, { id: "demo_fa_in_a" });
    const inB = b.input("B", 40, 200, { id: "demo_fa_in_b" });
    const inCin = b.input("CIN", 40, 360, { id: "demo_fa_in_cin" });
    const fa = fullAdder(b, inA.out(0), inB.out(0), inCin.out(0), 240, 100, {
      xor1: "demo_fa_xor1", and1: "demo_fa_and1",
      xor2: "demo_fa_xor2", and2: "demo_fa_and2",
      notP1: "demo_fa_not_p1", notP2: "demo_fa_not_p2", nandCarry: "demo_fa_nand_carry"
    });
    const sum = b.output("SUM", 640, 40, { id: "demo_fa_sum" });
    const cout = b.output("COUT", 960, 360, { id: "demo_fa_cout" });

    b.connect(fa.sum, sum.in(0));
    b.connect(fa.cout, cout.in(0));

    return b.build();
  },
};

const fullSubtractorCircuit: DefaultCircuit = {
  id: "full-subtractor",
  name: "Full Subtractor",
  description: "Subtracts B and a borrow-in from A: two half subtractors combined with an OR to produce DIFF and BORROW-OUT.",
  build: () => {
    const b = new CircuitBuilder();
    const inA = b.input("A", 40, 40, { id: "demo_fs_in_a" });
    const inB = b.input("B", 40, 200, { id: "demo_fs_in_b" });
    const inBin = b.input("BIN", 40, 360, { id: "demo_fs_in_bin" });
    const fs = fullSubtractor(b, inA.out(0), inB.out(0), inBin.out(0), 240, 100, {
      xor1: "demo_fs_xor1", notA: "demo_fs_not_a", and1: "demo_fs_and1",
      xor2: "demo_fs_xor2", notD1: "demo_fs_not_d1", and2: "demo_fs_and2",
      notB1: "demo_fs_not_b1", notB2: "demo_fs_not_b2", nandBout: "demo_fs_nand_bout"
    });
    const diff = b.output("DIFF", 640, 40, { id: "demo_fs_diff" });
    const bout = b.output("BOUT", 980, 440, { id: "demo_fs_bout" });

    b.connect(fs.diff, diff.in(0));
    b.connect(fs.bout, bout.in(0));

    return b.build();
  },
};

const mux2to1: DefaultCircuit = {
  id: "mux-2to1",
  name: "2-to-1 Multiplexer",
  description: "OUT = (~S & A) | (S & B) — select propagates whichever input the select line points at.",
  build: () => {
    const b = new CircuitBuilder();
    const inA = b.input("A", 40, 40, { id: "demo_mux2_in_a" });
    const inB = b.input("B", 40, 280, { id: "demo_mux2_in_b" });
    const inS = b.input("S", 40, 160, { id: "demo_mux2_in_s" });
    const notS = b.gate(GateType.NOT, 220, 160, { id: "demo_mux2_not_s" });
    const and1 = b.gate(GateType.AND, 400, 60, { id: "demo_mux2_and1" });
    const and2 = b.gate(GateType.AND, 400, 280, { id: "demo_mux2_and2" });
    const outNode = b.output("OUT", 940, 170, { id: "demo_mux2_out" });

    b.connect(inS.out(0), notS.in(0));
    b.connect(notS.out(0), and1.in(0));
    b.connect(inA.out(0), and1.in(1));
    b.connect(inS.out(0), and2.in(0));
    b.connect(inB.out(0), and2.in(1));

    const nandOut = orGate(b, and1.out(0), and2.out(0), 580, 60, { not1: "demo_mux2_not_and1", not2: "demo_mux2_not_and2", nand: "demo_mux2_nand_out" });
    b.connect(nandOut, outNode.in(0));

    return b.build();
  },
};

const decoder2to4: DefaultCircuit = {
  id: "decoder-2to4",
  name: "2-to-4 Decoder",
  description: "One-hot decodes a 2-bit select (S1 S0) into Y0..Y3, gated by Enable.",
  build: () => {
    const b = new CircuitBuilder();
    const inS1 = b.input("S1", 40, 40, { id: "demo_dec_in_s1" });
    const inS0 = b.input("S0", 40, 160, { id: "demo_dec_in_s0" });
    const inE = b.input("E", 40, 280, { id: "demo_dec_in_e", value: SignalState.HIGH });
    const notS1 = b.gate(GateType.NOT, 220, 40, { id: "demo_dec_not_s1" });
    const notS0 = b.gate(GateType.NOT, 220, 160, { id: "demo_dec_not_s0" });
    const andEnLow = b.gate(GateType.AND, 400, 60, { id: "demo_dec_and_en_low" });
    const andEnHigh = b.gate(GateType.AND, 400, 260, { id: "demo_dec_and_en_high" });
    const y0Gate = b.gate(GateType.AND, 600, 0, { id: "demo_dec_y0_gate" });
    const y1Gate = b.gate(GateType.AND, 600, 140, { id: "demo_dec_y1_gate" });
    const y2Gate = b.gate(GateType.AND, 600, 280, { id: "demo_dec_y2_gate" });
    const y3Gate = b.gate(GateType.AND, 600, 420, { id: "demo_dec_y3_gate" });
    const y0 = b.output("Y0", 780, 0, { id: "demo_dec_y0" });
    const y1 = b.output("Y1", 780, 140, { id: "demo_dec_y1" });
    const y2 = b.output("Y2", 780, 280, { id: "demo_dec_y2" });
    const y3 = b.output("Y3", 780, 420, { id: "demo_dec_y3" });

    b.connect(inS1.out(0), notS1.in(0));
    b.connect(inS0.out(0), notS0.in(0));
    b.connect(inE.out(0), andEnLow.in(0));
    b.connect(notS1.out(0), andEnLow.in(1));
    b.connect(inE.out(0), andEnHigh.in(0));
    b.connect(inS1.out(0), andEnHigh.in(1));
    b.connect(andEnLow.out(0), y0Gate.in(0));
    b.connect(notS0.out(0), y0Gate.in(1));
    b.connect(y0Gate.out(0), y0.in(0));
    b.connect(andEnLow.out(0), y1Gate.in(0));
    b.connect(inS0.out(0), y1Gate.in(1));
    b.connect(y1Gate.out(0), y1.in(0));
    b.connect(andEnHigh.out(0), y2Gate.in(0));
    b.connect(notS0.out(0), y2Gate.in(1));
    b.connect(y2Gate.out(0), y2.in(0));
    b.connect(andEnHigh.out(0), y3Gate.in(0));
    b.connect(inS0.out(0), y3Gate.in(1));
    b.connect(y3Gate.out(0), y3.in(0));

    return b.build();
  },
};

const mux4to1: DefaultCircuit = {
  id: "mux-4to1",
  name: "4-to-1 Multiplexer",
  description: "Three 2-to-1 multiplexers arranged as a tree: S0 picks within each pair, S1 picks between the pairs.",
  build: () => {
    const b = new CircuitBuilder();
    const inD0 = b.input("D0", 40, 0, { id: "demo_mux4_in_d0" });
    const inD1 = b.input("D1", 40, 140, { id: "demo_mux4_in_d1" });
    const inD2 = b.input("D2", 40, 400, { id: "demo_mux4_in_d2" });
    const inD3 = b.input("D3", 40, 540, { id: "demo_mux4_in_d3" });
    const inS0 = b.input("S0", 40, 270, { id: "demo_mux4_in_s0" });
    const inS1 = b.input("S1", 40, 680, { id: "demo_mux4_in_s1" });
    const notS0 = b.gate(GateType.NOT, 220, 270, { id: "demo_mux4_not_s0" });
    const andL0 = b.gate(GateType.AND, 400, 0, { id: "demo_mux4_and_l0" });
    const andL1 = b.gate(GateType.AND, 400, 140, { id: "demo_mux4_and_l1" });
    const andH0 = b.gate(GateType.AND, 400, 400, { id: "demo_mux4_and_h0" });
    const andH1 = b.gate(GateType.AND, 400, 540, { id: "demo_mux4_and_h1" });
    const notS1 = b.gate(GateType.NOT, 900, 680, { id: "demo_mux4_not_s1" });
    const andF0 = b.gate(GateType.AND, 1080, 70, { id: "demo_mux4_and_f0" });
    const andF1 = b.gate(GateType.AND, 1080, 470, { id: "demo_mux4_and_f1" });
    const outNode = b.output("OUT", 1580, 270, { id: "demo_mux4_out" });

    b.connect(inS0.out(0), notS0.in(0));
    b.connect(notS0.out(0), andL0.in(0));
    b.connect(inD0.out(0), andL0.in(1));
    b.connect(inS0.out(0), andL1.in(0));
    b.connect(inD1.out(0), andL1.in(1));
    b.connect(notS0.out(0), andH0.in(0));
    b.connect(inD2.out(0), andH0.in(1));
    b.connect(inS0.out(0), andH1.in(0));
    b.connect(inD3.out(0), andH1.in(1));

    const nandLow = orGate(b, andL0.out(0), andL1.out(0), 560, 0, { not1: "demo_mux4_not_and_l0", not2: "demo_mux4_not_and_l1", nand: "demo_mux4_nand_low" });
    const nandHigh = orGate(b, andH0.out(0), andH1.out(0), 560, 400, { not1: "demo_mux4_not_and_h0", not2: "demo_mux4_not_and_h1", nand: "demo_mux4_nand_high" });

    b.connect(inS1.out(0), notS1.in(0));
    b.connect(notS1.out(0), andF0.in(0));
    b.connect(nandLow, andF0.in(1));
    b.connect(inS1.out(0), andF1.in(0));
    b.connect(nandHigh, andF1.in(1));

    const nandFinal = orGate(b, andF0.out(0), andF1.out(0), 1240, 70, { not1: "demo_mux4_not_and_f0", not2: "demo_mux4_not_and_f1", nand: "demo_mux4_nand_final" });
    b.connect(nandFinal, outNode.in(0));

    return b.build();
  },
};

const rippleCarryAdder4: DefaultCircuit = {
  id: "ripple-carry-adder-4bit",
  name: "4-Bit Ripple Carry Adder",
  description: "Four full adders chained carry-to-carry: A[3:0] + B[3:0] -> SUM[3:0] and a final carry-out.",
  build: () => {
    const b = new CircuitBuilder();
    const cin = b.input("CIN", 40, -20, { id: "demo_rca_in_cin", value: SignalState.LOW });
    let carryInPort = cin.out(0);

    for (let i = 0; i < 4; i++) {
      const y0 = i * 300;
      const idOf = (part: string) => `demo_rca_b${i}_${part}`;
      const inA = b.input(`A${i}`, 40, y0 + 40, { id: idOf("in_a") });
      const inB = b.input(`B${i}`, 40, y0 + 160, { id: idOf("in_b") });
      const sum = b.output(`S${i}`, 640, y0 + 30, { id: idOf("sum") });

      const fa = fullAdder(b, inA.out(0), inB.out(0), carryInPort, 240, y0 + 90, {
        xor1: idOf("xor1"), and1: idOf("and1"),
        xor2: idOf("xor2"), and2: idOf("and2"),
        notP1: idOf("not_p1"), notP2: idOf("not_p2"), nandCarry: idOf("nand_carry")
      });

      b.connect(fa.sum, sum.in(0));
      carryInPort = fa.cout;
    }

    const cout = b.output("COUT", 980, (4 - 1) * 300 + 280, { id: "demo_rca_out_cout" });
    b.connect(carryInPort, cout.in(0));

    return b.build();
  },
};

export const DEFAULT_CIRCUITS: DefaultCircuit[] = [
  andFromNand, halfAdderCircuit, srLatch, orFromNand, norGateCircuit, xnorGate, buffer,
  halfSubtractorCircuit, dLatchGated, comparator1Bit, majorityVoter3, jkLatch,
  fullAdderCircuit, fullSubtractorCircuit, mux2to1, decoder2to4, mux4to1, rippleCarryAdder4,
];

export function getDefaultCircuit(id: string): DefaultCircuit | undefined {
  return DEFAULT_CIRCUITS.find((c) => c.id === id);
}