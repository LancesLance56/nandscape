import { CircuitData, DFF_PIN_CLOCK, DFF_PIN_DATA, DFF_PIN_Q, DFF_PIN_QN, DFF_PIN_RESET, DFF_PIN_SET, DLATCH_PIN_DATA, DLATCH_PIN_ENABLE, DLATCH_PIN_Q, DLATCH_PIN_QN, SOURCE_PIN_OUTPUT, SRLATCH_PIN_Q, SRLATCH_PIN_QN, SRLATCH_PIN_R, SRLATCH_PIN_S, JK_PIN_J, JK_PIN_K, JK_PIN_CLOCK, JK_PIN_RESET, JK_PIN_SET, JK_PIN_Q, JK_PIN_QN, T_PIN_T, T_PIN_CLOCK, T_PIN_RESET, T_PIN_SET, T_PIN_Q, T_PIN_QN, COUNTER_PIN_CLOCK, COUNTER_PIN_RESET, COUNTER_PIN_Q0 } from '../data';
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
  evaluateBuffer,
  evaluateCombinationalGate,
  evaluateCounter,
  evaluateDecoder,
  evaluateDemultiplexer,
  evaluateDFlipFlop,
  evaluateDLatch,
  evaluateJkFlipFlop,
  evaluateMultiplexer,
  evaluateNot,
  evaluatePriorityEncoder,
  evaluateSrLatch,
  evaluateTFlipFlop,
  evaluateTristateBuffer,
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
export type StopReason =
  | 'QUEUE_EMPTY'
  | 'MAX_EVENTS'
  | 'MAX_TIME'
  | 'TARGET_TIME_REACHED'
  | 'FREE_RUNNING_SOURCE_PENDING';

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
   * is hit,  whichever comes first.
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

  /**
   * Like run(), but won't let a free-running source (currently only CLOCK)
   * advance past its already-established value: any pending event owned by
   * a CLOCK gate at a time > 0 is left on the queue instead of consumed.
   *
   * This exists for driving inputs outside of an active Play session (right
   * after compiling, or while paused). Without it, callers used run() with a
   * fixed lookahead window to let combinational logic settle,  but that
   * window also silently let a CLOCK gate's next self-scheduled toggle fire
   * (see the CLOCK case in processBatch), so a clocked circuit would advance
   * a cycle every time an unrelated switch was toggled while "paused". A
   * CLOCK's very first event (its seed at time 0) is still processed, since
   * that establishes the initial value rather than advancing time.
   *
   * Stops as soon as the earliest pending time contains a deferred CLOCK
   * event,  looping past it would just defer the same event forever.
   */
  settleCombinational(): StopReason {
    for (;;) {
      if (this.queue.isEmpty) return 'QUEUE_EMPTY';
      if (this.state.eventsProcessed >= this.maxEvents) return 'MAX_EVENTS';

      const next = this.queue.peek()!;
      if (next.time > this.maxTime) return 'MAX_TIME';

      const batch = this.queue.popBatchAtEarliestTime();
      const runnable: ScheduledEvent[] = [];
      let deferredFreeRunningSource = false;

      for (const event of batch) {
        const ownerGate = this.circuit.pinOwnerGate.get(event.pinId) as GateId;
        const isFreeRunningTick =
          event.time > 0 && (this.circuit.gateType.get(ownerGate) as GateType) === GateType.CLOCK;

        if (isFreeRunningTick) {
          this.queue.push(event.time, event.pinId, event.value, event.generation);
          deferredFreeRunningSource = true;
        } else {
          runnable.push(event);
        }
      }

      if (runnable.length > 0) this.processBatch(runnable);
      if (deferredFreeRunningSource) return 'FREE_RUNNING_SOURCE_PENDING';
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
        case GateType.JK_FLIP_FLOP: {
          this.scheduleExternal(circuit.pinOf(gate, JK_PIN_Q), SignalState.UNKNOWN, 0);
          this.scheduleExternal(circuit.pinOf(gate, JK_PIN_QN), SignalState.UNKNOWN, 0);
          break;
        }
        case GateType.T_FLIP_FLOP: {
          this.scheduleExternal(circuit.pinOf(gate, T_PIN_Q), SignalState.UNKNOWN, 0);
          this.scheduleExternal(circuit.pinOf(gate, T_PIN_QN), SignalState.UNKNOWN, 0);
          break;
        }
        case GateType.COUNTER: {
          // Unlike a flip-flop's Q (genuinely arbitrary until first
          // written), a fresh counter seeds to 0,  see evaluateCounter's
          // doc comment for why FLOAT/UNKNOWN-until-reset would make it
          // unusable out of the box.
          const bitWidth = circuit.gateParamA.get(g);
          for (let i = 0; i < bitWidth; i++) {
            this.scheduleExternal(circuit.pinOf(gate, COUNTER_PIN_Q0 + i), SignalState.LOW, 0);
          }
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

  /** Schedules a drive event only if it differs from what the pin is currently driving,  prevents redundant event storms during internal propagation/settling. */
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
        const value = evaluateCombinationalGate(type, inputs);
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

      case GateType.MULTIPLEXER: {
        const n = circuit.gateParamA.get(gate);
        const dataLines = 1 << n;
        const select = pins.slice(0, n).map((p) => this.netStateOfPin(p));
        const data = pins.slice(n, n + dataLines).map((p) => this.netStateOfPin(p));
        const outputPin = pins[n + dataLines];
        return [{ pin: outputPin, value: evaluateMultiplexer(select, data) }];
      }

      case GateType.DEMULTIPLEXER: {
        const n = circuit.gateParamA.get(gate);
        const outputs = 1 << n;
        const data = this.netStateOfPin(pins[0]);
        const select = pins.slice(1, 1 + n).map((p) => this.netStateOfPin(p));
        const outputPins = pins.slice(1 + n, 1 + n + outputs);
        const values = evaluateDemultiplexer(select, data, outputs);
        return outputPins.map((pin, i) => ({ pin, value: values[i] }));
      }

      case GateType.DECODER: {
        const n = circuit.gateParamA.get(gate);
        const outputs = 1 << n;
        const address = pins.slice(0, n).map((p) => this.netStateOfPin(p));
        const outputPins = pins.slice(n, n + outputs);
        const values = evaluateDecoder(address, outputs);
        return outputPins.map((pin, i) => ({ pin, value: values[i] }));
      }

      case GateType.PRIORITY_ENCODER: {
        const n = circuit.gateParamA.get(gate);
        const inputCount = 1 << n;
        const data = pins.slice(0, inputCount).map((p) => this.netStateOfPin(p));
        const outputPins = pins.slice(inputCount); // n address bits + VALID
        const values = evaluatePriorityEncoder(data, n);
        return outputPins.map((pin, i) => ({ pin, value: values[i] }));
      }

      case GateType.COUNTER: {
        const n = circuit.gateParamA.get(gate);
        const clockPin = circuit.pinOf(gate, COUNTER_PIN_CLOCK);
        const resetPin = circuit.pinOf(gate, COUNTER_PIN_RESET);

        const previousClock = this.previousNetStateOfPin(clockPin, previousNetStates);
        const currentClock = this.netStateOfPin(clockPin);
        const configuredEdge = circuit.gateParamB.get(gate) as EdgeType;
        const edgeOccurred = didClockEdgeOccur(previousClock, currentClock, configuredEdge);

        const qPins = Array.from({ length: n }, (_, i) => circuit.pinOf(gate, COUNTER_PIN_Q0 + i));
        const previousBits = qPins.map((p) => this.state.getPinDriveState(p));

        const result = evaluateCounter({
          reset: this.netStateOfPin(resetPin),
          clockEdgeOccurred: edgeOccurred,
          previousBits,
        });
        return qPins.map((pin, i) => ({ pin, value: result[i] }));
      }

      case GateType.JK_FLIP_FLOP: {
        const jPin = circuit.pinOf(gate, JK_PIN_J);
        const kPin = circuit.pinOf(gate, JK_PIN_K);
        const clockPin = circuit.pinOf(gate, JK_PIN_CLOCK);
        const resetPin = circuit.pinOf(gate, JK_PIN_RESET);
        const setPin = circuit.pinOf(gate, JK_PIN_SET);
        const qPin = circuit.pinOf(gate, JK_PIN_Q);
        const qnPin = circuit.pinOf(gate, JK_PIN_QN);

        const previousClock = this.previousNetStateOfPin(clockPin, previousNetStates);
        const currentClock = this.netStateOfPin(clockPin);
        const configuredEdge = circuit.gateParamA.get(gate) as EdgeType;
        const edgeOccurred = didClockEdgeOccur(previousClock, currentClock, configuredEdge);
        const previousQ = this.state.getPinDriveState(qPin);

        const result = evaluateJkFlipFlop({
          j: this.netStateOfPin(jPin),
          k: this.netStateOfPin(kPin),
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

      case GateType.T_FLIP_FLOP: {
        const tPin = circuit.pinOf(gate, T_PIN_T);
        const clockPin = circuit.pinOf(gate, T_PIN_CLOCK);
        const resetPin = circuit.pinOf(gate, T_PIN_RESET);
        const setPin = circuit.pinOf(gate, T_PIN_SET);
        const qPin = circuit.pinOf(gate, T_PIN_Q);
        const qnPin = circuit.pinOf(gate, T_PIN_QN);

        const previousClock = this.previousNetStateOfPin(clockPin, previousNetStates);
        const currentClock = this.netStateOfPin(clockPin);
        const configuredEdge = circuit.gateParamA.get(gate) as EdgeType;
        const edgeOccurred = didClockEdgeOccur(previousClock, currentClock, configuredEdge);
        const previousQ = this.state.getPinDriveState(qPin);

        const result = evaluateTFlipFlop({
          t: this.netStateOfPin(tPin),
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

      case GateType.INPUT_PIN:
      case GateType.OUTPUT_PIN:
      case GateType.CONSTANT:
      case GateType.CLOCK:
        return [];

      default:
        throw new Error(`evaluateGate: unhandled GateType ${type}`);
    }
  }
}
