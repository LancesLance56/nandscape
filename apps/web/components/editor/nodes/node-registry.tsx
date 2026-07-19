import type { NodeTypes } from "@xyflow/react";
import { GateType, SignalState } from "@nandscape/engine";
import { GateNode } from "./gate-node";
import { IoNode } from "./io-node";
import { SubcircuitNode } from "./subcircuit-node";
import { defaultInputCountForGateType } from "@/lib/editor/gate-defaults";
import type { EditorNode, EditorNodeData, EditorNodeKind } from "@/types/editor";

export const nodeTypes: NodeTypes = {
  gate: GateNode,
  "io-input": IoNode,
  "io-output": IoNode,
  subcircuit: SubcircuitNode,
};

let nodeIdCounter = 0;

function nextNodeId(kind: EditorNodeKind): string {
  nodeIdCounter += 1;
  return `${kind}_${nodeIdCounter}_${Date.now().toString(36)}`;
}

interface NodeFactoryOptions {
  id?: string;
}

export function createGateNode(
  position: { x: number; y: number },
  gateType: GateType,
  options: NodeFactoryOptions & { inputCount?: number; label?: string } = {},
): EditorNode {
  return {
    id: options.id ?? nextNodeId("gate"),
    type: "gate",
    position,
    data: {
      kind: "gate",
      gateType,
      inputCount: options.inputCount ?? defaultInputCountForGateType(gateType),
      label: options.label,
    } satisfies EditorNodeData,
  };
}

export function createIoNode(
  position: { x: number; y: number },
  kind: "input" | "output",
  name: string,
  options: NodeFactoryOptions & { value?: SignalState } = {},
): EditorNode {
  return {
    id: options.id ?? nextNodeId(kind),
    type: kind === "input" ? "io-input" : "io-output",
    position,
    data:
      kind === "input"
        ? { kind, name, value: options.value ?? SignalState.LOW }
        : { kind, name },
  };
}

export function createSubcircuitNode(
  position: { x: number; y: number },
  blockId: string,
  options: NodeFactoryOptions = {},
): EditorNode {
  return {
    id: options.id ?? nextNodeId("subcircuit"),
    type: "subcircuit",
    position,
    data: {
      kind: "subcircuit",
      circuitId: blockId,
    } satisfies EditorNodeData,
  };
}