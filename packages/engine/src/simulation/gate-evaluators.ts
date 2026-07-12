import { EdgeType, NetResolutionKind, SignalState } from '../data';
import { SrLatchKind } from '../data';

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

export interface NetResolution {
  state: SignalState;
  kind: NetResolutionKind;
}

/**
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
