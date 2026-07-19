import { CircuitData, SINK_PIN_INPUT, SOURCE_PIN_OUTPUT } from '../data';
import { GateId, GateType, INVALID_ID, NetId, PinDirection } from '../data';
import { validateCircuit } from './compiler';
import { SinkHandle, SourceHandle } from './builder';

export interface SubcircuitPorts {
  inputs: Record<string, SourceHandle>;
  outputs: Record<string, SinkHandle>;
}

export interface SubcircuitDefinition {
  readonly name: string;
  readonly circuit: CircuitData;
  readonly inputs: ReadonlyMap<string, GateId>;
  readonly outputs: ReadonlyMap<string, GateId>;
}

export interface SubcircuitInstance {
  readonly inputs: Readonly<Record<string, NetId>>;
  readonly outputs: Readonly<Record<string, NetId>>;
}

export function defineSubcircuit(
  name: string,
  build: (circuit: CircuitData) => SubcircuitPorts,
): SubcircuitDefinition {
  const circuit = new CircuitData();
  const { inputs: inputHandles, outputs: outputHandles } = build(circuit);

  const inputs = new Map<string, GateId>();
  for (const [port, handle] of Object.entries(inputHandles)) {
    if ((circuit.gateType.get(handle.gate) as GateType) !== GateType.INPUT_PIN) {
      throw new Error(`defineSubcircuit(${name}): input port "${port}" is not an INPUT_PIN gate`);
    }
    inputs.set(port, handle.gate);
  }

  const outputs = new Map<string, GateId>();
  for (const [port, handle] of Object.entries(outputHandles)) {
    if ((circuit.gateType.get(handle.gate) as GateType) !== GateType.OUTPUT_PIN) {
      throw new Error(`defineSubcircuit(${name}): output port "${port}" is not an OUTPUT_PIN gate`);
    }
    outputs.set(port, handle.gate);
  }

  if (inputs.size === 0 && outputs.size === 0) {
    throw new Error(`defineSubcircuit(${name}): a subcircuit needs at least one input or output port`);
  }

  const issues = validateCircuit(circuit);
  if (issues.length > 0) {
    const summary = issues.map((i) => ` - ${i.message}`).join('\n');
    throw new Error(`defineSubcircuit(${name}): definition failed validation:\n${summary}`);
  }

  return { name, circuit, inputs, outputs };
}

export function instantiateSubcircuit(
  circuit: CircuitData,
  definition: SubcircuitDefinition,
  instanceName?: string,
): SubcircuitInstance {
  const def = definition.circuit;
  const prefix = instanceName ?? definition.name;

  const netIdMap: NetId[] = new Array(def.netCount);
  for (let n = 0; n < def.netCount; n++) {
    const newNet = circuit.addNet(qualify(prefix, def.netName[n]));
    netIdMap[n] = newNet;
    if (def.isNetAbsorbed(n as NetId)) circuit.markNetAbsorbed(newNet);
  }

  for (let g = 0; g < def.gateCount; g++) {
    const type = def.gateType.get(g) as GateType;
    if (type === GateType.INPUT_PIN || type === GateType.OUTPUT_PIN) continue;

    const pinCount = def.gatePinCount.get(g);
    const pinStart = def.gatePinStart.get(g);
    const directions: PinDirection[] = new Array(pinCount);
    for (let i = 0; i < pinCount; i++) directions[i] = def.pinDirection.get(pinStart + i);

    const newGate = circuit.addGate({
      type,
      pinDirections: directions,
      delay: def.gateDelay.get(g),
      paramA: def.gateParamA.get(g),
      paramB: def.gateParamB.get(g),
      name: qualify(prefix, def.gateName[g]),
    });

    for (let i = 0; i < pinCount; i++) {
      const localNet = def.pinNet.get(pinStart + i);
      if (localNet === INVALID_ID) continue;
      circuit.connect(circuit.pinOf(newGate, i), netIdMap[localNet]);
    }
  }

  const inputs: Record<string, NetId> = {};
  for (const [port, gate] of definition.inputs) {
    const localNet = def.pinNet.get(def.pinOf(gate, SOURCE_PIN_OUTPUT));
    inputs[port] = netIdMap[localNet];
  }

  const outputs: Record<string, NetId> = {};
  for (const [port, gate] of definition.outputs) {
    const localNet = def.pinNet.get(def.pinOf(gate, SINK_PIN_INPUT));
    outputs[port] = netIdMap[localNet];
  }

  return { inputs, outputs };
}

function qualify(prefix: string, base: string | undefined): string | undefined {
  return base ? `${prefix}.${base}` : undefined;
}
