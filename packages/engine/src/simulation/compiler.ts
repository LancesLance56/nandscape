import { CircuitData } from '../data/circuit';
import { CircuitTopology } from '../data/topology';
import { GateId, INVALID_ID, NetId, PinDirection, PinId } from '../data/types';

export interface ValidationIssue {
  message: string;
  pin?: PinId;
  gate?: GateId;
  net?: NetId;
}

/**
 * Checks structural well-formedness of a circuit before it is compiled.
 * Does NOT check simulate-ability (e.g. combinational feedback loops are
 * legal circuits — SR latches rely on them — so they're not flagged here).
 */
export function validateCircuit(circuit: CircuitData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (let p = 0; p < circuit.pinCount; p++) {
    if (circuit.pinNet.get(p) === INVALID_ID) {
      issues.push({
        message: `Pin ${p} (gate ${circuit.pinOwnerGate.get(p)}, role ${circuit.pinRole.get(p)}) is not connected to any net`,
        pin: p as PinId,
        gate: circuit.pinOwnerGate.get(p) as GateId,
      });
    }
  }

  // A net with zero connected pins entirely is almost certainly a mistake
  // (an allocated-but-unused net) — flag it so it's caught before it
  // silently disappears from simulation.
  const connectionCounts = new Int32Array(circuit.netCount);
  for (let p = 0; p < circuit.pinCount; p++) {
    const net = circuit.pinNet.get(p);
    if (net !== INVALID_ID) connectionCounts[net]++;
  }
  for (let n = 0; n < circuit.netCount; n++) {
    if (connectionCounts[n] === 0 && !circuit.isNetAbsorbed(n as NetId)) {
      issues.push({ message: `Net ${n} has no pins connected to it`, net: n as NetId });
    }
  }

  return issues;
}

/**
 * Compiles a CircuitData netlist into a CircuitTopology. Throws if the
 * circuit has structural issues (see validateCircuit) — callers who want to
 * inspect issues without throwing should call validateCircuit() themselves
 * first.
 */
export function compileTopology(circuit: CircuitData): CircuitTopology {
  const issues = validateCircuit(circuit);
  if (issues.length > 0) {
    const summary = issues.map((i) => ` - ${i.message}`).join('\n');
    throw new Error(`compileTopology: circuit failed validation:\n${summary}`);
  }

  const netCount = circuit.netCount;

  // Per-net driver pin lists, collected in ascending pin-id order for
  // deterministic output.
  const driverListsByNet: PinId[][] = Array.from({ length: netCount }, () => []);
  // Per-net fanout gate sets (deduplicated), preserving first-seen order.
  const fanoutSetsByNet: Set<GateId>[] = Array.from({ length: netCount }, () => new Set());

  for (let p = 0; p < circuit.pinCount; p++) {
    const net = circuit.pinNet.get(p) as NetId;
    const direction = circuit.pinDirection.get(p) as PinDirection;
    const owner = circuit.pinOwnerGate.get(p) as GateId;

    if (direction === PinDirection.OUTPUT || direction === PinDirection.INOUT) {
      driverListsByNet[net].push(p as PinId);
    }
    if (direction === PinDirection.INPUT || direction === PinDirection.INOUT) {
      fanoutSetsByNet[net].add(owner);
    }
  }

  // Flatten driver lists into CSR.
  const netDriverOffsets = new Int32Array(netCount + 1);
  let driverTotal = 0;
  for (let n = 0; n < netCount; n++) {
    netDriverOffsets[n] = driverTotal;
    driverTotal += driverListsByNet[n].length;
  }
  netDriverOffsets[netCount] = driverTotal;

  const netDriverPins = new Int32Array(driverTotal);
  for (let n = 0; n < netCount; n++) {
    const base = netDriverOffsets[n];
    const pins = driverListsByNet[n];
    for (let i = 0; i < pins.length; i++) {
      netDriverPins[base + i] = pins[i];
    }
  }

  // Flatten fanout sets into CSR.
  const netFanoutOffsets = new Int32Array(netCount + 1);
  let fanoutTotal = 0;
  for (let n = 0; n < netCount; n++) {
    netFanoutOffsets[n] = fanoutTotal;
    fanoutTotal += fanoutSetsByNet[n].size;
  }
  netFanoutOffsets[netCount] = fanoutTotal;

  const netFanoutGates = new Int32Array(fanoutTotal);
  for (let n = 0; n < netCount; n++) {
    const base = netFanoutOffsets[n];
    let i = 0;
    for (const gateId of fanoutSetsByNet[n]) {
      netFanoutGates[base + i] = gateId;
      i++;
    }
  }

  return new CircuitTopology({
    netCount,
    netDriverOffsets,
    netDriverPins,
    netFanoutOffsets,
    netFanoutGates,
  });
}
