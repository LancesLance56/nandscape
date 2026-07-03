import type { NodeTypes } from "@xyflow/react";
import { GateType, SignalState } from "@nandscape/engine";
import { GateNode } from "./gate-node";
import { IoNode } from "./io-node";
import type { EditorNode, EditorNodeData, EditorNodeKind } from "@/types/editor";

export const nodeTypes: NodeTypes = {
  gate: GateNode,
  "io-input": IoNode,
  "io-output": IoNode,
};

function nextNodeId(kind: EditorNodeKind): string {
  return `${kind}_${crypto.randomUUID()}`;
}

export function createGateNode(position: { x: number; y: number }, gateType: GateType): EditorNode {
  return {
    id: nextNodeId("gate"),
    type: "gate",
    position,
    data: { kind: "gate", gateType, inputCount: 2 } satisfies EditorNodeData,
  };
}

export function createIoNode(
  position: { x: number; y: number },
  kind: "input" | "output",
  name: string,
): EditorNode {
  return {
    id: nextNodeId(kind),
    type: `io-${kind}`,
    position,
    data: { kind, name } satisfies EditorNodeData,
  };
}

export function createConstantNode(position: { x: number; y: number }, value: SignalState = SignalState.LOW): EditorNode {
  return {
    id: nextNodeId("constant"),
    type: "constant",
    position,
    data: { kind: "constant", value } satisfies EditorNodeData,
  };
}

export function createClockNode(position: { x: number; y: number }, halfPeriod = 5): EditorNode {
  return {
    id: nextNodeId("clock"),
    type: "clock",
    position,
    data: { kind: "clock", halfPeriod } satisfies EditorNodeData,
  };
}