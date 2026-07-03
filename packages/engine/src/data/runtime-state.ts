import { NetId, NetResolutionKind, PinId, SignalState, SimTime, TIME_ZERO } from './types';

export class RuntimeState {
  currentTime: SimTime = TIME_ZERO;

  pinDriveState: Int32Array;
  pinGeneration: Int32Array;

  netResolvedState: Int32Array;
  netResolutionKind: Int32Array;

  // --- Statistics -------------------------------------------------------------
  eventsProcessed = 0;
  eventsDiscardedStale = 0;
  netTransitions = 0;
  deltaCycles = 0;

  constructor(pinCount: number, netCount: number) {
    this.pinDriveState = new Int32Array(pinCount).fill(SignalState.FLOAT);
    this.pinGeneration = new Int32Array(pinCount).fill(0);
    this.netResolvedState = new Int32Array(netCount).fill(SignalState.FLOAT);
    this.netResolutionKind = new Int32Array(netCount).fill(NetResolutionKind.UNDRIVEN);
  }

  getPinDriveState(pin: PinId): SignalState {
    return this.pinDriveState[pin] as SignalState;
  }

  setPinDriveState(pin: PinId, value: SignalState): void {
    this.pinDriveState[pin] = value;
  }

  getNetState(net: NetId): SignalState {
    return this.netResolvedState[net] as SignalState;
  }

  setNetState(net: NetId, value: SignalState, kind: NetResolutionKind): void {
    this.netResolvedState[net] = value;
    this.netResolutionKind[net] = kind;
  }

  /** Bumps and returns the new generation counter for a pin (call when scheduling a new event for it). */
  bumpGeneration(pin: PinId): number {
    this.pinGeneration[pin] += 1;
    return this.pinGeneration[pin];
  }

  currentGeneration(pin: PinId): number {
    return this.pinGeneration[pin];
  }

  /** Human-readable snapshot of all net states — for debugging/tests, not used by the hot path. */
  snapshotNets(): SignalState[] {
    return Array.from(this.netResolvedState) as SignalState[];
  }
}
