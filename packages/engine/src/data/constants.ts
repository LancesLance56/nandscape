import { GateType, SimTime } from './types';

export const DEFAULT_GATE_DELAY: Readonly<Record<GateType, SimTime>> = {
  [GateType.NAND]: 1,
  [GateType.AND]: 2, // AND = NAND + NOT
  [GateType.OR]: 2,
  [GateType.NOR]: 1,
  [GateType.XOR]: 3,
  [GateType.XNOR]: 3,
  [GateType.NOT]: 1,
  [GateType.BUFFER]: 1,
  [GateType.TRISTATE_BUFFER]: 1,
  [GateType.D_LATCH]: 2,
  [GateType.FLIP_FLOP]: 2,
  [GateType.SR_LATCH]: 1,
  [GateType.INPUT_PIN]: 0,
  [GateType.OUTPUT_PIN]: 0,
  [GateType.CONSTANT]: 0,
  [GateType.CLOCK]: 0, // clock period is a separate parameter, see below

  [GateType.MULTIPLEXER]: 2,
  [GateType.DEMULTIPLEXER]: 2,
  [GateType.DECODER]: 2,
  [GateType.PRIORITY_ENCODER]: 3, // priority scan is a bit more work than a straight decode
  [GateType.COUNTER]: 2,
  [GateType.JK_FLIP_FLOP]: 2,
  [GateType.T_FLIP_FLOP]: 2,
};

/** Minimum legal propagation delay. Zero-delay combinational loops are the
 * classic way to build an infinite-loop event storm, so every gate that
 * drives a net must advance simulation time by at least this much. */
export const MIN_GATE_DELAY: SimTime = 1;

/** Safety valve: maximum number of events processed by a single run() call
 * before the simulator halts and reports a possible runaway oscillation
 * (e.g. a ring oscillator with no external step limit). */
export const DEFAULT_MAX_EVENTS = 1_000_000;

/** Safety valve: maximum simulation time a single run() call is allowed to
 * advance to, in absence of an explicit caller-provided budget. */
export const DEFAULT_MAX_TIME: SimTime = 1_000_000;

/** Initial capacity hints for dynamically-growing SoA arrays, to reduce the
 * number of reallocations during incremental circuit construction. */
export const INITIAL_GATE_CAPACITY = 64;
export const INITIAL_PIN_CAPACITY = 256;
export const INITIAL_NET_CAPACITY = 128;
export const INITIAL_EVENT_CAPACITY = 256;

/** Growth factor used when a dynamic array needs to be resized. */
export const CAPACITY_GROWTH_FACTOR = 1.5;
