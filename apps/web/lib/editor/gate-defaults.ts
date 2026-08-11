import {GateType} from "@nandscape/engine";
import type {GateNodeData} from "@/types/editor";

export const DEFAULT_SELECT_BITS = 2;
export const MIN_SELECT_BITS = 1;
export const MAX_SELECT_BITS = 4; // 16-way mux/demux/decoder, keeps node height sane

export const DEFAULT_COUNTER_BITS = 4;
export const MIN_COUNTER_BITS = 2;
export const MAX_COUNTER_BITS = 8;

export function clampSelectBits(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_SELECT_BITS;
  return Math.min(MAX_SELECT_BITS, Math.max(MIN_SELECT_BITS, Math.round(n)));
}

export function clampCounterBits(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_COUNTER_BITS;
  return Math.min(MAX_COUNTER_BITS, Math.max(MIN_COUNTER_BITS, Math.round(n)));
}

/** MULTIPLEXER/DEMULTIPLEXER/DECODER/PRIORITY_ENCODER: pin count is driven
 *  entirely by a configured `selectBits`, the same way AND/OR's pin count
 *  is driven by `inputCount` (see isVariableArityGate below). */
export function hasSelectBits(gateType: GateType): boolean {
  switch (gateType) {
    case GateType.MULTIPLEXER:
    case GateType.DEMULTIPLEXER:
    case GateType.DECODER:
    case GateType.PRIORITY_ENCODER:
      return true;
    default:
      return false;
  }
}

export function hasCounterBits(gateType: GateType): boolean {
  return gateType === GateType.COUNTER;
}

export function defaultInputCountForGateType(gateType: GateType): number {
  switch (gateType) {
    case GateType.NOT:
    case GateType.BUFFER:
      return 1;
    case GateType.FLIP_FLOP:
      return 4; // data, clock, reset, set
    case GateType.T_FLIP_FLOP:
      return 4; // t, clock, reset, set
    case GateType.JK_FLIP_FLOP:
      return 5; // j, k, clock, reset, set
    case GateType.TRISTATE_BUFFER:
    case GateType.D_LATCH:
    case GateType.SR_LATCH:
      return 2;
    case GateType.COUNTER:
      return 2; // clock, reset
    case GateType.MULTIPLEXER:
      return DEFAULT_SELECT_BITS + (1 << DEFAULT_SELECT_BITS); // select lines + data lines
    case GateType.DEMULTIPLEXER:
      return 1 + DEFAULT_SELECT_BITS; // data + select lines
    case GateType.DECODER:
      return DEFAULT_SELECT_BITS; // address lines
    case GateType.PRIORITY_ENCODER:
      return 1 << DEFAULT_SELECT_BITS; // data lines
    case GateType.AND:
    case GateType.OR:
    case GateType.NAND:
    case GateType.NOR:
    case GateType.XOR:
    case GateType.XNOR:
    default:
      return 2;
  }
}

export function isVariableArityGate(gateType: GateType): boolean {
  switch (gateType) {
    case GateType.AND:
    case GateType.OR:
    case GateType.NAND:
    case GateType.NOR:
    case GateType.XOR:
    case GateType.XNOR:
      return true;
    default:
      return false;
  }
}

/** The real, config-aware input count for a placed gate node - unlike
 *  defaultInputCountForGateType (a brand-new node's starting point), this
 *  reads whatever the user actually configured (inputCount for variable-
 *  arity gates, selectBits for mux/demux/decoder/priority-encoder). Used
 *  everywhere a gate's live pin layout matters: gate-node.tsx's rendering,
 *  compile-circuit.ts's pin resolution, live-simulate.ts's preview arity. */
export function inputCountForGate(data: GateNodeData): number {
  const gateType = data.gateType;

  if (isVariableArityGate(gateType)) {
    return data.inputCount ?? defaultInputCountForGateType(gateType);
  }

  if (hasSelectBits(gateType)) {
    const n = clampSelectBits(data.selectBits ?? DEFAULT_SELECT_BITS);
    switch (gateType) {
      case GateType.MULTIPLEXER:
        return n + (1 << n);
      case GateType.DEMULTIPLEXER:
        return 1 + n;
      case GateType.DECODER:
        return n;
      case GateType.PRIORITY_ENCODER:
        return 1 << n;
      default:
        return n;
    }
  }

  return defaultInputCountForGateType(gateType);
}

/** The real, config-aware output count for a placed gate node. Every
 *  ordinary combinational gate and D_LATCH/FLIP_FLOP/SR_LATCH/JK/T are
 *  fixed-shape (1 or 2 outputs); the rest scale with selectBits/bitWidth. */
export function outputCountForGate(data: GateNodeData): number {
  const gateType = data.gateType;

  switch (gateType) {
    case GateType.D_LATCH:
    case GateType.FLIP_FLOP:
    case GateType.SR_LATCH:
    case GateType.JK_FLIP_FLOP:
    case GateType.T_FLIP_FLOP:
      return 2; // Q, Q̄
    case GateType.MULTIPLEXER:
      return 1;
    case GateType.DEMULTIPLEXER:
    case GateType.DECODER: {
      const n = clampSelectBits(data.selectBits ?? DEFAULT_SELECT_BITS);
      return 1 << n;
    }
    case GateType.PRIORITY_ENCODER: {
      const n = clampSelectBits(data.selectBits ?? DEFAULT_SELECT_BITS);
      return n + 1; // address bits + VALID
    }
    case GateType.COUNTER:
      return clampCounterBits(data.bitWidth ?? DEFAULT_COUNTER_BITS);
    default:
      return 1;
  }
}

/** Per-pin tooltip text, for the gate types where position alone doesn't
 *  make a pin's role obvious (unlike AND/OR, where every input is
 *  interchangeable and unlabeled). Returns undefined where no label is
 *  needed. Index order must exactly match the engine's pin-role layout
 *  (see circuit.ts's pin-role doc comment) and inputCountForGate/
 *  outputCountForGate above,  it's read positionally, not by name. */
export function inputPinLabel(data: GateNodeData, index: number): string | undefined {
  switch (data.gateType) {
    case GateType.D_LATCH:
      return ["D", "EN"][index];
    case GateType.FLIP_FLOP:
      return ["D", "CLK", "RST", "SET"][index];
    case GateType.SR_LATCH:
      return ["S", "R"][index];
    case GateType.JK_FLIP_FLOP:
      return ["J", "K", "CLK", "RST", "SET"][index];
    case GateType.T_FLIP_FLOP:
      return ["T", "CLK", "RST", "SET"][index];
    case GateType.COUNTER:
      return ["CLK", "RST"][index];
    case GateType.MULTIPLEXER: {
      const n = clampSelectBits(data.selectBits ?? DEFAULT_SELECT_BITS);
      return index < n ? `S${index}` : `D${index - n}`;
    }
    case GateType.DEMULTIPLEXER:
      return index === 0 ? "D" : `S${index - 1}`;
    case GateType.DECODER:
      return `A${index}`;
    case GateType.PRIORITY_ENCODER:
      return `D${index}`;
    default:
      return undefined;
  }
}

export function outputPinLabel(data: GateNodeData, index: number): string | undefined {
  switch (data.gateType) {
    case GateType.D_LATCH:
    case GateType.FLIP_FLOP:
    case GateType.SR_LATCH:
    case GateType.JK_FLIP_FLOP:
    case GateType.T_FLIP_FLOP:
      return ["Q", "Q̄"][index];
    case GateType.COUNTER:
      return `Q${index}`;
    case GateType.DEMULTIPLEXER:
    case GateType.DECODER:
      return `Y${index}`;
    case GateType.PRIORITY_ENCODER: {
      const n = clampSelectBits(data.selectBits ?? DEFAULT_SELECT_BITS);
      return index < n ? `A${index}` : "VALID";
    }
    default:
      return undefined;
  }
}
