import { GateId, NetId, PinId, asGateId, asPinId } from './types';

export class CircuitTopology {
  /** Length = netCount + 1. CSR offsets into `netDriverPins`. */
  netDriverOffsets: Int32Array;
  /** Flat list of driver PinIds, grouped by net per `netDriverOffsets`. */
  netDriverPins: Int32Array;

  /** Length = netCount + 1. CSR offsets into `netFanoutGates`. */
  netFanoutOffsets: Int32Array;
  /** Flat list of fanout GateIds (deduplicated per net), grouped by net per `netFanoutOffsets`. */
  netFanoutGates: Int32Array;

  readonly netCount: number;

  constructor(params: {
    netCount: number;
    netDriverOffsets: Int32Array;
    netDriverPins: Int32Array;
    netFanoutOffsets: Int32Array;
    netFanoutGates: Int32Array;
  }) {
    this.netCount = params.netCount;
    this.netDriverOffsets = params.netDriverOffsets;
    this.netDriverPins = params.netDriverPins;
    this.netFanoutOffsets = params.netFanoutOffsets;
    this.netFanoutGates = params.netFanoutGates;
  }

  /** Number of active driver pins connected to a net. */
  driverCount(net: NetId): number {
    return this.netDriverOffsets[net + 1] - this.netDriverOffsets[net];
  }

  /** Iterates the driver PinIds of a net without allocating an array. */
  *driverPins(net: NetId): IterableIterator<PinId> {
    const start = this.netDriverOffsets[net];
    const end = this.netDriverOffsets[net + 1];
    for (let i = start; i < end; i++) {
      yield asPinId(this.netDriverPins[i]);
    }
  }

  /** Number of distinct gates that must be re-evaluated when a net changes. */
  fanoutCount(net: NetId): number {
    return this.netFanoutOffsets[net + 1] - this.netFanoutOffsets[net];
  }

  /** Iterates the fanout GateIds of a net without allocating an array. */
  *fanoutGates(net: NetId): IterableIterator<GateId> {
    const start = this.netFanoutOffsets[net];
    const end = this.netFanoutOffsets[net + 1];
    for (let i = start; i < end; i++) {
      yield asGateId(this.netFanoutGates[i]);
    }
  }
}
