import {
  SignalState,
  GateType,
  evaluateAnd,
  evaluateOr,
  evaluateNand,
  evaluateNor,
  evaluateXor,
  evaluateXnor,
  evaluateNot,
  evaluateBuffer,
} from "@nandscape/engine";
import type { EditorNode, EditorEdge, GateNodeData, IoNodeData, ConstantNodeData } from "@/types/editor";

/**
 * evaluateLiveCircuit — the editor's "always on" preview evaluator.
 *
 * This is NOT the engine's event-driven Simulator: it's a small,
 * dependency-free pass over the editor graph that recomputes every
 * combinational gate's output from scratch on every call, so toggling an
 * input or drawing a wire updates colors instantly with no Play/Pause step.
 * It reuses the engine's own gate truth-table functions (evaluateAnd,
 * evaluateNand, ...) so results match the real simulator exactly once a
 * circuit graduates to it.
 *
 * Point-to-point rather than net-aware (one driver per target handle) and
 * relaxed over MAX_PASSES iterations so multi-level chains and simple
 * feedback loops (an SR latch built from two NANDs) settle. Sequential
 * primitives (D_LATCH/D_FLIP_FLOP/SR_LATCH/CLOCK) aren't evaluated here —
 * they need real event ordering and belong to the future engine bridge via
 * simulation-store.compileAndAttach; their output pins stay FLOAT in this
 * preview.
 */
const MAX_PASSES = 6;

function inputIndexFromHandle(handle: string | null | undefined): number {
  const match = handle ? /in-(\d+)/.exec(handle) : null;
  return match ? Number(match[1]) : 0;
}

export function evaluateLiveCircuit(
  nodes: EditorNode[],
  edges: EditorEdge[],
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
  for (const edge of edges) edgeSignal.set(edge.id, SignalState.FLOAT);

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
            case GateType.NAND:
              drive(node.id, "out-0", evaluateNand(readInputs(node.id, arity)));
              break;
            case GateType.AND:
              drive(node.id, "out-0", evaluateAnd(readInputs(node.id, arity)));
              break;
            case GateType.OR:
              drive(node.id, "out-0", evaluateOr(readInputs(node.id, arity)));
              break;
            case GateType.NOR:
              drive(node.id, "out-0", evaluateNor(readInputs(node.id, arity)));
              break;
            case GateType.XOR:
              drive(node.id, "out-0", evaluateXor(readInputs(node.id, arity)));
              break;
            case GateType.XNOR:
              drive(node.id, "out-0", evaluateXnor(readInputs(node.id, arity)));
              break;
            case GateType.NOT:
              drive(node.id, "out-0", evaluateNot(readInputs(node.id, 1)[0]));
              break;
            case GateType.BUFFER:
              drive(node.id, "out-0", evaluateBuffer(readInputs(node.id, 1)[0]));
              break;
            default:
              break;
          }
          break;
        }
        default:
          break;
      }
    }
  }

  return Object.fromEntries(edgeSignal);
}
