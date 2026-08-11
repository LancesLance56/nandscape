// All ids are plain non-negative integers used as indices into SoA arrays.
// Branding prevents accidental cross-use (e.g. passing a PinId where a
// NetId is expected) without introducing any wrapper objects at runtime.

declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

export type GateId = Brand<number, 'GateId'>;
export type PinId = Brand<number, 'PinId'>;
export type NetId = Brand<number, 'NetId'>;
export type EventId = Brand<number, 'EventId'>;

/** Sentinel used in place of a valid id (e.g. "this pin has no connected net yet"). */
export const INVALID_ID = -1;

export const asGateId = (n: number): GateId => n as GateId;
export const asPinId = (n: number): PinId => n as PinId;
export const asNetId = (n: number): NetId => n as NetId;
export const asEventId = (n: number): EventId => n as EventId;

export enum SignalState {
  LOW = 0,
  HIGH = 1,
  FLOAT = 2,
  UNKNOWN = 3,
}

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
  TRISTATE_BUFFER = 8,

  D_LATCH = 9,
  FLIP_FLOP = 10,
  SR_LATCH = 11,

  INPUT_PIN = 12,
  OUTPUT_PIN = 13,
  CONSTANT = 14,
  CLOCK = 15,

  // Combinational MSI (medium-scale integration): still stateless, but
  // variable-shape (pin count depends on a configured `paramA`, see
  // circuit.ts's pin-role constants and inferPinDirections).
  MULTIPLEXER = 16,
  DEMULTIPLEXER = 17,
  DECODER = 18,
  PRIORITY_ENCODER = 19,

  // Sequential MSI/additions: clocked, stateful, same "read previous pin
  // drive state" technique D_LATCH/FLIP_FLOP/SR_LATCH already use.
  COUNTER = 20,
  JK_FLIP_FLOP = 21,
  T_FLIP_FLOP = 22,
}

export const GATE_TYPE_COUNT = 23;

export function gateTypeToString(t: GateType): string {
  return GateType[t] ?? `UNKNOWN_GATE_TYPE(${t})`;
}

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
    case GateType.MULTIPLEXER:
    case GateType.DEMULTIPLEXER:
    case GateType.DECODER:
    case GateType.PRIORITY_ENCODER:
      return true;
    default:
      return false;
  }
}

export function isSequential(t: GateType): boolean {
  switch (t) {
    case GateType.D_LATCH:
    case GateType.FLIP_FLOP:
    case GateType.SR_LATCH:
    case GateType.COUNTER:
    case GateType.JK_FLIP_FLOP:
    case GateType.T_FLIP_FLOP:
      return true;
    default:
      return false;
  }
}

export enum PinDirection {
  INPUT = 0, // reads a net's resolved state; never drives
  OUTPUT = 1, // drives a net; never reads
  INOUT = 2, // bidirectional / tri-state capable (may drive or release to float)
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
