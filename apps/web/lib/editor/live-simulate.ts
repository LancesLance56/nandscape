import {
  SignalState,
  GateType,
  evaluateCombinationalGate,
  evaluateMultiplexer,
  evaluateDemultiplexer,
  evaluateDecoder,
  evaluatePriorityEncoder,
} from "@nandscape/engine";
import type {
  EditorNode,
  EditorEdge,
  GateNodeData,
  IoNodeData,
  ConstantNodeData,
  SubcircuitNodeData,
  BusInputNodeData,
} from "@/types/editor";
import { useSubcircuitBlocksStore } from "@/store/subcircuit-blocks-store";
import type { SubcircuitBlockDefinition } from "@/types/subcircuit-block";
import { busWidthOf, isBusToBusConnection } from "@/lib/editor/bus-utils";
import { inputCountForGate, clampSelectBits, DEFAULT_SELECT_BITS } from "@/lib/editor/gate-defaults";
import type { BlockResolver } from "@/lib/editor/subcircuit-flatten";

const MAX_PASSES = 6;
const MAX_SUBCIRCUIT_DEPTH = 8;

function inputIndexFromHandle(handle: string | null | undefined): number {
  const match = handle ? /(?:in|out)-(\d+)/.exec(handle) : null;
  return match ? Number(match[1]) : 0;
}

/**
 * This evaluator drives exactly one SignalState per edge id, but a Bus
 * Merge -> Bus Split edge stands for `width` parallel single-bit
 * connections, not one,  there's nowhere to put a bundled value on a
 * single edge. So before anything else runs, replace that one edge with
 * `width` synthetic lane edges (unique ids, internal-only handle names)
 * connecting the same two nodes directly. The original bus edge is
 * dropped entirely and never appears in the returned signal map,  see
 * wire-edge.tsx, it renders as a fixed neutral bundle instead of being
 * colored from a signal that was never computed for it.
 */
function expandBusEdges(nodes: EditorNode[], edges: EditorEdge[]): EditorEdge[] {
  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  const expanded: EditorEdge[] = [];

  for (const edge of edges) {
    const sourceNode = nodesById.get(edge.source);
    const targetNode = nodesById.get(edge.target);

    if (!isBusToBusConnection(sourceNode, edge.sourceHandle, targetNode, edge.targetHandle)) {
      expanded.push(edge);
      continue;
    }

    const width = Math.min(busWidthOf(sourceNode!), busWidthOf(targetNode!));
    for (let i = 0; i < width; i++) {
      expanded.push({
        id: `${edge.id}::lane${i}`,
        source: edge.source,
        sourceHandle: `lane-out-${i}`,
        target: edge.target,
        targetHandle: `lane-in-${i}`,
        type: "wire",
        data: {},
      });
    }
  }

  return expanded;
}

function evaluateSubcircuitInstance(
  instanceNode: EditorNode,
  inputValues: SignalState[],
  block: SubcircuitBlockDefinition,
  previousSignals: Record<string, SignalState>,
  depth: number,
  resolveExtra: BlockResolver | undefined,
): { outputValues: SignalState[]; internalSignals: Record<string, SignalState> } {
  if (depth > MAX_SUBCIRCUIT_DEPTH) {
    return { outputValues: block.outputs.map(() => SignalState.UNKNOWN), internalSignals: {} };
  }

  const prefix = `${instanceNode.id}::internal::`;
  const namespacedPrevious: Record<string, SignalState> = {};
  for (const key in previousSignals) {
    if (key.startsWith(prefix)) namespacedPrevious[key.slice(prefix.length)] = previousSignals[key];
  }

  const inputByName = new Map(block.inputs.map((port, i) => [port.name, inputValues[i] ?? SignalState.FLOAT]));
  const internalNodes = block.nodes.map((n) =>
    n.data.kind === "input"
      ? { ...n, data: { ...n.data, value: inputByName.get((n.data as IoNodeData).name) ?? SignalState.FLOAT } }
      : n,
  );

  const internalEdgeSignals = evaluateLiveCircuit(internalNodes, block.edges, namespacedPrevious, depth + 1, resolveExtra);

  const outputValues = block.outputs.map((port) => {
    const outNode = block.nodes.find((n) => n.data.kind === "output" && (n.data as IoNodeData).name === port.name);
    const incoming = outNode && block.edges.find((e) => e.target === outNode.id);
    return incoming ? (internalEdgeSignals[incoming.id] ?? SignalState.FLOAT) : SignalState.FLOAT;
  });

  const internalSignals: Record<string, SignalState> = {};
  for (const key in internalEdgeSignals) internalSignals[`${prefix}${key}`] = internalEdgeSignals[key];

  return { outputValues, internalSignals };
}

export function evaluateLiveCircuit(
  nodes: EditorNode[],
  edges: EditorEdge[],
  previousSignals: Record<string, SignalState> = {},
  depth = 0,
  /** Checked before the local block library. A function rather than a
   *  static snapshot so it can serve two different callers: CircuitStage
   *  (a read-only viewer) wraps a fixed Map of a project's embedded block
   *  snapshot, without writing anything into the viewer's persisted "My
   *  Blocks"; the editor's own live preview (use-live-simulation.ts) passes
   *  a live, ever-changing resolver over this project's own scopes/tabs
   *  (see scope-block.ts's createScopeAwareResolver) instead. */
  resolveExtra?: BlockResolver,
): Record<string, SignalState> {
  const flatEdges = expandBusEdges(nodes, edges);

  const incomingByTarget = new Map<string, EditorEdge[]>();
  const outgoingBySourceHandle = new Map<string, EditorEdge[]>();

  for (const edge of flatEdges) {
    const inList = incomingByTarget.get(edge.target) ?? [];
    inList.push(edge);
    incomingByTarget.set(edge.target, inList);

    const key = `${edge.source}::${edge.sourceHandle ?? "out-0"}`;
    const outList = outgoingBySourceHandle.get(key) ?? [];
    outList.push(edge);
    outgoingBySourceHandle.set(key, outList);
  }

  const edgeSignal = new Map<string, SignalState>();
  for (const edge of flatEdges) edgeSignal.set(edge.id, previousSignals[edge.id] ?? SignalState.FLOAT);

  const readInputs = (nodeId: string, count: number): SignalState[] => {
    const values = new Array<SignalState>(count).fill(SignalState.FLOAT);
    for (const edge of incomingByTarget.get(nodeId) ?? []) {
      const idx = inputIndexFromHandle(edge.targetHandle);
      if (idx < count) values[idx] = edgeSignal.get(edge.id) ?? SignalState.FLOAT;
    }
    return values;
  };

  // Subcircuit instance ports are keyed by port NAME (see subcircuit-node.tsx:
  // handle id is `input.name`/`output.name`, not the gate family's positional
  // in-i/out-i), so they need name-based matching instead of readInputs'
  // regex-parsed index.
  const readNamedInputs = (nodeId: string, names: string[]): SignalState[] => {
    const values = new Array<SignalState>(names.length).fill(SignalState.FLOAT);
    for (const edge of incomingByTarget.get(nodeId) ?? []) {
      const idx = names.indexOf(edge.targetHandle ?? "");
      if (idx !== -1) values[idx] = edgeSignal.get(edge.id) ?? SignalState.FLOAT;
    }
    return values;
  };

  const readHandle = (nodeId: string, handleId: string): SignalState => {
    for (const edge of incomingByTarget.get(nodeId) ?? []) {
      if (edge.targetHandle === handleId) return edgeSignal.get(edge.id) ?? SignalState.FLOAT;
    }
    return SignalState.FLOAT;
  };

  const drive = (nodeId: string, handleId: string, value: SignalState) => {
    for (const edge of outgoingBySourceHandle.get(`${nodeId}::${handleId}`) ?? []) {
      edgeSignal.set(edge.id, value);
    }
  };

  const collectedInternalSignals: Record<string, SignalState> = {};

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    for (const node of nodes) {
      switch (node.data.kind) {
        case "input": {
          const data = node.data as IoNodeData;
          drive(node.id, "out-0", data.value ?? SignalState.LOW);
          break;
        }
        case "constant": {
          const data = node.data as ConstantNodeData;
          drive(node.id, "out-0", data.value);
          break;
        }
        case "gate": {
          const data = node.data as GateNodeData;
          const arity = inputCountForGate(data);
          const inputs = readInputs(node.id, arity);

          // Mux/Demux/Decoder/Priority-Encoder are stateless like ordinary
          // gates, but evaluateCombinationalGate only covers the fixed
          // single-output NAND/AND/.../BUFFER family,  these have their own
          // evaluators and (for all but Mux) more than one output.
          switch (data.gateType) {
            case GateType.MULTIPLEXER: {
              const n = clampSelectBits(data.selectBits ?? DEFAULT_SELECT_BITS);
              drive(node.id, "out-0", evaluateMultiplexer(inputs.slice(0, n), inputs.slice(n)));
              break;
            }
            case GateType.DEMULTIPLEXER: {
              const n = clampSelectBits(data.selectBits ?? DEFAULT_SELECT_BITS);
              const values = evaluateDemultiplexer(inputs.slice(1, 1 + n), inputs[0], 1 << n);
              values.forEach((v, i) => drive(node.id, `out-${i}`, v));
              break;
            }
            case GateType.DECODER: {
              const n = clampSelectBits(data.selectBits ?? DEFAULT_SELECT_BITS);
              const values = evaluateDecoder(inputs, 1 << n);
              values.forEach((v, i) => drive(node.id, `out-${i}`, v));
              break;
            }
            case GateType.PRIORITY_ENCODER: {
              const n = clampSelectBits(data.selectBits ?? DEFAULT_SELECT_BITS);
              const values = evaluatePriorityEncoder(inputs, n);
              values.forEach((v, i) => drive(node.id, `out-${i}`, v));
              break;
            }
            default:
              try {
                drive(node.id, "out-0", evaluateCombinationalGate(data.gateType, inputs));
              } catch {
                // Sequential gate types (D_LATCH/FLIP_FLOP/SR_LATCH/COUNTER/
                // JK_FLIP_FLOP/T_FLIP_FLOP) aren't handled by
                // evaluateCombinationalGate,  they need previous-state and
                // clock-edge tracking this pass-based preview doesn't do.
                // Their outputs simply stay FLOAT here until a real Play run
                // through the actual engine (see use-engine-simulation.ts).
              }
          }
          break;
        }
        case "subcircuit": {
          const scData = node.data as SubcircuitNodeData;
          const block = resolveExtra?.(scData.circuitId) ?? useSubcircuitBlocksStore.getState().getById(scData.circuitId);
          if (!block) break;
          const inputValues = readNamedInputs(node.id, block.inputs.map((p) => p.name));
          const { outputValues, internalSignals } = evaluateSubcircuitInstance(
            node, inputValues, block, previousSignals, depth, resolveExtra,
          );
          block.outputs.forEach((port, i) => drive(node.id, port.name, outputValues[i]));
          Object.assign(collectedInternalSignals, internalSignals);
          break;
        }
        case "bus-merge": {
          // Relay each real in-i straight through to the synthetic lane
          // edge expandBusEdges created for it (lane-out-i),  a Bus Merge
          // does nothing electrically beyond bundling for display.
          const width = busWidthOf(node);
          readInputs(node.id, width).forEach((value, i) => drive(node.id, `lane-out-${i}`, value));
          break;
        }
        case "bus-split": {
          // Mirror of bus-merge: relay each synthetic lane-in-i back out
          // to the real out-i single-bit pin gates downstream actually see.
          const width = busWidthOf(node);
          for (let i = 0; i < width; i++) {
            drive(node.id, `out-${i}`, readHandle(node.id, `lane-in-${i}`));
          }
          break;
        }
        case "bus-input": {
          // The source-side mirror of "input": drive every lane from its
          // own stored value, same as a plain Input drives out-0 from
          // IoNodeData.value.
          const data = node.data as BusInputNodeData;
          data.values.forEach((value, i) => drive(node.id, `out-${i}`, value ?? SignalState.LOW));
          break;
        }
        default:
          break;
      }
    }
  }

  return { ...Object.fromEntries(edgeSignal), ...collectedInternalSignals };
}
