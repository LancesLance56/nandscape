import type { NodeTypes } from "@xyflow/react";
import { GateType, SignalState } from "@nandscape/engine";
import { GateNode } from "./gate-node";
import { IoNode } from "./io-node";
import { SubcircuitNode } from "./subcircuit-node";
import { BusMergeNode } from "./bus-merge-node";
import { BusSplitNode } from "./bus-split-node";
import { BusInputNode } from "./bus-input-node";
import { BusOutputNode } from "./bus-output-node";
import { SevenSegmentNode } from "./seven-segment-node";
import { ClockNode } from "./clock-node";
import { defaultInputCountForGateType, isVariableArityGate } from "@/lib/editor/gate-defaults";
import { DEFAULT_BUS_WIDTH, busOutputLaneNames, sevenSegmentLaneNames, DEFAULT_SEVEN_SEGMENT_PREFIX } from "@/lib/editor/bus-utils";
import type { EditorNode, EditorNodeData, EditorNodeKind } from "@/types/editor";

export const nodeTypes: NodeTypes = {
  gate: GateNode,
  "io-input": IoNode,
  "io-output": IoNode,
  subcircuit: SubcircuitNode,
  "bus-merge": BusMergeNode,
  "bus-split": BusSplitNode,
  "bus-input": BusInputNode,
  "bus-output": BusOutputNode,
  "seven-segment": SevenSegmentNode,
  clock: ClockNode,
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
      // Only meaningful for variable-arity gates (see GateNodeData's doc
      // comment); leaving it undefined for every other gate type means
      // inputCountForGate() falls through to its own type-specific default
      // (selectBits-derived, fixed-shape, etc.) instead of a stray unused
      // number sitting in this node's data.
      inputCount: options.inputCount ?? (isVariableArityGate(gateType) ? defaultInputCountForGateType(gateType) : undefined),
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

/** A display-only variant of Output: same single target pin and compiles
 *  to the same OUTPUT_PIN gate (see compile-circuit.ts), rendered as a
 *  glowing dot instead of a 0/1 readout box (see io-node.tsx). Reuses the
 *  "io-output" node type/IoNode component,  the two only differ by
 *  `data.kind`. */
export function createLedNode(
  position: { x: number; y: number },
  name: string,
  options: NodeFactoryOptions = {},
): EditorNode {
  return {
    id: options.id ?? nextNodeId("led"),
    type: "io-output",
    position,
    data: { kind: "led", name },
  };
}

export function createClockNode(
  position: { x: number; y: number },
  options: NodeFactoryOptions & { halfPeriod?: number } = {},
): EditorNode {
  return {
    id: options.id ?? nextNodeId("clock"),
    type: "clock",
    position,
    data: {
      kind: "clock",
      halfPeriod: options.halfPeriod ?? 5,
    } satisfies EditorNodeData,
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

export function createBusMergeNode(
  position: { x: number; y: number },
  options: NodeFactoryOptions & { width?: number; label?: string } = {},
): EditorNode {
  return {
    id: options.id ?? nextNodeId("bus-merge"),
    type: "bus-merge",
    position,
    data: {
      kind: "bus-merge",
      width: options.width ?? DEFAULT_BUS_WIDTH,
      label: options.label ?? "A",
    } satisfies EditorNodeData,
  };
}

export function createBusSplitNode(
  position: { x: number; y: number },
  options: NodeFactoryOptions & { width?: number; label?: string } = {},
): EditorNode {
  return {
    id: options.id ?? nextNodeId("bus-split"),
    type: "bus-split",
    position,
    data: {
      kind: "bus-split",
      width: options.width ?? DEFAULT_BUS_WIDTH,
      label: options.label ?? "A",
    } satisfies EditorNodeData,
  };
}

export function createBusInputNode(
  position: { x: number; y: number },
  options: NodeFactoryOptions & { names?: string[]; values?: SignalState[] } = {},
): EditorNode {
  const names = options.names ?? busOutputLaneNames("A", DEFAULT_BUS_WIDTH);
  return {
    id: options.id ?? nextNodeId("bus-input"),
    type: "bus-input",
    position,
    data: {
      kind: "bus-input",
      names,
      values: options.values ?? names.map(() => SignalState.LOW),
    } satisfies EditorNodeData,
  };
}

export function createBusOutputNode(
  position: { x: number; y: number },
  options: NodeFactoryOptions & { names?: string[] } = {},
): EditorNode {
  return {
    id: options.id ?? nextNodeId("bus-output"),
    type: "bus-output",
    position,
    data: {
      kind: "bus-output",
      names: options.names ?? busOutputLaneNames("Y", DEFAULT_BUS_WIDTH),
    } satisfies EditorNodeData,
  };
}

export function createSevenSegmentNode(
  position: { x: number; y: number },
  options: NodeFactoryOptions & { names?: [string, string, string, string, string, string, string] } = {},
): EditorNode {
  return {
    id: options.id ?? nextNodeId("seven-segment"),
    type: "seven-segment",
    position,
    data: {
      kind: "seven-segment",
      names: options.names ?? sevenSegmentLaneNames(DEFAULT_SEVEN_SEGMENT_PREFIX),
    } satisfies EditorNodeData,
  };
}