import { DynamicTypedArray } from './dynamic-array';
import {
  DEFAULT_GATE_DELAY,
  INITIAL_GATE_CAPACITY,
  INITIAL_NET_CAPACITY,
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
  /** Optional debug metadata — NOT read by the simulator core. */
  readonly gateName: (string | undefined)[] = [];

  // --- Pin table --------------------------------------------------------------
  readonly pinDirection = new DynamicTypedArray(Int32Array, INITIAL_PIN_CAPACITY);
  readonly pinNet = new DynamicTypedArray(Int32Array, INITIAL_PIN_CAPACITY);
  readonly pinOwnerGate = new DynamicTypedArray(Int32Array, INITIAL_PIN_CAPACITY);
  readonly pinRole = new DynamicTypedArray(Int32Array, INITIAL_PIN_CAPACITY);

  // --- Net table ----------------------------------------------------------------
  private _netCount = 0;
  /** Optional debug metadata — NOT read by the simulator core. */
  readonly netName: (string | undefined)[] = [];

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
   * Allocates a new gate along with all of its pins (contiguously — this is
   * what lets gatePinStart/gatePinCount address them as a flat range).
   */
  addGate(spec: GateSpec): GateId {
    const directions = spec.pinDirections ?? inferPinDirections(spec.type, spec.pinCount);
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

  /** Returns the last pin (by role) owned by a gate — the output for standard N-ary gates. */
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

/**
 * Infers a standard pin-direction layout for the common, fixed-shape gate
 * types. Variable-arity gates (AND/OR/NAND/NOR/XOR/XNOR) require an explicit
 * `pinCount` (defaults to 2 inputs + 1 output when omitted).
 */
function inferPinDirections(type: GateType, pinCount?: number): PinDirection[] {
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
    case GateType.D_FLIP_FLOP:
      return [I, I, I, I, O, O]; // data, clock, reset, set, q, qn
    case GateType.SR_LATCH:
      return [I, I, O, O]; // s, r, q, qn
    case GateType.INPUT_PIN:
    case GateType.CONSTANT:
    case GateType.CLOCK:
      return [O];
    case GateType.OUTPUT_PIN:
      return [I];
    case GateType.SUBCIRCUIT:
      if (pinCount === undefined) {
        throw new Error('SUBCIRCUIT gates require explicit pinDirections (no inference possible)');
      }
      return new Array(pinCount).fill(I); // caller should really pass explicit directions
    default:
      throw new Error(`inferPinDirections: unhandled GateType ${type}`);
  }
}

/** Re-exported for convenience so callers building constants don't need to import types.ts too. */
export { SignalState };
