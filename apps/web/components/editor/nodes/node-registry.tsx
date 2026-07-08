import type { NodeTypes } from "@xyflow/react";
import { GateType, SignalState } from "@nandscape/engine";
import { GateNode } from "./gate-node";
import { IoNode } from "./io-node";
import { defaultInputCountForGateType } from "@/lib/editor/gate-defaults";
import type { EditorNode, EditorNodeData, EditorNodeKind } from "@/types/editor";

export const nodeTypes: NodeTypes = {
  gate: GateNode,
  "io-input": IoNode,
  "io-output": IoNode,
  // "constant": ConstantNode,
  // "clock": ClockNode,
  // "subcircuit": SubcircuitNode,
  // "note": NoteNode,
};

let nodeIdCounter = 0;
function nextNodeId(kind: EditorNodeKind): string {
  nodeIdCounter += 1;
  return `${kind}_${nodeIdCounter}_${Date.now().toString(36)}`;
}

interface NodeFactoryOptions {
  /** Explicit id — used by lib/editor/default-circuits.ts so edges can reference known endpoints. */
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

export function createConstantNode(
  position: { x: number; y: number },
  value: SignalState = SignalState.LOW,
  options: NodeFactoryOptions = {},
): EditorNode {
  return {
    id: options.id ?? nextNodeId("constant"),
    type: "constant",
    position,
    data: { kind: "constant", value } satisfies EditorNodeData,
  };
}

export function createClockNode(
  position: { x: number; y: number },
  halfPeriod = 5,
  options: NodeFactoryOptions = {},
): EditorNode {
  return {
    id: options.id ?? nextNodeId("clock"),
    type: "clock",
    position,
    data: { kind: "clock", halfPeriod } satisfies EditorNodeData,
  };
}
