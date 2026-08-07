import {
  CircuitData,
  GateType,
  SignalState,
  SOURCE_PIN_OUTPUT,
  SINK_PIN_INPUT,
  compileTopology,
  validateCircuit,
  type GateId,
  type PinId,
  type NetId,
  type CircuitTopology,
} from "@nandscape/engine";
import { defaultInputCountForGateType, isVariableArityGate } from "@/lib/editor/gate-defaults";
import type {
  EditorNode,
  EditorEdge,
  GateNodeData,
  ConstantNodeData,
  ClockNodeData,
} from "@/types/editor";

export interface CompiledCircuit {
  circuit: CircuitData;
  topology: CircuitTopology;
  gateByNodeId: Map<string, GateId>;
  netByEdgeId: Map<string, NetId>;
}

export type CompileResult =
  | { ok: true; result: CompiledCircuit }
  | { ok: false; issues: string[] };

interface NodeInfo {
  gateId: GateId;
  inputCount: number;
}

function handleRole(handle: string | null | undefined, fallback: number): number {
  const match = handle ? /(?:in|out)-(\d+)/.exec(handle) : null;
  return match ? Number(match[1]) : fallback;
}

function resolvePin(
  circuit: CircuitData,
  info: NodeInfo,
  node: EditorNode,
  handle: string | null | undefined,
  side: "source" | "target",
): PinId {
  switch (node.data.kind) {
    case "input":
      return circuit.pinOf(info.gateId, SOURCE_PIN_OUTPUT);
    case "output":
      return circuit.pinOf(info.gateId, SINK_PIN_INPUT);
    case "constant":
    case "clock":
      return circuit.pinOf(info.gateId, SOURCE_PIN_OUTPUT);
    case "gate": {
      if (side === "source") {
        // Outputs start right after the inputs: roles 0..inputCount-1 are
        // inputs, role inputCount (+ handle index, for Q/QN) is the output.
        const outIndex = handleRole(handle, 0);
        return circuit.pinOf(info.gateId, info.inputCount + outIndex);
      }
      const inIndex = handleRole(handle, 0);
      return circuit.pinOf(info.gateId, inIndex);
    }
    default:
      throw new Error(`resolvePin: unsupported node kind "${node.data.kind}"`);
  }
}

export function compileEditorGraph(nodes: EditorNode[], edges: EditorEdge[]): CompileResult {
  const subcircuitNode = nodes.find((n) => n.data.kind === "subcircuit");
  if (subcircuitNode) {
    return {
      ok: false,
      issues: ["Subcircuit blocks aren't supported by live simulation yet,  flatten or remove them to run this circuit."],
    };
  }

  const circuit = new CircuitData();
  const gateByNodeId = new Map<string, GateId>();
  const infoByNodeId = new Map<string, NodeInfo>();
  const nodeIdByGateId = new Map<GateId, string>();

  for (const node of nodes) {
    if (node.data.kind === "note") continue;

    let gateId: GateId;
    let inputCount = 0;

    switch (node.data.kind) {
      case "input":
        gateId = circuit.addGate({ type: GateType.INPUT_PIN, name: node.id });
        break;
      case "output":
        gateId = circuit.addGate({ type: GateType.OUTPUT_PIN, name: node.id });
        break;
      case "constant": {
        const value = (node.data as ConstantNodeData).value ?? SignalState.LOW;
        gateId = circuit.addGate({ type: GateType.CONSTANT, paramA: value, name: node.id });
        break;
      }
      case "clock": {
        const halfPeriod = (node.data as ClockNodeData).halfPeriod ?? 5;
        gateId = circuit.addGate({
          type: GateType.CLOCK,
          paramA: halfPeriod,
          paramB: SignalState.LOW,
          name: node.id,
        });
        break;
      }
      case "gate": {
        const gateData = node.data as GateNodeData;
        inputCount = gateData.inputCount ?? defaultInputCountForGateType(gateData.gateType);
        const pinCount = isVariableArityGate(gateData.gateType) ? inputCount + 1 : undefined;
        gateId = circuit.addGate({ type: gateData.gateType, pinCount, delay: gateData.delay, name: node.id });
        break;
      }
      default:
        continue;
    }

    gateByNodeId.set(node.id, gateId);
    infoByNodeId.set(node.id, { gateId, inputCount });
    nodeIdByGateId.set(gateId, node.id);
  }

  const nodesById = new Map(nodes.map((n) => [n.id, n]));

  // Group edges by their source (node + handle), so fan-out (one output
  // feeding several inputs) becomes one net with several pins, not several
  // separate two-pin nets that would each only see one branch.
  const netGroups = new Map<string, { pins: Set<PinId>; edgeIds: string[] }>();

  for (const edge of edges) {
    const sourceNode = nodesById.get(edge.source);
    const targetNode = nodesById.get(edge.target);
    const sourceInfo = infoByNodeId.get(edge.source);
    const targetInfo = infoByNodeId.get(edge.target);
    if (!sourceNode || !targetNode || !sourceInfo || !targetInfo) continue;

    const sourcePin = resolvePin(circuit, sourceInfo, sourceNode, edge.sourceHandle, "source");
    const targetPin = resolvePin(circuit, targetInfo, targetNode, edge.targetHandle, "target");

    const key = `${edge.source}::${edge.sourceHandle ?? "out-0"}`;
    const group = netGroups.get(key) ?? { pins: new Set<PinId>(), edgeIds: [] };
    group.pins.add(sourcePin);
    group.pins.add(targetPin);
    group.edgeIds.push(edge.id);
    netGroups.set(key, group);
  }

  const netByEdgeId = new Map<string, NetId>();
  for (const [key, group] of netGroups) {
    const netId = circuit.wire([...group.pins], key);
    for (const edgeId of group.edgeIds) netByEdgeId.set(edgeId, netId);
  }

  const issues = validateCircuit(circuit);
  if (issues.length > 0) {
    const friendly = issues.map((issue) => {
      if (issue.gate !== undefined) {
        const nodeId = nodeIdByGateId.get(issue.gate);
        const node = nodeId ? nodesById.get(nodeId) : undefined;
        const label = node && node.data.kind === "gate" ? (node.data as GateNodeData).label : undefined;
        return `A ${label ?? node?.data.kind ?? "gate"} has a pin that isn't connected to anything.`;
      }
      return issue.message;
    });
    return { ok: false, issues: Array.from(new Set(friendly)) };
  }

  try {
    const topology = compileTopology(circuit);
    return { ok: true, result: { circuit, topology, gateByNodeId, netByEdgeId } };
  } catch (error) {
    return { ok: false, issues: [error instanceof Error ? error.message : String(error)] };
  }
}
