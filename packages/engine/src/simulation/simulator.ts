import { CircuitData, DFF_PIN_CLOCK, DFF_PIN_DATA, DFF_PIN_Q, DFF_PIN_QN, DFF_PIN_RESET, DFF_PIN_SET, DLATCH_PIN_DATA, DLATCH_PIN_ENABLE, DLATCH_PIN_Q, DLATCH_PIN_QN, SOURCE_PIN_OUTPUT, SRLATCH_PIN_Q, SRLATCH_PIN_QN, SRLATCH_PIN_R, SRLATCH_PIN_S } from '../data';
import { CircuitTopology } from '../data';
import { EventQueue, ScheduledEvent } from '../data';
import { RuntimeState } from '../data';
import {
  DEFAULT_MAX_EVENTS,
  DEFAULT_MAX_TIME,
} from '../data';
import {
  EdgeType,
  GateId,
  GateType,
  NetId,
  PinId,
  SignalState,
  SimTime,
} from '../data';
import { SrLatchKind } from '../data';
import {
  didClockEdgeOccur,
  evaluateAnd,
  evaluateBuffer,
  evaluateDFlipFlop,
  evaluateDLatch,
  evaluateNand,
  evaluateNor,
  evaluateNot,
  evaluateOr,
  evaluateSrLatch,
  evaluateTristateBuffer,
  evaluateXnor,
  evaluateXor,
  resolveNet,
} from './gate-evaluators';


// very complex

export interface SimulatorOptions {
  maxEvents?: number;
  maxTime?: SimTime;
}

const EXTERNAL_GENERATION = -1;

export interface SimulationStats {
  currentTime: SimTime;
  eventsProcessed: number;
  eventsDiscardedStale: number;
  netTransitions: number;
  deltaCycles: number;
  pendingEvents: number;
}

interface PinDriveTarget {
  pin: PinId;
  value: SignalState;
}

/** Reason a run() call stopped, useful for tests and diagnostics. */
export type StopReason = 'QUEUE_EMPTY' | 'MAX_EVENTS' | 'MAX_TIME' | 'TARGET_TIME_REACHED';

export class Simulator {
  readonly circuit: CircuitData;
  readonly topology: CircuitTopology;

  state: RuntimeState;
  private queue: EventQueue;

  private readonly maxEvents: number;
  private readonly maxTime: SimTime;

  constructor(circuit: CircuitData, topology: CircuitTopology, options: SimulatorOptions = {}) {
    this.circuit = circuit;
    this.topology = topology;
    this.maxEvents = options.maxEvents ?? DEFAULT_MAX_EVENTS;
    this.maxTime = options.maxTime ?? DEFAULT_MAX_TIME;

    this.state = new RuntimeState(circuit.pinCount, circuit.netCount);
    this.queue = new EventQueue();
    this.seedInitialConditions();
  }

  /** Fully reinitializes the simulation (fresh RuntimeState + EventQueue), re-seeding sources. */
  reset(): void {
    this.state = new RuntimeState(this.circuit.pinCount, this.circuit.netCount);
    this.queue.clear();
    this.seedInitialConditions();
  }

  /**
   * Schedules an external stimulus on a circuit-level INPUT_PIN gate. This
   * is the primary way callers drive a simulation (testbenches, UIs, etc.).
   */
  setInput(gate: GateId, value: SignalState, atTime: SimTime = this.state.currentTime): void {
    const type = this.circuit.gateType.get(gate) as GateType;
    if (type !== GateType.INPUT_PIN) {
      throw new Error(
        `setInput: gate ${gate} is a ${GateType[type]}, not an INPUT_PIN`,
      );
    }
    const pin = this.circuit.pinOf(gate, SOURCE_PIN_OUTPUT);
    this.scheduleExternal(pin, value, atTime);
  }

  /** Reads the resolved state of the net connected to a circuit-level OUTPUT_PIN gate. */
  readOutput(gate: GateId): SignalState {
    const type = this.circuit.gateType.get(gate) as GateType;
    if (type !== GateType.OUTPUT_PIN) {
      throw new Error(`readOutput: gate ${gate} is a ${GateType[type]}, not an OUTPUT_PIN`);
    }
    const pin = this.circuit.pinOf(gate, 0);
    const net = this.circuit.pinNet.get(pin) as NetId;
    return this.state.getNetState(net);
  }

  /** Reads the resolved state of an arbitrary net directly. */
  probeNet(net: NetId): SignalState {
    return this.state.getNetState(net);
  }

  /** Processes exactly one delta cycle (all events at the earliest pending time). Returns the stop reason if it halted, or null if a batch was processed. */
  step(): { processed: boolean; stopReason: StopReason | null } {
    if (this.queue.isEmpty) {
      return { processed: false, stopReason: 'QUEUE_EMPTY' };
    }
    if (this.state.eventsProcessed >= this.maxEvents) {
      return { processed: false, stopReason: 'MAX_EVENTS' };
    }
    const next = this.queue.peek()!;
    if (next.time > this.maxTime) {
      return { processed: false, stopReason: 'MAX_TIME' };
    }

    const batch = this.queue.popBatchAtEarliestTime();
    this.processBatch(batch);
    return { processed: true, stopReason: null };
  }

  /**
   * Runs the simulation until the event queue drains, an explicit
   * `untilTime` is reached/exceeded, or a safety limit (maxEvents/maxTime)
   * is hit — whichever comes first.
   */
  run(untilTime?: SimTime): StopReason {
    for (;;) {
      if (this.queue.isEmpty) return 'QUEUE_EMPTY';
      if (this.state.eventsProcessed >= this.maxEvents) return 'MAX_EVENTS';

      const next = this.queue.peek()!;
      if (untilTime !== undefined && next.time > untilTime) return 'TARGET_TIME_REACHED';
      if (next.time > this.maxTime) return 'MAX_TIME';

      const batch = this.queue.popBatchAtEarliestTime();
      this.processBatch(batch);
    }
  }
  stats(): SimulationStats {
    return {
      currentTime: this.state.currentTime,
      eventsProcessed: this.state.eventsProcessed,
      eventsDiscardedStale: this.state.eventsDiscardedStale,
      netTransitions: this.state.netTransitions,
      deltaCycles: this.state.deltaCycles,
      pendingEvents: this.queue.size,
    };
  }

  // ---------------------------------------------------------------------------
  // Initial condition seeding
  // ---------------------------------------------------------------------------

  private seedInitialConditions(): void {
    const { circuit } = this;
    for (let g = 0; g < circuit.gateCount; g++) {
      const type = circuit.gateType.get(g) as GateType;
      const gate = g as GateId;

      switch (type) {
        case GateType.CONSTANT: {
          const pin = circuit.pinOf(gate, SOURCE_PIN_OUTPUT);
          const value = circuit.gateParamA.get(g) as SignalState;
          this.scheduleExternal(pin, value, 0);
          break;
        }
        case GateType.CLOCK: {
          const pin = circuit.pinOf(gate, SOURCE_PIN_OUTPUT);
          const initialValue = circuit.gateParamB.get(g) as SignalState;
          this.scheduleExternal(pin, initialValue, 0);
          break;
        }
        case GateType.D_LATCH: {
          this.scheduleExternal(circuit.pinOf(gate, DLATCH_PIN_Q), SignalState.UNKNOWN, 0);
          this.scheduleExternal(circuit.pinOf(gate, DLATCH_PIN_QN), SignalState.UNKNOWN, 0);
          break;
        }
        case GateType.FLIP_FLOP: {
          this.scheduleExternal(circuit.pinOf(gate, DFF_PIN_Q), SignalState.UNKNOWN, 0);
          this.scheduleExternal(circuit.pinOf(gate, DFF_PIN_QN), SignalState.UNKNOWN, 0);
          break;
        }
        case GateType.SR_LATCH: {
          this.scheduleExternal(circuit.pinOf(gate, SRLATCH_PIN_Q), SignalState.UNKNOWN, 0);
          this.scheduleExternal(circuit.pinOf(gate, SRLATCH_PIN_QN), SignalState.UNKNOWN, 0);
          break;
        }
        default:
          break; // INPUT_PIN starts FLOAT until setInput(); combinational gates settle via propagation.
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Scheduling helpers
  // ---------------------------------------------------------------------------

  /** Unconditionally schedules a drive event (used for external stimuli, sources, and initial seeding). */
  private scheduleDrive(pin: PinId, value: SignalState, time: SimTime): void {
    const generation = this.state.bumpGeneration(pin);
    this.queue.push(time, pin, value, generation);
  }

  private scheduleExternal(pin: PinId, value: SignalState, time: SimTime): void {
    this.queue.push(time, pin, value, EXTERNAL_GENERATION);
  }

  /** Schedules a drive event only if it differs from what the pin is currently driving — prevents redundant event storms during internal propagation/settling. */
  private scheduleIfDifferent(pin: PinId, value: SignalState, time: SimTime): void {
    if (this.state.getPinDriveState(pin) === value) return;
    this.scheduleDrive(pin, value, time);
  }

  private processBatch(batch: ScheduledEvent[]): void {
    const { circuit, topology, state } = this;
    const batchTime = batch[0].time;
    state.currentTime = batchTime;
    state.deltaCycles++;

    const touchedNets = new Set<NetId>();
    const previousNetStates = new Map<NetId, SignalState>();

    // Step 2: apply events, discarding stale ones.
    for (const event of batch) {
      state.eventsProcessed++;
      const isExternal = event.generation === EXTERNAL_GENERATION;
      if (!isExternal && event.generation !== state.currentGeneration(event.pinId)) {
        state.eventsDiscardedStale++;
        continue; // superseded by a later internally-derived scheduling for this pin
      }

      state.setPinDriveState(event.pinId, event.value);

      // Special case: a CLOCK source's pin re-schedules its own next toggle.
      const ownerGate = circuit.pinOwnerGate.get(event.pinId) as GateId;
      if ((circuit.gateType.get(ownerGate) as GateType) === GateType.CLOCK) {
        const halfPeriod = circuit.gateParamA.get(ownerGate);
        const next: SignalState = event.value === SignalState.HIGH ? SignalState.LOW : SignalState.HIGH;
        this.scheduleExternal(event.pinId, next, batchTime + Math.max(1, halfPeriod));
      }

      const net = circuit.pinNet.get(event.pinId) as NetId;
      if (net !== -1) touchedNets.add(net);
    }

    // Step 3: re-resolve every touched net; track which ones actually changed.
    const changedNets: NetId[] = [];
    for (const net of touchedNets) {
      const before = state.getNetState(net);
      const driverStates: SignalState[] = [];
      for (const pin of topology.driverPins(net)) {
        driverStates.push(state.getPinDriveState(pin));
      }
      const resolution = resolveNet(driverStates);

      if (resolution.state !== before) {
        previousNetStates.set(net, before);
        state.setNetState(net, resolution.state, resolution.kind);
        state.netTransitions++;
        changedNets.push(net);
      } else {
        // Value unchanged, but resolution "kind" (e.g. SINGLE_DRIVER -> AGREEMENT)
        // may still be worth recording for diagnostics.
        state.setNetState(net, resolution.state, resolution.kind);
      }
    }

    if (changedNets.length === 0) return;

    // Step 4: union of fanout gates across all changed nets, deduplicated.
    const gatesToEvaluate = new Set<GateId>();
    for (const net of changedNets) {
      for (const gate of topology.fanoutGates(net)) {
        gatesToEvaluate.add(gate);
      }
    }

    // Step 5: evaluate each affected gate once, schedule output changes.
    for (const gate of gatesToEvaluate) {
      const delay = Math.max(1, circuit.gateDelay.get(gate));
      const targets = this.evaluateGate(gate, previousNetStates);
      for (const target of targets) {
        this.scheduleIfDifferent(target.pin, target.value, batchTime + delay);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Gate evaluation dispatch
  // ---------------------------------------------------------------------------

  private netStateOfPin(pin: PinId): SignalState {
    const net = this.circuit.pinNet.get(pin) as NetId;
    return this.state.getNetState(net);
  }

  private previousNetStateOfPin(pin: PinId, previousNetStates: Map<NetId, SignalState>): SignalState {
    const net = this.circuit.pinNet.get(pin) as NetId;
    return previousNetStates.get(net) ?? this.state.getNetState(net);
  }

  private evaluateGate(gate: GateId, previousNetStates: Map<NetId, SignalState>): PinDriveTarget[] {
    const { circuit } = this;
    const type = circuit.gateType.get(gate) as GateType;
    const pins = circuit.getGatePins(gate);

    switch (type) {
      case GateType.NAND:
      case GateType.AND:
      case GateType.OR:
      case GateType.NOR:
      case GateType.XOR:
      case GateType.XNOR: {
        const outputPin = pins[pins.length - 1];
        const inputs = pins.slice(0, -1).map((p) => this.netStateOfPin(p));
        const value = this.evaluateNAry(type, inputs);
        return [{ pin: outputPin, value }];
      }

      case GateType.NOT: {
        const [inputPin, outputPin] = pins;
        return [{ pin: outputPin, value: evaluateNot(this.netStateOfPin(inputPin)) }];
      }

      case GateType.BUFFER: {
        const [inputPin, outputPin] = pins;
        return [{ pin: outputPin, value: evaluateBuffer(this.netStateOfPin(inputPin)) }];
      }

      case GateType.TRISTATE_BUFFER: {
        const [dataPin, enablePin, outputPin] = pins;
        const value = evaluateTristateBuffer(
          this.netStateOfPin(dataPin),
          this.netStateOfPin(enablePin),
        );
        return [{ pin: outputPin, value }];
      }

      case GateType.D_LATCH: {
        const dataPin = circuit.pinOf(gate, DLATCH_PIN_DATA);
        const enablePin = circuit.pinOf(gate, DLATCH_PIN_ENABLE);
        const qPin = circuit.pinOf(gate, DLATCH_PIN_Q);
        const qnPin = circuit.pinOf(gate, DLATCH_PIN_QN);
        const previousQ = this.state.getPinDriveState(qPin);

        const result = evaluateDLatch(
          this.netStateOfPin(dataPin),
          this.netStateOfPin(enablePin),
          previousQ,
        );
        return [
          { pin: qPin, value: result.q },
          { pin: qnPin, value: result.qn },
        ];
      }

      case GateType.FLIP_FLOP: {
        const dataPin = circuit.pinOf(gate, DFF_PIN_DATA);
        const clockPin = circuit.pinOf(gate, DFF_PIN_CLOCK);
        const resetPin = circuit.pinOf(gate, DFF_PIN_RESET);
        const setPin = circuit.pinOf(gate, DFF_PIN_SET);
        const qPin = circuit.pinOf(gate, DFF_PIN_Q);
        const qnPin = circuit.pinOf(gate, DFF_PIN_QN);

        const previousClock = this.previousNetStateOfPin(clockPin, previousNetStates);
        const currentClock = this.netStateOfPin(clockPin);
        const configuredEdge = circuit.gateParamA.get(gate) as EdgeType;
        const edgeOccurred = didClockEdgeOccur(previousClock, currentClock, configuredEdge);
        const previousQ = this.state.getPinDriveState(qPin);

        const result = evaluateDFlipFlop({
          data: this.netStateOfPin(dataPin),
          reset: this.netStateOfPin(resetPin),
          set: this.netStateOfPin(setPin),
          clockEdgeOccurred: edgeOccurred,
          previousQ,
        });
        return [
          { pin: qPin, value: result.q },
          { pin: qnPin, value: result.qn },
        ];
      }

      case GateType.SR_LATCH: {
        const sPin = circuit.pinOf(gate, SRLATCH_PIN_S);
        const rPin = circuit.pinOf(gate, SRLATCH_PIN_R);
        const qPin = circuit.pinOf(gate, SRLATCH_PIN_Q);
        const qnPin = circuit.pinOf(gate, SRLATCH_PIN_QN);
        const previousQ = this.state.getPinDriveState(qPin);
        const kind = circuit.gateParamA.get(gate) as SrLatchKind;

        const result = evaluateSrLatch({
          s: this.netStateOfPin(sPin),
          r: this.netStateOfPin(rPin),
          kind,
          previousQ,
        });
        return [
          { pin: qPin, value: result.q },
          { pin: qnPin, value: result.qn },
        ];
      }

      case GateType.INPUT_PIN:
      case GateType.OUTPUT_PIN:
      case GateType.CONSTANT:
      case GateType.CLOCK:
        return [];

      default:
        throw new Error(`evaluateGate: unhandled GateType ${type}`);
    }
  }

  private evaluateNAry(type: GateType, inputs: SignalState[]): SignalState {
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
      default:
        throw new Error(`evaluateNAry: unhandled GateType ${type}`);
    }
  }
}
