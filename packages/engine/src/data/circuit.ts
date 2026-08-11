import { DynamicTypedArray } from './dynamic-array';
import {
  DEFAULT_GATE_DELAY,
  INITIAL_GATE_CAPACITY,
  INITIAL_PIN_CAPACITY,
} from './constants';
import {
  asGateId,
  asNetId,
  asPinId,
  GateId,
  GateType,
  INVALID_ID,
  NetId,
  PinDirection,
  PinId,
  SignalState,
  SimTime,
} from './types';

// -----------------------------------------------------------------------------
// Fixed pin-role conventions
// -----------------------------------------------------------------------------
// For variable-arity gates (AND/OR/NAND/NOR/XOR/XNOR): inputs occupy roles
// 0..(n-2), and the single output occupies role (n-1).
// For fixed-shape gates, roles are named below for clarity at call sites.

export const NOT_PIN_INPUT = 0;
export const NOT_PIN_OUTPUT = 1;

export const BUFFER_PIN_INPUT = 0;
export const BUFFER_PIN_OUTPUT = 1;

export const TRISTATE_PIN_DATA = 0;
export const TRISTATE_PIN_ENABLE = 1;
export const TRISTATE_PIN_OUTPUT = 2;

export const DLATCH_PIN_DATA = 0;
export const DLATCH_PIN_ENABLE = 1;
export const DLATCH_PIN_Q = 2;
export const DLATCH_PIN_QN = 3;

export const DFF_PIN_DATA = 0;
export const DFF_PIN_CLOCK = 1;
export const DFF_PIN_RESET = 2;
export const DFF_PIN_SET = 3;
export const DFF_PIN_Q = 4;
export const DFF_PIN_QN = 5;

export const SRLATCH_PIN_S = 0;
export const SRLATCH_PIN_R = 1;
export const SRLATCH_PIN_Q = 2;
export const SRLATCH_PIN_QN = 3;

export const JK_PIN_J = 0;
export const JK_PIN_K = 1;
export const JK_PIN_CLOCK = 2;
export const JK_PIN_RESET = 3;
export const JK_PIN_SET = 4;
export const JK_PIN_Q = 5;
export const JK_PIN_QN = 6;

export const T_PIN_T = 0;
export const T_PIN_CLOCK = 1;
export const T_PIN_RESET = 2;
export const T_PIN_SET = 3;
export const T_PIN_Q = 4;
export const T_PIN_QN = 5;

export const COUNTER_PIN_CLOCK = 0;
export const COUNTER_PIN_RESET = 1;
/** Q0 (LSB) starts at role 2; role for bit i is COUNTER_PIN_Q0 + i. Unlike
 *  the bus family's index-0-is-MSB convention, a counter's Q0 is the LSB,
 *  matching how hardware counters are conventionally numbered. */
export const COUNTER_PIN_Q0 = 2;

// Multiplexer/demultiplexer/decoder/priority-encoder are variable-shape:
// pin count depends on the gate's configured `paramA` (selectBits), so
// there's no single fixed role number to name here,  see
// inferPinDirections below for the actual layout, and gate-evaluators.ts /
// simulator.ts for how they're read back apart at role 0.
//
// MULTIPLEXER   (paramA = N select bits): [S0..S(N-1), D0..D(2^N-1), Y]
// DEMULTIPLEXER (paramA = N select bits): [D, S0..S(N-1), Y0..Y(2^N-1)]
// DECODER       (paramA = N select bits): [A0..A(N-1), Y0..Y(2^N-1)]
// PRIORITY_ENCODER (paramA = N, meaning 2^N inputs): [D0..D(2^N-1), A0..A(N-1), VALID]
//
// Every select/address line is LSB-first (index 0 = least significant bit),
// the opposite of the bus family's MSB-first lane numbering,  buses are
// display bundles of independent single-bit wires, these are real binary
// arithmetic, where LSB-first is the near-universal hardware convention.

/** INPUT_PIN / CONSTANT / CLOCK all expose a single driving output pin. */
export const SOURCE_PIN_OUTPUT = 0;
/** OUTPUT_PIN exposes a single probing input pin and drives nothing. */
export const SINK_PIN_INPUT = 0;

// -----------------------------------------------------------------------------
// Gate parameter slot meaning, exposed as named accessors for readability
// -----------------------------------------------------------------------------

export enum SrLatchKind {
  NOR_BASED = 0, // active-HIGH S/R
  NAND_BASED = 1, // active-LOW S/R (S-bar / R-bar)
}

export interface GateSpec {
  type: GateType;
  /** Number of pins to allocate; if omitted, inferred from `type` where unambiguous. */
  pinCount?: number;
  pinDirections?: PinDirection[];
  delay?: SimTime;
  paramA?: number;
  paramB?: number;
  name?: string;
}

/**
 * CircuitData is the mutable builder AND the storage for a circuit's static
 * structure. Build it up with addNet/addGate/connect, then hand it to
 * `compileTopology()` (simulation/compiler.ts) to derive the CSR adjacency
 * structures the event-driven simulator actually runs against.
 */
export class CircuitData {
  // --- Gate table -----------------------------------------------------------
  readonly gateType = new DynamicTypedArray(Int32Array, INITIAL_GATE_CAPACITY);
  readonly gateDelay = new DynamicTypedArray(Int32Array, INITIAL_GATE_CAPACITY);
  readonly gatePinStart = new DynamicTypedArray(Int32Array, INITIAL_GATE_CAPACITY);
  readonly gatePinCount = new DynamicTypedArray(Int32Array, INITIAL_GATE_CAPACITY);
  readonly gateParamA = new DynamicTypedArray(Int32Array, INITIAL_GATE_CAPACITY);
  readonly gateParamB = new DynamicTypedArray(Int32Array, INITIAL_GATE_CAPACITY);
  /** Optional debug metadata,  NOT read by the simulator core. */
  readonly gateName: (string | undefined)[] = [];

  // --- Pin table --------------------------------------------------------------
  readonly pinDirection = new DynamicTypedArray(Int32Array, INITIAL_PIN_CAPACITY);
  readonly pinNet = new DynamicTypedArray(Int32Array, INITIAL_PIN_CAPACITY);
  readonly pinOwnerGate = new DynamicTypedArray(Int32Array, INITIAL_PIN_CAPACITY);
  readonly pinRole = new DynamicTypedArray(Int32Array, INITIAL_PIN_CAPACITY);

  // --- Net table ----------------------------------------------------------------
  private _netCount = 0;
  /** Optional debug metadata,  NOT read by the simulator core. */
  readonly netName: (string | undefined)[] = [];
  /** Nets retired by mergeNets(),  excluded from validateCircuit's "unused net" check. */
  private readonly absorbedNets = new Set<number>();

  get gateCount(): number {
    return this.gateType.length;
  }

  get pinCount(): number {
    return this.pinDirection.length;
  }

  get netCount(): number {
    return this._netCount;
  }

  // ---------------------------------------------------------------------------
  // Construction API
  // ---------------------------------------------------------------------------

  /** Allocates a new, initially-unconnected net. */
  addNet(name?: string): NetId {
    const id = this._netCount++;
    this.netName.push(name);
    return asNetId(id);
  }

  /**
   * Allocates a new gate along with all of its pins (contiguously,  this is
   * what lets gatePinStart/gatePinCount address them as a flat range).
   */
  addGate(spec: GateSpec): GateId {
    const directions = spec.pinDirections ?? inferPinDirections(spec.type, spec.pinCount, spec.paramA);
    const gateId = asGateId(this.gateType.length);

    this.gateType.push(spec.type);
    this.gateDelay.push(spec.delay ?? DEFAULT_GATE_DELAY[spec.type]);
    this.gatePinStart.push(this.pinDirection.length);
    this.gatePinCount.push(directions.length);
    this.gateParamA.push(spec.paramA ?? 0);
    this.gateParamB.push(spec.paramB ?? 0);
    this.gateName.push(spec.name);

    for (let role = 0; role < directions.length; role++) {
      this.pinDirection.push(directions[role]);
      this.pinNet.push(INVALID_ID);
      this.pinOwnerGate.push(gateId);
      this.pinRole.push(role);
    }

    return gateId;
  }

  /** Connects a pin to a net (a pin may only ever be connected to one net at a time). */
  connect(pin: PinId, net: NetId): void {
    this.assertValidPin(pin);
    this.assertValidNet(net);
    this.pinNet.set(pin, net);
  }

  /** Convenience: allocates a net and immediately connects `pins` to it. */
  wire(pins: PinId[], name?: string): NetId {
    const net = this.addNet(name);
    for (const p of pins) this.connect(p, net);
    return net;
  }

  /**
   * Joins two already-wired nets into one: every pin currently on `absorb`
   * is reassigned onto `keep`, and `absorb` is retired. `connect()` alone
   * can only add a pin to a net,  it can't join two nets that already have
   * their own pins, which is exactly what's needed to wire one subcircuit
   * instance's output port directly into another's input port (both ports
   * are nets, not bare pins). Nets are append-only storage with no
   * compaction, so `absorb` keeps its id but is excluded from
   * validateCircuit's "unused net" check via `isNetAbsorbed`.
   */
  mergeNets(keep: NetId, absorb: NetId): NetId {
    this.assertValidNet(keep);
    this.assertValidNet(absorb);
    if (keep === absorb) return keep;
    if (this.absorbedNets.has(absorb)) {
      throw new Error(`mergeNets: net ${absorb} was already merged into another net`);
    }
    for (let p = 0; p < this.pinCount; p++) {
      if (this.pinNet.get(p) === absorb) this.pinNet.set(p, keep);
    }
    this.absorbedNets.add(absorb);
    return keep;
  }

  /** True if `net` was retired by mergeNets() (or markNetAbsorbed()). */
  isNetAbsorbed(net: NetId): boolean {
    return this.absorbedNets.has(net);
  }

  /**
   * Marks `net` as absorbed without moving any pins. Used when cloning an
   * already-merged net structure wholesale (e.g. flattening a subcircuit
   * definition that itself called mergeNets internally),  the clone's pins
   * are already correctly wired via the id remapping, so only the "don't
   * flag this as an unused net" bit needs to carry over.
   */
  markNetAbsorbed(net: NetId): void {
    this.assertValidNet(net);
    this.absorbedNets.add(net);
  }

  /** Returns the PinId for a given (gate, role) pair, e.g. `pinOf(g, TRISTATE_PIN_ENABLE)`. */
  pinOf(gate: GateId, role: number): PinId {
    this.assertValidGate(gate);
    const start = this.gatePinStart.get(gate);
    const count = this.gatePinCount.get(gate);
    if (role < 0 || role >= count) {
      throw new RangeError(
        `pinOf: role ${role} out of range for gate ${gate} (has ${count} pins)`,
      );
    }
    return asPinId(start + role);
  }

  /** Returns all PinIds owned by a gate, in role order. */
  getGatePins(gate: GateId): PinId[] {
    this.assertValidGate(gate);
    const start = this.gatePinStart.get(gate);
    const count = this.gatePinCount.get(gate);
    const pins: PinId[] = new Array(count);
    for (let i = 0; i < count; i++) pins[i] = asPinId(start + i);
    return pins;
  }

  /** Returns the last pin (by role) owned by a gate,  the output for standard N-ary gates. */
  getLastPin(gate: GateId): PinId {
    this.assertValidGate(gate);
    const start = this.gatePinStart.get(gate);
    const count = this.gatePinCount.get(gate);
    return asPinId(start + count - 1);
  }

  // ---------------------------------------------------------------------------
  // Validation helpers
  // ---------------------------------------------------------------------------

  assertValidGate(gate: GateId): void {
    if (gate < 0 || gate >= this.gateCount) {
      throw new RangeError(`Invalid GateId: ${gate}`);
    }
  }

  assertValidPin(pin: PinId): void {
    if (pin < 0 || pin >= this.pinCount) {
      throw new RangeError(`Invalid PinId: ${pin}`);
    }
  }

  assertValidNet(net: NetId): void {
    if (net < 0 || net >= this.netCount) {
      throw new RangeError(`Invalid NetId: ${net}`);
    }
  }
}

/** Fallback selectBits when a variable-shape gate is constructed without an
 *  explicit `paramA` (e.g. a hand-built test circuit). Mirrors
 *  DEFAULT_SELECT_BITS in apps/web's gate-defaults.ts, the UI's own default
 *  when a user first drops one of these onto the canvas. */
const DEFAULT_INFERRED_SELECT_BITS = 2;

/**
 * Infers a standard pin-direction layout for the common, fixed-shape gate
 * types. Variable-arity gates (AND/OR/NAND/NOR/XOR/XNOR) require an explicit
 * `pinCount` (defaults to 2 inputs + 1 output when omitted). The
 * combinational-MSI and COUNTER types are variable-*shape*: their layout is
 * entirely derived from `paramA` (selectBits or bitWidth), see the pin-role
 * doc comment above this function's call site in the exports above.
 */
function inferPinDirections(type: GateType, pinCount?: number, paramA?: number): PinDirection[] {
  const I = PinDirection.INPUT;
  const O = PinDirection.OUTPUT;

  switch (type) {
    case GateType.NAND:
    case GateType.AND:
    case GateType.OR:
    case GateType.NOR:
    case GateType.XOR:
    case GateType.XNOR: {
      const inputs = Math.max(2, (pinCount ?? 3) - 1);
      return [...Array(inputs).fill(I), O];
    }
    case GateType.NOT:
      return [I, O];
    case GateType.BUFFER:
      return [I, O];
    case GateType.TRISTATE_BUFFER:
      return [I, I, O]; // data, enable, output
    case GateType.D_LATCH:
      return [I, I, O, O]; // data, enable, q, qn
    case GateType.FLIP_FLOP:
      return [I, I, I, I, O, O]; // data, clock, reset, set, q, qn
    case GateType.SR_LATCH:
      return [I, I, O, O]; // s, r, q, qn
    case GateType.JK_FLIP_FLOP:
      return [I, I, I, I, I, O, O]; // j, k, clock, reset, set, q, qn
    case GateType.T_FLIP_FLOP:
      return [I, I, I, I, O, O]; // t, clock, reset, set, q, qn
    case GateType.INPUT_PIN:
    case GateType.CONSTANT:
    case GateType.CLOCK:
      return [O];
    case GateType.OUTPUT_PIN:
      return [I];

    case GateType.MULTIPLEXER: {
      const n = paramA ?? DEFAULT_INFERRED_SELECT_BITS;
      const dataLines = 1 << n;
      return [...Array(n).fill(I), ...Array(dataLines).fill(I), O]; // S0..S(n-1), D0..D(2^n-1), Y
    }
    case GateType.DEMULTIPLEXER: {
      const n = paramA ?? DEFAULT_INFERRED_SELECT_BITS;
      const outputs = 1 << n;
      return [I, ...Array(n).fill(I), ...Array(outputs).fill(O)]; // D, S0..S(n-1), Y0..Y(2^n-1)
    }
    case GateType.DECODER: {
      const n = paramA ?? DEFAULT_INFERRED_SELECT_BITS;
      const outputs = 1 << n;
      return [...Array(n).fill(I), ...Array(outputs).fill(O)]; // A0..A(n-1), Y0..Y(2^n-1)
    }
    case GateType.PRIORITY_ENCODER: {
      const n = paramA ?? DEFAULT_INFERRED_SELECT_BITS;
      const inputs = 1 << n;
      return [...Array(inputs).fill(I), ...Array(n).fill(O), O]; // D0..D(2^n-1), A0..A(n-1), VALID
    }
    case GateType.COUNTER: {
      const n = paramA ?? 4;
      return [I, I, ...Array(n).fill(O)]; // clock, reset, Q0..Q(n-1)
    }

    default:
      throw new Error(`inferPinDirections: unhandled GateType ${type}`);
  }
}

/** Re-exported for convenience so callers building constants don't need to import types.ts too. */
export { SignalState };
