import {
  DFF_PIN_CLOCK,
  DFF_PIN_DATA,
  DFF_PIN_Q,
  DFF_PIN_QN,
  DFF_PIN_RESET,
  DFF_PIN_SET,
  DLATCH_PIN_DATA,
  DLATCH_PIN_ENABLE,
  DLATCH_PIN_Q,
  DLATCH_PIN_QN,
  CircuitData,
  SINK_PIN_INPUT,
  SOURCE_PIN_OUTPUT,
  SRLATCH_PIN_Q,
  SRLATCH_PIN_QN,
  SRLATCH_PIN_R,
  SRLATCH_PIN_S,
  SrLatchKind,
  TRISTATE_PIN_DATA,
  TRISTATE_PIN_ENABLE,
  TRISTATE_PIN_OUTPUT,
} from '../data';
import { EdgeType, GateId, GateType, PinId, SignalState, SimTime } from '../data';

export interface SourceHandle {
  gate: GateId;
  output: PinId;
}

export interface SinkHandle {
  gate: GateId;
  input: PinId;
}

export interface NAryGateHandle {
  gate: GateId;
  inputs: PinId[];
  output: PinId;
}

export interface UnaryGateHandle {
  gate: GateId;
  input: PinId;
  output: PinId;
}

export interface TristateHandle {
  gate: GateId;
  data: PinId;
  enable: PinId;
  output: PinId;
}

export interface LatchHandle {
  gate: GateId;
  data: PinId;
  enable: PinId;
  q: PinId;
  qn: PinId;
}

export interface FlipFlopHandle {
  gate: GateId;
  data: PinId;
  clock: PinId;
  reset: PinId;
  set: PinId;
  q: PinId;
  qn: PinId;
}

export interface SrLatchHandle {
  gate: GateId;
  s: PinId;
  r: PinId;
  q: PinId;
  qn: PinId;
}

/** A circuit-level input terminal: something a testbench/caller drives externally. */
export function createInput(circuit: CircuitData, name?: string): SourceHandle {
  const gate = circuit.addGate({ type: GateType.INPUT_PIN, name });
  return { gate, output: circuit.pinOf(gate, SOURCE_PIN_OUTPUT) };
}

/** A circuit-level output terminal: a probe point, drives nothing itself. */
export function createOutput(circuit: CircuitData, name?: string): SinkHandle {
  const gate = circuit.addGate({ type: GateType.OUTPUT_PIN, name });
  return { gate, input: circuit.pinOf(gate, SINK_PIN_INPUT) };
}

/** A fixed-value source (tie-high / tie-low / tie-float / tie-unknown). */
export function createConstant(circuit: CircuitData, value: SignalState, name?: string): SourceHandle {
  const gate = circuit.addGate({ type: GateType.CONSTANT, paramA: value, name });
  return { gate, output: circuit.pinOf(gate, SOURCE_PIN_OUTPUT) };
}

/** A free-running clock, toggling every `halfPeriod` simulation-time-units. */
export function createClock(
  circuit: CircuitData,
  halfPeriod: SimTime,
  initialValue: SignalState = SignalState.LOW,
  name?: string,
): SourceHandle {
  const gate = circuit.addGate({
    type: GateType.CLOCK,
    paramA: halfPeriod,
    paramB: initialValue,
    name,
  });
  return { gate, output: circuit.pinOf(gate, SOURCE_PIN_OUTPUT) };
}

/** A variable-arity combinational gate: NAND, AND, OR, NOR, XOR, or XNOR. */
export function createNAryGate(
  circuit: CircuitData,
  type: GateType.NAND | GateType.AND | GateType.OR | GateType.NOR | GateType.XOR | GateType.XNOR,
  inputCount: number,
  delay?: SimTime,
  name?: string,
): NAryGateHandle {
  if (inputCount < 1) throw new Error('createNAryGate: inputCount must be >= 1');
  const gate = circuit.addGate({ type, pinCount: inputCount + 1, delay, name });
  const pins = circuit.getGatePins(gate);
  return { gate, inputs: pins.slice(0, -1), output: pins[pins.length - 1] };
}

export const createNand = (c: CircuitData, n = 2, d?: SimTime, name?: string) =>
  createNAryGate(c, GateType.NAND, n, d, name);
export const createAnd = (c: CircuitData, n = 2, d?: SimTime, name?: string) =>
  createNAryGate(c, GateType.AND, n, d, name);
export const createOr = (c: CircuitData, n = 2, d?: SimTime, name?: string) =>
  createNAryGate(c, GateType.OR, n, d, name);
export const createNor = (c: CircuitData, n = 2, d?: SimTime, name?: string) =>
  createNAryGate(c, GateType.NOR, n, d, name);
export const createXor = (c: CircuitData, n = 2, d?: SimTime, name?: string) =>
  createNAryGate(c, GateType.XOR, n, d, name);
export const createXnor = (c: CircuitData, n = 2, d?: SimTime, name?: string) =>
  createNAryGate(c, GateType.XNOR, n, d, name);

export function createNot(circuit: CircuitData, delay?: SimTime, name?: string): UnaryGateHandle {
  const gate = circuit.addGate({ type: GateType.NOT, delay, name });
  const [input, output] = circuit.getGatePins(gate);
  return { gate, input, output };
}

export function createBuffer(circuit: CircuitData, delay?: SimTime, name?: string): UnaryGateHandle {
  const gate = circuit.addGate({ type: GateType.BUFFER, delay, name });
  const [input, output] = circuit.getGatePins(gate);
  return { gate, input, output };
}

export function createTristateBuffer(circuit: CircuitData, delay?: SimTime, name?: string): TristateHandle {
  const gate = circuit.addGate({ type: GateType.TRISTATE_BUFFER, delay, name });
  return {
    gate,
    data: circuit.pinOf(gate, TRISTATE_PIN_DATA),
    enable: circuit.pinOf(gate, TRISTATE_PIN_ENABLE),
    output: circuit.pinOf(gate, TRISTATE_PIN_OUTPUT),
  };
}

export function createDLatch(circuit: CircuitData, delay?: SimTime, name?: string): LatchHandle {
  const gate = circuit.addGate({ type: GateType.D_LATCH, delay, name });
  return {
    gate,
    data: circuit.pinOf(gate, DLATCH_PIN_DATA),
    enable: circuit.pinOf(gate, DLATCH_PIN_ENABLE),
    q: circuit.pinOf(gate, DLATCH_PIN_Q),
    qn: circuit.pinOf(gate, DLATCH_PIN_QN),
  };
}

export function createDFlipFlop(
  circuit: CircuitData,
  edge: EdgeType = EdgeType.RISING,
  delay?: SimTime,
  name?: string,
): FlipFlopHandle {
  const gate = circuit.addGate({ type: GateType.FLIP_FLOP, paramA: edge, delay, name });
  return {
    gate,
    data: circuit.pinOf(gate, DFF_PIN_DATA),
    clock: circuit.pinOf(gate, DFF_PIN_CLOCK),
    reset: circuit.pinOf(gate, DFF_PIN_RESET),
    set: circuit.pinOf(gate, DFF_PIN_SET),
    q: circuit.pinOf(gate, DFF_PIN_Q),
    qn: circuit.pinOf(gate, DFF_PIN_QN),
  };
}

export function createSrLatch(
  circuit: CircuitData,
  kind: SrLatchKind = SrLatchKind.NOR_BASED,
  delay?: SimTime,
  name?: string,
): SrLatchHandle {
  const gate = circuit.addGate({ type: GateType.SR_LATCH, paramA: kind, delay, name });
  return {
    gate,
    s: circuit.pinOf(gate, SRLATCH_PIN_S),
    r: circuit.pinOf(gate, SRLATCH_PIN_R),
    q: circuit.pinOf(gate, SRLATCH_PIN_Q),
    qn: circuit.pinOf(gate, SRLATCH_PIN_QN),
  };
}
