import type { NodeTypes } from "@xyflow/react";
import { GateType, SignalState } from "@nandscape/engine";
import { GateNode } from "./gate-node";
import { IoNode } from "./io-node";
import { defaultInputCountForGateType } from "@/lib/editor/gate-defaults";
import type { EditorNode, EditorNodeData, EditorNodeKind } from "@/types/editor";

/**
 * Single place new node kinds get plugged in — React Flow's `nodeTypes`
 * map is derived directly from this registry. constant/clock/subcircuit/
 * note have factories and data types but no dedicated renderer yet, so
 * they're commented out here rather than mis-rendered via GateNode.
 *
 * IMPORTANT: keys here are React Flow's `node.type`, not our domain
 * `data.kind`. They must never be "input", "output", "default", or
 * "group" — those are React Flow's own built-in node type names, and its
 * base stylesheet applies a decorative box (white background, border,
 * fixed width) to any node whose `type` matches one of them, *even when*
 * a custom renderer is registered for that key. That collision is what
 * previously wrapped the circular IoNode button in a big bordered square.
 * `data.kind` ("input" | "output") is what IoNode itself switches on and
 * is unaffected by this.
 */
export const nodeTypes: NodeTypes = {
  gate: GateNode,
  "io-input": IoNode,
  "io-output": IoNode,
  // constant: ConstantNode,
  // clock: ClockNode,
  // subcircuit: SubcircuitNode,
  // note: NoteNode,
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
