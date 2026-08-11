import {
  CircuitData,
  GateType,
  SignalState,
  SOURCE_PIN_OUTPUT,
  SINK_PIN_INPUT,
  BUFFER_PIN_INPUT,
  BUFFER_PIN_OUTPUT,
  compileTopology,
  validateCircuit,
  type GateId,
  type PinId,
  type NetId,
  type CircuitTopology,
} from "@nandscape/engine";
import {
  inputCountForGate,
  isVariableArityGate,
  hasSelectBits,
  hasCounterBits,
  clampSelectBits,
  clampCounterBits,
  DEFAULT_SELECT_BITS,
  DEFAULT_COUNTER_BITS,
} from "@/lib/editor/gate-defaults";
import { busWidthOf, isBusToBusConnection } from "@/lib/editor/bus-utils";
import type {
  EditorNode,
  EditorEdge,
  GateNodeData,
  ConstantNodeData,
  ClockNodeData,
  BusMergeNodeData,
  BusSplitNodeData,
  BusInputNodeData,
  BusOutputNodeData,
  SevenSegmentNodeData,
} from "@/types/editor";

export interface CompiledCircuit {
  circuit: CircuitData;
  topology: CircuitTopology;
  gateByNodeId: Map<string, GateId>;
  netByEdgeId: Map<string, NetId>;
  /** Per-lane gate ids for bus-merge/bus-split/bus-input/bus-output/
   *  seven-segment nodes (index-aligned with the node's lanes), for
   *  anything outside this module that needs to seed or drive one lane
   *  directly,  e.g. simulation-store.ts driving a Bus Input's lanes the
   *  same way it drives a plain Input's single gate. */
  laneGatesByNodeId: Map<string, GateId[]>;
}

export type CompileResult =
  | { ok: true; result: CompiledCircuit }
  | { ok: false; issues: string[] };

interface NodeInfo {
  gateId: GateId;
  inputCount: number;
  /** bus-merge/bus-split: one BUFFER gate per lane (index i handles
   *  in-i/out-i). The node's own trunk handle (bus-out/bus-in) isn't a real
   *  pin at all,  it's unpacked into per-lane net connections directly in
   *  the edges loop below, never through resolvePin.
   *  bus-output/seven-segment: one OUTPUT_PIN gate per lane (index i
   *  handles in-i), same mechanism, just a display sink instead of a
   *  routing aid,  see resolvePin's "bus-output"/"seven-segment" cases. */
  laneGates?: GateId[];
}

function handleRole(handle: string | null | undefined, fallback: number): number {
  const match = handle ? /(?:in|out)-(\d+)/.exec(handle) : null;
  return match ? Number(match[1]) : fallback;
}

function nodeLabel(node: EditorNode): string {
  if (node.data.kind === "bus-merge" || node.data.kind === "bus-split") {
    return (node.data as BusMergeNodeData | BusSplitNodeData).label || "Bus";
  }
  return node.data.kind;
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
    case "led":
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
    case "bus-merge": {
      // in-i is an ordinary single-bit target pin on lane i's buffer.
      const laneGate = info.laneGates![handleRole(handle, 0)];
      return circuit.pinOf(laneGate, BUFFER_PIN_INPUT);
    }
    case "bus-split": {
      // out-i is an ordinary single-bit source pin on lane i's buffer.
      const laneGate = info.laneGates![handleRole(handle, 0)];
      return circuit.pinOf(laneGate, BUFFER_PIN_OUTPUT);
    }
    case "bus-output":
    case "seven-segment": {
      // in-i is an ordinary single-bit sink pin on lane i's OUTPUT_PIN gate.
      const laneGate = info.laneGates![handleRole(handle, 0)];
      return circuit.pinOf(laneGate, SINK_PIN_INPUT);
    }
    case "bus-input": {
      // out-i is an ordinary single-bit source pin on lane i's INPUT_PIN gate.
      const laneGate = info.laneGates![handleRole(handle, 0)];
      return circuit.pinOf(laneGate, SOURCE_PIN_OUTPUT);
    }
    default:
      throw new Error(`resolvePin: unsupported node kind "${node.data.kind}"`);
  }
}

/**
 * Compiles an already-flat editor graph into a CircuitData + topology. This
 * function knows nothing about subcircuit blocks - any "subcircuit" node
 * still present here just falls through the switch below and is skipped.
 * Callers that might have blocks (currently only simulation-store.ts) are
 * responsible for running flattenSubcircuits() first; see
 * subcircuit-flatten.ts for why that lives in its own module instead of
 * being folded in here (it needs to resolve blocks from the local library,
 * which this module deliberately has no knowledge of).
 */
export function compileEditorGraph(nodes: EditorNode[], edges: EditorEdge[]): CompileResult {
  const circuit = new CircuitData();
  const gateByNodeId = new Map<string, GateId>();
  const infoByNodeId = new Map<string, NodeInfo>();
  const laneGatesByNodeId = new Map<string, GateId[]>();
  const nodeIdByGateId = new Map<GateId, string>();

  for (const node of nodes) {
    if (node.data.kind === "note") continue;

    // Bus nodes don't map to a single gate: each lane is its own BUFFER
    // gate with real pins (so ordinary fan-in/fan-out wires just work, and
    // an unwired lane gets flagged by the normal unconnected-pin check
    // below for free). The trunk handle (bus-out/bus-in) is wired directly
    // lane-to-lane in the edges loop, it never becomes a pin itself.
    if (node.data.kind === "bus-merge" || node.data.kind === "bus-split") {
      const width = busWidthOf(node);
      const laneGates: GateId[] = [];
      for (let i = 0; i < width; i++) {
        const laneGateId = circuit.addGate({ type: GateType.BUFFER, name: `${node.id}::${i}` });
        laneGates.push(laneGateId);
        nodeIdByGateId.set(laneGateId, node.id);
      }
      infoByNodeId.set(node.id, { gateId: laneGates[0], inputCount: 0, laneGates });
      laneGatesByNodeId.set(node.id, laneGates);
      continue;
    }

    // Bus Output / Seven-Segment: pure display sinks, one OUTPUT_PIN gate
    // per named lane. Never a source, so no bus-to-bus-style edge
    // interception is needed,  ordinary per-edge net-building below already
    // handles them once resolvePin knows about the kind.
    if (node.data.kind === "bus-output" || node.data.kind === "seven-segment") {
      const names = (node.data as BusOutputNodeData | SevenSegmentNodeData).names;
      const laneGates: GateId[] = [];
      for (let i = 0; i < names.length; i++) {
        const laneGateId = circuit.addGate({ type: GateType.OUTPUT_PIN, name: `${node.id}::${names[i]}` });
        laneGates.push(laneGateId);
        nodeIdByGateId.set(laneGateId, node.id);
      }
      infoByNodeId.set(node.id, { gateId: laneGates[0], inputCount: 0, laneGates });
      laneGatesByNodeId.set(node.id, laneGates);
      continue;
    }

    // Bus Input: the source-side mirror of Bus Output, one INPUT_PIN gate
    // per named lane. simulation-store.ts seeds/drives each lane gate
    // directly from BusInputNodeData.values via laneGatesByNodeId, the same
    // way it seeds/drives a plain Input's single gate from IoNodeData.value.
    if (node.data.kind === "bus-input") {
      const names = (node.data as BusInputNodeData).names;
      const laneGates: GateId[] = [];
      for (let i = 0; i < names.length; i++) {
        const laneGateId = circuit.addGate({ type: GateType.INPUT_PIN, name: `${node.id}::${names[i]}` });
        laneGates.push(laneGateId);
        nodeIdByGateId.set(laneGateId, node.id);
      }
      infoByNodeId.set(node.id, { gateId: laneGates[0], inputCount: 0, laneGates });
      laneGatesByNodeId.set(node.id, laneGates);
      continue;
    }

    let gateId: GateId;
    let inputCount = 0;

    switch (node.data.kind) {
      case "input":
        gateId = circuit.addGate({ type: GateType.INPUT_PIN, name: node.id });
        break;
      case "output":
      case "led":
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
        inputCount = inputCountForGate(gateData);
        const pinCount = isVariableArityGate(gateData.gateType) ? inputCount + 1 : undefined;
        const paramA = hasSelectBits(gateData.gateType)
          ? clampSelectBits(gateData.selectBits ?? DEFAULT_SELECT_BITS)
          : hasCounterBits(gateData.gateType)
            ? clampCounterBits(gateData.bitWidth ?? DEFAULT_COUNTER_BITS)
            : undefined;
        gateId = circuit.addGate({ type: gateData.gateType, pinCount, paramA, delay: gateData.delay, name: node.id });
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
  const busIssues: string[] = [];

  for (const edge of edges) {
    const sourceNode = nodesById.get(edge.source);
    const targetNode = nodesById.get(edge.target);
    const sourceInfo = infoByNodeId.get(edge.source);
    const targetInfo = infoByNodeId.get(edge.target);
    if (!sourceNode || !targetNode || !sourceInfo || !targetInfo) continue;

    // The one bus-specific case: a Bus Merge's trunk feeding a Bus Split's
    // trunk doesn't produce a single pin pair,  it fans out into `width`
    // parallel lane-to-lane connections, wired directly between the two
    // nodes' per-lane buffers. This edge deliberately never gets an entry
    // in netByEdgeId (see wire-edge.tsx: it's rendered as a fixed neutral
    // bundle, not signal-colored, since it doesn't correspond to one net).
    if (isBusToBusConnection(sourceNode, edge.sourceHandle, targetNode, edge.targetHandle)) {
      const mergeWidth = busWidthOf(sourceNode);
      const splitWidth = busWidthOf(targetNode);
      if (mergeWidth !== splitWidth) {
        busIssues.push(
          `Bus width mismatch: "${nodeLabel(sourceNode)}" is ${mergeWidth}-bit but "${nodeLabel(targetNode)}" is ${splitWidth}-bit.`,
        );
        continue;
      }
      for (let i = 0; i < mergeWidth; i++) {
        const mergeOutPin = circuit.pinOf(sourceInfo.laneGates![i], BUFFER_PIN_OUTPUT);
        const splitInPin = circuit.pinOf(targetInfo.laneGates![i], BUFFER_PIN_INPUT);
        const key = `${edge.source}::lane-${i}`;
        const group = netGroups.get(key) ?? { pins: new Set<PinId>(), edgeIds: [] };
        group.pins.add(mergeOutPin);
        group.pins.add(splitInPin);
        netGroups.set(key, group);
      }
      continue;
    }

    // A bus trunk handle reaching anywhere but its exact counterpart should
    // already be blocked at connect-time (use-handle-click.ts); this is
    // defense-in-depth for graphs that arrive some other way (paste, an
    // older save, a hand-edited circuit file).
    const sourceIsBusTrunk = sourceNode.data.kind === "bus-merge" && edge.sourceHandle === "bus-out";
    const targetIsBusTrunk = targetNode.data.kind === "bus-split" && edge.targetHandle === "bus-in";
    if (sourceIsBusTrunk || targetIsBusTrunk) {
      busIssues.push(
        `"${nodeLabel(sourceNode)}" -> "${nodeLabel(targetNode)}" isn't a valid bus connection,  a bus trunk can only connect to its matching Bus Split/Merge.`,
      );
      continue;
    }

    const sourcePin = resolvePin(circuit, sourceInfo, sourceNode, edge.sourceHandle, "source");
    const targetPin = resolvePin(circuit, targetInfo, targetNode, edge.targetHandle, "target");

    const key = `${edge.source}::${edge.sourceHandle ?? "out-0"}`;
    const group = netGroups.get(key) ?? { pins: new Set<PinId>(), edgeIds: [] };
    group.pins.add(sourcePin);
    group.pins.add(targetPin);
    group.edgeIds.push(edge.id);
    netGroups.set(key, group);
  }

  if (busIssues.length > 0) {
    return { ok: false, issues: Array.from(new Set(busIssues)) };
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
    return { ok: true, result: { circuit, topology, gateByNodeId, netByEdgeId, laneGatesByNodeId } };
  } catch (error) {
    return { ok: false, issues: [error instanceof Error ? error.message : String(error)] };
  }
}
