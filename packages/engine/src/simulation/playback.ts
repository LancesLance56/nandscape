import type { GateId, SignalState, SimTime } from '../data';
import type { Simulator, StopReason } from './simulator';

export interface RealtimeAdvanceResult {
  stopReason: StopReason;
  currentTime: SimTime;
}

export function advanceSimulatorRealtime(
  simulator: Simulator,
  elapsedMs: number,
  unitsPerSecond: number,
): RealtimeAdvanceResult {
  const advanceBy = Math.max(1, Math.round((elapsedMs / 1000) * unitsPerSecond));
  const targetTime = simulator.state.currentTime + advanceBy;
  const stopReason = simulator.run(targetTime);
  return { stopReason, currentTime: simulator.state.currentTime };
}

export function seedInputs(simulator: Simulator, values: Iterable<readonly [GateId, SignalState]>): void {
  for (const [gate, value] of values) {
    simulator.setInput(gate, value, 0);
  }
}

export const DEFAULT_SETTLE_WINDOW: SimTime = 64;

export function settleInitialState(simulator: Simulator, settleWindow: SimTime = DEFAULT_SETTLE_WINDOW): StopReason {
  return simulator.run(simulator.state.currentTime + settleWindow);
}

/**
 * Lets combinational logic settle in response to a just-driven input
 * without advancing any free-running source (CLOCK) past its current
 * value,  see Simulator.settleCombinational for why this is not the same
 * thing as settleInitialState's fixed lookahead window.
 */
export function settleCombinational(simulator: Simulator): StopReason {
  return simulator.settleCombinational();
}
