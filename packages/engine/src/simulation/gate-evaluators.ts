import { EdgeType, NetResolutionKind, SignalState } from '../data';
import { SrLatchKind } from '../data';
import { GateType } from '../data';

const { LOW, HIGH, FLOAT, UNKNOWN } = SignalState;

function toLogicInput(s: SignalState): SignalState.LOW | SignalState.HIGH | SignalState.UNKNOWN {
  if (s === HIGH) return HIGH;
  if (s === LOW) return LOW;
  return UNKNOWN; // FLOAT or UNKNOWN both collapse to UNKNOWN as a gate input
}

export function evaluateAnd(inputs: readonly SignalState[]): SignalState {
  let sawUnknown = false;
  for (const raw of inputs) {
    const s = toLogicInput(raw);
    if (s === LOW) return LOW; // dominant zero
    if (s === UNKNOWN) sawUnknown = true;
  }
  return sawUnknown ? UNKNOWN : HIGH;
}

export function evaluateNand(inputs: readonly SignalState[]): SignalState {
  return invert(evaluateAnd(inputs));
}

export function evaluateOr(inputs: readonly SignalState[]): SignalState {
  let sawUnknown = false;
  for (const raw of inputs) {
    const s = toLogicInput(raw);
    if (s === HIGH) return HIGH; // dominant one
    if (s === UNKNOWN) sawUnknown = true;
  }
  return sawUnknown ? UNKNOWN : LOW;
}

export function evaluateNor(inputs: readonly SignalState[]): SignalState {
  return invert(evaluateOr(inputs));
}

export function evaluateXor(inputs: readonly SignalState[]): SignalState {
  let parity = 0;
  for (const raw of inputs) {
    const s = toLogicInput(raw);
    if (s === UNKNOWN) return UNKNOWN;
    if (s === HIGH) parity ^= 1;
  }
  return parity === 1 ? HIGH : LOW;
}

export function evaluateXnor(inputs: readonly SignalState[]): SignalState {
  return invert(evaluateXor(inputs));
}

export function evaluateNot(input: SignalState): SignalState {
  const s = toLogicInput(input);
  if (s === UNKNOWN) return UNKNOWN;
  return s === HIGH ? LOW : HIGH;
}

function invert(s: SignalState): SignalState {
  if (s === HIGH) return LOW;
  if (s === LOW) return HIGH;
  return UNKNOWN;
}

export function evaluateBuffer(input: SignalState): SignalState {
  return toLogicInput(input);
}

export function evaluateTristateBuffer(data: SignalState, enable: SignalState): SignalState {
  if (enable === HIGH) return toLogicInput(data);
  if (enable === LOW) return FLOAT;
  return UNKNOWN;
}

export interface FlipFlopOutputs {
  q: SignalState;
  qn: SignalState;
}

export function evaluateDLatch(
  data: SignalState,
  enable: SignalState,
  previousQ: SignalState,
): FlipFlopOutputs {
  if (enable === HIGH) {
    const q = toLogicInput(data);
    return { q, qn: invert(q) };
  }
  if (enable === LOW) {
    return { q: previousQ, qn: invert(previousQ) };
  }
  return { q: UNKNOWN, qn: UNKNOWN };
}

export function evaluateDFlipFlop(params: {
  data: SignalState;
  reset: SignalState;
  set: SignalState;
  clockEdgeOccurred: boolean;
  previousQ: SignalState;
}): FlipFlopOutputs {
  const { data, reset, set, clockEdgeOccurred, previousQ } = params;

  const resetActive = reset === HIGH;
  const setActive = set === HIGH;

  if (resetActive && setActive) return { q: UNKNOWN, qn: UNKNOWN };
  if (resetActive) return { q: LOW, qn: HIGH };
  if (setActive) return { q: HIGH, qn: LOW };

  if (clockEdgeOccurred) {
    const q = toLogicInput(data);
    return { q, qn: invert(q) };
  }

  return { q: previousQ, qn: invert(previousQ) };
}

export function evaluateSrLatch(params: {
  s: SignalState;
  r: SignalState;
  kind: SrLatchKind;
  previousQ: SignalState;
}): FlipFlopOutputs {
  const { s, r, kind, previousQ } = params;

  // Normalize both flavors to "active-HIGH" semantics internally.
  const setAsserted = kind === SrLatchKind.NAND_BASED ? s === LOW : s === HIGH;
  const resetAsserted = kind === SrLatchKind.NAND_BASED ? r === LOW : r === HIGH;
  const setUnknown = toLogicInput(s) === UNKNOWN;
  const resetUnknown = toLogicInput(r) === UNKNOWN;

  if (setAsserted && resetAsserted) return { q: UNKNOWN, qn: UNKNOWN }; // forbidden state
  if (setAsserted) return { q: HIGH, qn: LOW };
  if (resetAsserted) return { q: LOW, qn: HIGH };
  if (setUnknown || resetUnknown) return { q: UNKNOWN, qn: UNKNOWN };

  return { q: previousQ, qn: invert(previousQ) }; // both de-asserted -> hold
}

/** Decodes select/address lines into an index, LSB-first (select[0] is the
 *  least significant bit). Returns null if any bit is UNKNOWN,  the index
 *  itself is then undecidable, not just one candidate among several. */
function decodeIndex(bits: readonly SignalState[]): number | null {
  let index = 0;
  for (let i = bits.length - 1; i >= 0; i--) {
    const s = toLogicInput(bits[i]);
    if (s === UNKNOWN) return null;
    index = (index << 1) | (s === HIGH ? 1 : 0);
  }
  return index;
}

/** Selects one of `data` by `select` (LSB-first). An undecidable select
 *  (any bit UNKNOWN) makes the output UNKNOWN,  it's not any one candidate
 *  line, since we can't tell which one was actually chosen. */
export function evaluateMultiplexer(select: readonly SignalState[], data: readonly SignalState[]): SignalState {
  const index = decodeIndex(select);
  if (index === null) return UNKNOWN;
  return toLogicInput(data[index]);
}

/** Routes `data` to exactly one of `outputCount` outputs by `select`
 *  (LSB-first); every other output is driven LOW (demux outputs aren't
 *  tristate here, so "not selected" is a defined level, not a float). An
 *  undecidable select makes every output UNKNOWN, since we can't tell which
 *  one should have carried `data`. */
export function evaluateDemultiplexer(
  select: readonly SignalState[],
  data: SignalState,
  outputCount: number,
): SignalState[] {
  const index = decodeIndex(select);
  if (index === null) return Array(outputCount).fill(UNKNOWN);
  const value = toLogicInput(data);
  return Array.from({ length: outputCount }, (_, i) => (i === index ? value : LOW));
}

/** One-hot decodes `inputs` (the address lines, LSB-first) into
 *  `outputCount` = 2^inputs.length lines. No enable line,  every pin the
 *  engine allocates must be wired (validateCircuit rejects unconnected
 *  pins), and an always-required enable tie-high would just be friction for
 *  no benefit here. */
export function evaluateDecoder(inputs: readonly SignalState[], outputCount: number): SignalState[] {
  const index = decodeIndex(inputs);
  if (index === null) return Array(outputCount).fill(UNKNOWN);
  return Array.from({ length: outputCount }, (_, i) => (i === index ? HIGH : LOW));
}

/** Encodes the highest-index active line of `inputs` into `selectBits`
 *  address bits (LSB-first) plus a trailing VALID bit (HIGH iff any input
 *  was active). Scans from the top: the first HIGH found wins outright
 *  (lower-priority lines below it never matter), but an UNKNOWN encountered
 *  before a winner is found taints the whole result, since that line might
 *  secretly have been the true highest-priority HIGH. */
export function evaluatePriorityEncoder(inputs: readonly SignalState[], selectBits: number): SignalState[] {
  let winner = -1;
  for (let i = inputs.length - 1; i >= 0; i--) {
    const s = toLogicInput(inputs[i]);
    if (s === UNKNOWN) return Array(selectBits + 1).fill(UNKNOWN);
    if (s === HIGH) {
      winner = i;
      break;
    }
  }
  const bits: SignalState[] = [];
  for (let b = 0; b < selectBits; b++) {
    bits.push(winner !== -1 && (winner >> b) & 1 ? HIGH : LOW);
  }
  bits.push(winner !== -1 ? HIGH : LOW); // VALID
  return bits;
}

/** Synchronous up-counter: increments its previous binary value (Q0 = LSB,
 *  read back from each output pin's own drive state,  the same
 *  "previousQ" technique evaluateDFlipFlop uses, just generalized to N
 *  pins) by 1 on a configured clock edge, wrapping at 2^N. `reset` is
 *  asynchronous and level-sensitive (checked every evaluation, not just on
 *  an edge) and forces every bit to LOW,  same as evaluateDFlipFlop's
 *  reset/set handling. Unlike a fresh flip-flop's Q (genuinely arbitrary
 *  until first written, so it seeds UNKNOWN), a fresh counter seeds to 0
 *  (see Simulator.seedInitialConditions),  a counter that reads UNKNOWN
 *  forever until someone happens to pulse reset first isn't usable out of
 *  the box the way an SR latch's "don't-care until set" genuinely is. */
export function evaluateCounter(params: {
  reset: SignalState;
  clockEdgeOccurred: boolean;
  previousBits: readonly SignalState[];
}): SignalState[] {
  const { reset, clockEdgeOccurred, previousBits } = params;
  const n = previousBits.length;

  const resetLevel = toLogicInput(reset);
  if (resetLevel === HIGH) return Array(n).fill(LOW);
  if (resetLevel === UNKNOWN) return Array(n).fill(UNKNOWN);
  if (!clockEdgeOccurred) return previousBits.slice();

  let value = 0;
  for (let i = n - 1; i >= 0; i--) {
    const bit = previousBits[i];
    if (bit === UNKNOWN) return Array(n).fill(UNKNOWN); // can't increment an unknown count
    value = (value << 1) | (bit === HIGH ? 1 : 0);
  }
  value = (value + 1) % (1 << n);

  const next: SignalState[] = [];
  for (let b = 0; b < n; b++) next.push((value >> b) & 1 ? HIGH : LOW);
  return next;
}

/** J-K flip-flop: hold (J=K=0), set (J=1,K=0), reset (J=0,K=1), toggle
 *  (J=K=1) on the configured clock edge. Async reset/set mirror
 *  evaluateDFlipFlop exactly. */
export function evaluateJkFlipFlop(params: {
  j: SignalState;
  k: SignalState;
  reset: SignalState;
  set: SignalState;
  clockEdgeOccurred: boolean;
  previousQ: SignalState;
}): FlipFlopOutputs {
  const { j, k, reset, set, clockEdgeOccurred, previousQ } = params;

  if (reset === HIGH && set === HIGH) return { q: UNKNOWN, qn: UNKNOWN };
  if (reset === HIGH) return { q: LOW, qn: HIGH };
  if (set === HIGH) return { q: HIGH, qn: LOW };
  if (!clockEdgeOccurred) return { q: previousQ, qn: invert(previousQ) };

  const jj = toLogicInput(j);
  const kk = toLogicInput(k);
  if (jj === UNKNOWN || kk === UNKNOWN) return { q: UNKNOWN, qn: UNKNOWN };
  if (jj === LOW && kk === LOW) return { q: previousQ, qn: invert(previousQ) }; // hold
  if (jj === HIGH && kk === LOW) return { q: HIGH, qn: LOW }; // set
  if (jj === LOW && kk === HIGH) return { q: LOW, qn: HIGH }; // reset

  // toggle
  const prevLogic = toLogicInput(previousQ);
  if (prevLogic === UNKNOWN) return { q: UNKNOWN, qn: UNKNOWN };
  const q = prevLogic === HIGH ? LOW : HIGH;
  return { q, qn: invert(q) };
}

/** T flip-flop: hold (T=0) or toggle (T=1) on the configured clock edge.
 *  Async reset/set mirror evaluateDFlipFlop exactly. */
export function evaluateTFlipFlop(params: {
  t: SignalState;
  reset: SignalState;
  set: SignalState;
  clockEdgeOccurred: boolean;
  previousQ: SignalState;
}): FlipFlopOutputs {
  const { t, reset, set, clockEdgeOccurred, previousQ } = params;

  if (reset === HIGH && set === HIGH) return { q: UNKNOWN, qn: UNKNOWN };
  if (reset === HIGH) return { q: LOW, qn: HIGH };
  if (set === HIGH) return { q: HIGH, qn: LOW };
  if (!clockEdgeOccurred) return { q: previousQ, qn: invert(previousQ) };

  const tt = toLogicInput(t);
  if (tt === UNKNOWN) return { q: UNKNOWN, qn: UNKNOWN };
  if (tt === LOW) return { q: previousQ, qn: invert(previousQ) }; // hold

  const prevLogic = toLogicInput(previousQ);
  if (prevLogic === UNKNOWN) return { q: UNKNOWN, qn: UNKNOWN };
  const q = prevLogic === HIGH ? LOW : HIGH;
  return { q, qn: invert(q) }; // toggle
}

export interface NetResolution {
  state: SignalState;
  kind: NetResolutionKind;
}

/**
 *   0 active drivers            -> FLOAT     (UNDRIVEN)
 *   1 active driver             -> that driver's value (SINGLE_DRIVER)
 *   N active drivers, all equal -> that value (AGREEMENT)
 *   N active drivers, disagree  -> UNKNOWN    (CONTENTION,  bus fight)
 *
 * Any UNKNOWN among otherwise-agreeing active drivers also yields UNKNOWN,
 * since we can't be sure the "unknown" driver doesn't actually disagree.
 */
export function resolveNet(driverStates: readonly SignalState[]): NetResolution {
  const active = driverStates.filter((s) => s !== FLOAT);

  if (active.length === 0) {
    return { state: FLOAT, kind: NetResolutionKind.UNDRIVEN };
  }

  const first = active[0];
  let allAgree = true;
  for (let i = 1; i < active.length; i++) {
    if (active[i] !== first) {
      allAgree = false;
      break;
    }
  }

  if (!allAgree) {
    return { state: UNKNOWN, kind: NetResolutionKind.CONTENTION };
  }

  if (first === UNKNOWN) {
    // All active drivers agree they're UNKNOWN,  still UNKNOWN, but the
    // "kind" reflects that they were at least unanimous about it.
    return {
      state: UNKNOWN,
      kind: active.length === 1 ? NetResolutionKind.SINGLE_DRIVER : NetResolutionKind.AGREEMENT,
    };
  }

  return {
    state: first,
    kind: active.length === 1 ? NetResolutionKind.SINGLE_DRIVER : NetResolutionKind.AGREEMENT,
  };
}

/** Determines whether a clock net transition constitutes the configured edge. */
export function didClockEdgeOccur(
  previous: SignalState,
  current: SignalState,
  configuredEdge: EdgeType,
): boolean {
  if (previous === current) return false;
  if (previous === HIGH && current === LOW) {
    return configuredEdge === EdgeType.FALLING || configuredEdge === EdgeType.ANY;
  }
  if (previous === LOW && current === HIGH) {
    return configuredEdge === EdgeType.RISING || configuredEdge === EdgeType.ANY;
  }
  return false; // transitions through/from FLOAT or UNKNOWN are not clean edges
}

/**
 * The single GateType -> evaluator dispatch for stateless combinational
 * gates (NAND/AND/OR/NOR/XOR/XNOR/NOT/BUFFER). Both Simulator.evaluateGate()
 * (the real event-driven engine) and apps/web's instant live-preview call
 * this exact function, so there is exactly one place that knows "a NOR gate
 * computes evaluateNor()",  not two copies that could quietly drift apart.
 * Sequential types (D_LATCH/FLIP_FLOP/SR_LATCH) and boundary types
 * (INPUT_PIN/OUTPUT_PIN/CONSTANT/CLOCK/TRISTATE_BUFFER) aren't handled here;
 * they need extra state (previous Q, clock edges) that a stateless
 * dispatcher like this one has no way to carry, so callers that don't have
 * that state (the instant preview) should catch and treat it as "stays
 * FLOAT for now," exactly as documented in NANDSCAPE_WEB_ARCHITECTURE.md.
 */
export function evaluateCombinationalGate(type: GateType, inputs: readonly SignalState[]): SignalState {
  switch (type) {
    case GateType.NAND:
      return evaluateNand(inputs);
    case GateType.AND:
      return evaluateAnd(inputs);
    case GateType.OR:
      return evaluateOr(inputs);
    case GateType.NOR:
      return evaluateNor(inputs);
    case GateType.XOR:
      return evaluateXor(inputs);
    case GateType.XNOR:
      return evaluateXnor(inputs);
    case GateType.NOT:
      return evaluateNot(inputs[0]);
    case GateType.BUFFER:
      return evaluateBuffer(inputs[0]);
    default:
      throw new Error(`evaluateCombinationalGate: unsupported GateType ${type}`);
  }
}
