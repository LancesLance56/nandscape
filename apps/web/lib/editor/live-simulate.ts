import {
  SignalState, GateType,
  evaluateAnd, evaluateOr, evaluateNand, evaluateNor, evaluateXor, evaluateXnor,
  evaluateNot, evaluateBuffer,
} from "@nandscape/engine";
import type { EditorNode, EditorEdge, GateNodeData, IoNodeData, ConstantNodeData, SubcircuitNodeData } from "@/types/editor";
import { useSubcircuitBlocksStore } from "@/store/subcircuit-blocks-store";
import type { SubcircuitBlockDefinition } from "@/types/subcircuit-block";

const MAX_PASSES = 6;
const MAX_SUBCIRCUIT_DEPTH = 8;

function inputIndexFromHandle(handle: string | null | undefined): number {
  const match = handle ? /(?:in|out)-(\d+)/.exec(handle) : null;
  return match ? Number(match[1]) : 0;
}

/** Runs one block instance's internal graph, seeded with this frame's external inputs. */
function evaluateSubcircuitInstance(
  instanceNode: EditorNode,
  inputValues: SignalState[],
  block: SubcircuitBlockDefinition,
  previousSignals: Record<string, SignalState>,
  depth: number,
): { outputValues: SignalState[]; internalSignals: Record<string, SignalState> } {
  if (depth > MAX_SUBCIRCUIT_DEPTH) {
    return { outputValues: block.outputs.map(() => SignalState.UNKNOWN), internalSignals: {} };
  }

  // Namespace previous-signal lookups per instance so two placed copies of
  // the same block don't share memory, and so nested latches inside a
  // block can hold state across frames exactly like top-level ones.
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

  const internalEdgeSignals = evaluateLiveCircuit(internalNodes, block.edges, namespacedPrevious, depth + 1);

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
): Record<string, SignalState> {
  const incomingByTarget = new Map<string, EditorEdge[]>();
  const outgoingBySourceHandle = new Map<string, EditorEdge[]>();

  for (const edge of edges) {
    const inList = incomingByTarget.get(edge.target) ?? [];
    inList.push(edge);
    incomingByTarget.set(edge.target, inList);

    const key = `${edge.source}::${edge.sourceHandle ?? "out-0"}`;
    const outList = outgoingBySourceHandle.get(key) ?? [];
    outList.push(edge);
    outgoingBySourceHandle.set(key, outList);
  }

  const edgeSignal = new Map<string, SignalState>();
  for (const edge of edges) edgeSignal.set(edge.id, previousSignals[edge.id] ?? SignalState.FLOAT);

  const readInputs = (nodeId: string, count: number): SignalState[] => {
    const values = new Array<SignalState>(count).fill(SignalState.FLOAT);
    for (const edge of incomingByTarget.get(nodeId) ?? []) {
      const idx = inputIndexFromHandle(edge.targetHandle);
      if (idx < count) values[idx] = edgeSignal.get(edge.id) ?? SignalState.FLOAT;
    }
    return values;
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
          const arity = data.inputCount ?? 2;
          switch (data.gateType) {
            case GateType.NAND: drive(node.id, "out-0", evaluateNand(readInputs(node.id, arity))); break;
            case GateType.AND: drive(node.id, "out-0", evaluateAnd(readInputs(node.id, arity))); break;
            case GateType.OR: drive(node.id, "out-0", evaluateOr(readInputs(node.id, arity))); break;
            case GateType.NOR: drive(node.id, "out-0", evaluateNor(readInputs(node.id, arity))); break;
            case GateType.XOR: drive(node.id, "out-0", evaluateXor(readInputs(node.id, arity))); break;
            case GateType.XNOR: drive(node.id, "out-0", evaluateXnor(readInputs(node.id, arity))); break;
            case GateType.NOT: drive(node.id, "out-0", evaluateNot(readInputs(node.id, 1)[0])); break;
            case GateType.BUFFER: drive(node.id, "out-0", evaluateBuffer(readInputs(node.id, 1)[0])); break;
            default: break;
          }
          break;
        }
        case "subcircuit": {
          const scData = node.data as SubcircuitNodeData;
          const block = useSubcircuitBlocksStore.getState().getById(scData.circuitId);
          if (!block) break;
          const inputValues = readInputs(node.id, block.inputs.length);
          const { outputValues, internalSignals } = evaluateSubcircuitInstance(
            node, inputValues, block, previousSignals, depth,
          );
          outputValues.forEach((value, i) => drive(node.id, `out-${i}`, value));
          Object.assign(collectedInternalSignals, internalSignals);
          break;
        }
        default:
          break;
      }
    }
  }

  return { ...Object.fromEntries(edgeSignal), ...collectedInternalSignals };
}