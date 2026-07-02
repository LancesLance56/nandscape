// All ids are plain non-negative integers used as indices into SoA arrays.
// Branding prevents accidental cross-use (e.g. passing a PinId where a
// NetId is expected) without introducing any wrapper objects at runtime.

declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

export type GateId = Brand<number, 'GateId'>;
export type PinId = Brand<number, 'PinId'>;
export type NetId = Brand<number, 'NetId'>;
export type CircuitId = Brand<number, 'CircuitId'>; // for hierarchical subcircuits
export type EventId = Brand<number, 'EventId'>;

/** Sentinel used in place of a valid id (e.g. "this pin has no connected net yet"). */
export const INVALID_ID = -1;

export const asGateId = (n: number): GateId => n as GateId;
export const asPinId = (n: number): PinId => n as PinId;
export const asNetId = (n: number): NetId => n as NetId;
export const asCircuitId = (n: number): CircuitId => n as CircuitId;
export const asEventId = (n: number): EventId => n as EventId;

export enum SignalState {
  LOW = 0,
  HIGH = 1,
  FLOAT = 2,
  UNKNOWN = 3,
}

/** Number of distinct SignalState values — used to size lookup tables. */
export const SIGNAL_STATE_COUNT = 4;

export function signalStateToString(s: SignalState): string {
  switch (s) {
    case SignalState.LOW:
      return 'LOW';
    case SignalState.HIGH:
      return 'HIGH';
    case SignalState.FLOAT:
      return 'FLOAT';
    case SignalState.UNKNOWN:
      return 'UNKNOWN';
  }
}

/** True only for actively-driven, well-defined logic levels (LOW/HIGH). */
export function isDefinedLogicLevel(s: SignalState): boolean {
  return s === SignalState.LOW || s === SignalState.HIGH;
}

export enum GateType {
  NAND = 0,
  AND = 1,
  OR = 2,
  NOR = 3,
  XOR = 4,
  XNOR = 5,
  NOT = 6,
  BUFFER = 7,
  TRISTATE_BUFFER = 8, // pins: [data, enable] -> [out]

  D_LATCH = 9, // pins: [data, enable] -> [q, qn]
  D_FLIP_FLOP = 10, // pins: [data, clock, reset, set] -> [q, qn]
  SR_LATCH = 11, // pins: [s, r] -> [q, qn] (NOR- or NAND-based, see params)

  INPUT_PIN = 12, // circuit-level input terminal; externally driven
  OUTPUT_PIN = 13, // circuit-level output terminal; probe only, drives nothing
  CONSTANT = 14, // fixed-value source (HIGH / LOW / FLOAT / UNKNOWN)
  CLOCK = 15, // periodic oscillator source

  SUBCIRCUIT = 16, // instance of a nested CircuitData graph
}

export const GATE_TYPE_COUNT = 17;

export function gateTypeToString(t: GateType): string {
  return GateType[t] ?? `UNKNOWN_GATE_TYPE(${t})`;
}

/** Gate types that participate in event-driven combinational evaluation. */
export function isCombinational(t: GateType): boolean {
  switch (t) {
    case GateType.NAND:
    case GateType.AND:
    case GateType.OR:
    case GateType.NOR:
    case GateType.XOR:
    case GateType.XNOR:
    case GateType.NOT:
    case GateType.BUFFER:
    case GateType.TRISTATE_BUFFER:
      return true;
    default:
      return false;
  }
}

export function isSequential(t: GateType): boolean {
  switch (t) {
    case GateType.D_LATCH:
    case GateType.D_FLIP_FLOP:
    case GateType.SR_LATCH:
      return true;
    default:
      return false;
  }
}

export enum PinDirection {
  INPUT = 0, // reads a net's resolved state; never drives
  OUTPUT = 1, // drives a net; never reads
  INOUT = 2, // bidirectional / tri-state capable (may drive or float)
}

export function pinDirectionToString(d: PinDirection): string {
  return PinDirection[d] ?? `UNKNOWN_DIRECTION(${d})`;
}

export enum EdgeType {
  RISING = 0, // LOW  -> HIGH
  FALLING = 1, // HIGH -> LOW
  ANY = 2, // any change in defined level
  NONE = 3, // level-sensitive, not edge-sensitive (e.g. latches)
}

export function edgeTypeToString(e: EdgeType): string {
  return EdgeType[e] ?? `UNKNOWN_EDGE(${e})`;
}

export function classifyEdge(prev: SignalState, next: SignalState): EdgeType | null {
  if (prev === next) return null;
  if (prev === SignalState.LOW && next === SignalState.HIGH) return EdgeType.RISING;
  if (prev === SignalState.HIGH && next === SignalState.LOW) return EdgeType.FALLING;
  return null; // transitions involving FLOAT/UNKNOWN are not clean edges
}

export type SimTime = number;

export const TIME_ZERO: SimTime = 0;

export enum EventKind {
  PIN_DRIVE = 0, // a pin begins driving `value` onto its net
}

export enum NetResolutionKind {
  UNDRIVEN = 0, // zero active drivers -> FLOAT
  SINGLE_DRIVER = 1, // exactly one active driver -> that driver's value
  AGREEMENT = 2, // multiple active drivers, all agree -> that value
  CONTENTION = 3, // multiple active drivers disagree -> UNKNOWN
}
