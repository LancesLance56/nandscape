import { GateType } from "@nandscape/engine";
import { CircuitBuilder, Port } from "./circuit-builder";

export interface OrGateIds { not1?: string; not2?: string; nand?: string; }
export function orGate(b: CircuitBuilder, in1: Port, in2: Port, x: number, y: number, ids?: OrGateIds): Port {
  const not1 = b.gate(GateType.NOT, x, y, { id: ids?.not1 });
  const not2 = b.gate(GateType.NOT, x, y + 160, { id: ids?.not2 });
  const nand = b.gate(GateType.NAND, x + 180, y + 80, { id: ids?.nand });
  b.connect(in1, not1.in(0));
  b.connect(in2, not2.in(0));
  b.connect(not1.out(0), nand.in(0));
  b.connect(not2.out(0), nand.in(1));
  return nand.out(0);
}

export interface NorGateIds { not1?: string; not2?: string; and?: string; }
export function norGate(b: CircuitBuilder, in1: Port, in2: Port, x: number, y: number, ids?: NorGateIds): Port {
  const not1 = b.gate(GateType.NOT, x, y, { id: ids?.not1 });
  const not2 = b.gate(GateType.NOT, x, y + 160, { id: ids?.not2 });
  const and = b.gate(GateType.AND, x + 180, y + 80, { id: ids?.and });
  b.connect(in1, not1.in(0));
  b.connect(in2, not2.in(0));
  b.connect(not1.out(0), and.in(0));
  b.connect(not2.out(0), and.in(1));
  return and.out(0);
}

export interface HalfAdderIds { xor?: string; and?: string; }
export function halfAdder(b: CircuitBuilder, in1: Port, in2: Port, x: number, y: number, ids?: HalfAdderIds): { sum: Port; carry: Port } {
  const xor = b.gate(GateType.XOR, x, y, { id: ids?.xor });
  const and = b.gate(GateType.AND, x, y + 160, { id: ids?.and });
  b.connect(in1, xor.in(0));
  b.connect(in2, xor.in(1));
  b.connect(in1, and.in(0));
  b.connect(in2, and.in(1));
  return { sum: xor.out(0), carry: and.out(0) };
}

export interface FullAdderIds { xor1?: string; and1?: string; xor2?: string; and2?: string; notP1?: string; notP2?: string; nandCarry?: string; }
export function fullAdder(b: CircuitBuilder, in1: Port, in2: Port, cin: Port, x: number, y: number, ids?: FullAdderIds): { sum: Port; cout: Port } {
  const ha1 = halfAdder(b, in1, in2, x, y, { xor: ids?.xor1, and: ids?.and1 });
  const ha2 = halfAdder(b, ha1.sum, cin, x + 200, y - 60, { xor: ids?.xor2, and: ids?.and2 });
  const cout = orGate(b, ha1.carry, ha2.carry, x + 380, y + 200, { not1: ids?.notP1, not2: ids?.notP2, nand: ids?.nandCarry });
  return { sum: ha2.sum, cout };
}

export interface HalfSubtractorIds { xor?: string; notA?: string; and?: string; }
export function halfSubtractor(b: CircuitBuilder, a: Port, bIn: Port, x: number, y: number, ids?: HalfSubtractorIds): { diff: Port; borrow: Port } {
  const xor = b.gate(GateType.XOR, x, y, { id: ids?.xor });
  const notA = b.gate(GateType.NOT, x, y + 140, { id: ids?.notA });
  const and = b.gate(GateType.AND, x + 180, y + 200, { id: ids?.and });
  b.connect(a, xor.in(0));
  b.connect(bIn, xor.in(1));
  b.connect(a, notA.in(0));
  b.connect(notA.out(0), and.in(0));
  b.connect(bIn, and.in(1));
  return { diff: xor.out(0), borrow: and.out(0) };
}

export interface FullSubtractorIds { xor1?: string; notA?: string; and1?: string; xor2?: string; notD1?: string; and2?: string; notB1?: string; notB2?: string; nandBout?: string; }
export function fullSubtractor(b: CircuitBuilder, a: Port, bIn: Port, binIn: Port, x: number, y: number, ids?: FullSubtractorIds): { diff: Port; bout: Port } {
  const hs1 = halfSubtractor(b, a, bIn, x, y, { xor: ids?.xor1, notA: ids?.notA, and: ids?.and1 });
  const hs2 = halfSubtractor(b, hs1.diff, binIn, x + 200, y - 60, { xor: ids?.xor2, notA: ids?.notD1, and: ids?.and2 });
  const bout = orGate(b, hs1.borrow, hs2.borrow, x + 380, y + 280, { not1: ids?.notB1, not2: ids?.notB2, nand: ids?.nandBout });
  return { diff: hs2.diff, bout };
}