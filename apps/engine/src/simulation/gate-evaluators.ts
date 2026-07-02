/**
 * gate-evaluators.ts
 * ---------------------------------------------------------------------------
 * Pure, side-effect-free functions that implement:
 *
 *   1. Combinational gate truth tables over the 4-value signal model
 *      (LOW / HIGH / FLOAT / UNKNOWN), including correct propagation of
 *      UNKNOWN and FLOAT the way a real HDL simulator would (e.g. a 2-input
 *      AND with one LOW input is LOW regardless of what the other input is
 *      doing — "dominant zero" — even if that other input is UNKNOWN).
 *
 *   2. Sequential primitive evaluation (D latch, D flip-flop, SR latch),
 *      given previous/current input states.
 *
 *   3. Net driver resolution — combining the states driven by every active
 *      driver pin on a net into a single resolved SignalState, correctly
 *      modeling bus contention (multiple disagreeing drivers -> UNKNOWN)
 *      and undriven nets (zero drivers -> FLOAT).
 *
 * None of these functions touch RuntimeState, EventQueue, or any other
 * mutable structure — they take plain SignalState values in and return
 * plain SignalState values out, which makes them trivial to unit test in
 * isolation (see tests/gate-evaluators.test.ts) and safe to call from
 * anywhere in the simulator without worrying about ordering or aliasing.
 */

import { EdgeType, NetResolutionKind, SignalState } from '../data/types';
import { SrLatchKind } from '../data/circuit';

const { LOW, HIGH, FLOAT, UNKNOWN } = SignalState;

// -----------------------------------------------------------------------------
// Combinational primitives
// -----------------------------------------------------------------------------

/** FLOAT behaves like UNKNOWN from the perspective of a logic gate: a gate
 * cannot meaningfully act on a high-impedance input, so treat it as
 * indeterminate for the purposes of AND/OR-style dominance rules. */
function toLogicInput(s: SignalState): SignalState.LOW | SignalState.HIGH | SignalState.UNKNOWN {
  if (s === HIGH) return HIGH;
  if (s === LOW) return LOW;
  return UNKNOWN; // FLOAT or UNKNOWN both collapse to UNKNOWN as a gate input
}

/** AND across any number of inputs: LOW is dominant, else UNKNOWN is dominant, else HIGH. */
export function evaluateAnd(inputs: readonly SignalState[]): SignalState {
  let sawUnknown = false;
  for (const raw of inputs) {
    const s = toLogicInput(raw);
    if (s === LOW) return LOW; // dominant zero
    if (s === UNKNOWN) sawUnknown = true;
  }
  return sawUnknown ? UNKNOWN : HIGH;
}

/** NAND = NOT(AND). */
export function evaluateNand(inputs: readonly SignalState[]): SignalState {
  return invert(evaluateAnd(inputs));
}

/** OR across any number of inputs: HIGH is dominant, else UNKNOWN is dominant, else LOW. */
export function evaluateOr(inputs: readonly SignalState[]): SignalState {
  let sawUnknown = false;
  for (const raw of inputs) {
    const s = toLogicInput(raw);
    if (s === HIGH) return HIGH; // dominant one
    if (s === UNKNOWN) sawUnknown = true;
  }
  return sawUnknown ? UNKNOWN : LOW;
}

/** NOR = NOT(OR). */
export function evaluateNor(inputs: readonly SignalState[]): SignalState {
  return invert(evaluateOr(inputs));
}

/** XOR across any number of inputs: well-defined only when every input is a
 * defined logic level, in which case it's the parity (odd number of HIGHs).
 * If any input is UNKNOWN/FLOAT, the result is UNKNOWN — a single unknown
 * bit can flip the parity of the whole expression. */
export function evaluateXor(inputs: readonly SignalState[]): SignalState {
  let parity = 0;
  for (const raw of inputs) {
    const s = toLogicInput(raw);
    if (s === UNKNOWN) return UNKNOWN;
    if (s === HIGH) parity ^= 1;
  }
  return parity === 1 ? HIGH : LOW;
}

/** XNOR = NOT(XOR). */
export function evaluateXnor(inputs: readonly SignalState[]): SignalState {
  return invert(evaluateXor(inputs));
}

/** Logical inversion; UNKNOWN and FLOAT both invert to UNKNOWN (a floating
 * input to an inverter does not produce a well-defined output). */
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

/** A non-inverting buffer simply repeats its (logic-collapsed) input. */
export function evaluateBuffer(input: SignalState): SignalState {
  return toLogicInput(input);
}

/**
 * Tri-state buffer: drives `data` onto the output only while `enable` is
 * HIGH; otherwise the output releases to FLOAT (high-impedance), letting
 * some other driver on the shared bus take over. An UNKNOWN/FLOAT enable
 * signal means we can't be sure whether the buffer is on or off, so the
 * output is UNKNOWN (it might be driving, might not).
 */
export function evaluateTristateBuffer(data: SignalState, enable: SignalState): SignalState {
  if (enable === HIGH) return toLogicInput(data);
  if (enable === LOW) return FLOAT;
  return UNKNOWN;
}

// -----------------------------------------------------------------------------
// Sequential primitives
// -----------------------------------------------------------------------------

export interface FlipFlopOutputs {
  q: SignalState;
  qn: SignalState;
}

/**
 * D latch: transparent while `enable` is HIGH (output follows `data`
 * immediately), holds its last value while `enable` is LOW. An UNKNOWN
 * enable makes it impossible to know whether the latch is transparent or
 * holding, so both outputs go UNKNOWN.
 */
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

/**
 * D flip-flop: captures `data` into Q only on the configured clock edge
 * (RISING or FALLING), determined by the caller from the clock net's
 * previous vs. current resolved state. Asynchronous `reset`/`set` override
 * the clock: reset forces Q=LOW, set forces Q=HIGH, and both asserted
 * simultaneously is an invalid configuration -> UNKNOWN.
 */
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

/**
 * SR latch, either NOR-based (active-HIGH S/R) or NAND-based (active-LOW,
 * i.e. inputs are S-bar/R-bar). Both S and R simultaneously asserted is the
 * classic "forbidden state" and resolves to UNKNOWN for both outputs,
 * matching real hardware's unpredictable behavior in that condition.
 */
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

// -----------------------------------------------------------------------------
// Net driver resolution
// -----------------------------------------------------------------------------

export interface NetResolution {
  state: SignalState;
  kind: NetResolutionKind;
}

/**
 * Resolves the states driven by every active driver pin of a net into one
 * SignalState. FLOAT drivers are, by definition, not actually driving
 * (e.g. a disabled tri-state buffer) and are excluded before resolution:
 *
 *   0 active drivers            -> FLOAT     (UNDRIVEN)
 *   1 active driver             -> that driver's value (SINGLE_DRIVER)
 *   N active drivers, all equal -> that value (AGREEMENT)
 *   N active drivers, disagree  -> UNKNOWN    (CONTENTION — bus fight)
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
    // All active drivers agree they're UNKNOWN — still UNKNOWN, but the
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
