import type { Node, Edge } from "@xyflow/react";
import type { GateType, SignalState } from "@nandscape/engine";

export type EditorNodeKind =
  | "gate"
  | "input"
  | "output"
  | "constant"
  | "clock"
  | "subcircuit"
  | "note";

export interface BaseNodeData extends Record<string, unknown> {
  kind: EditorNodeKind;
  label?: string;
  locked?: boolean;
}

export interface GateNodeData extends BaseNodeData {
  kind: "gate";
  gateType: GateType;
  inputCount?: number;
}

export interface IoNodeData extends BaseNodeData {
  kind: "input" | "output";
  name: string;
}

export interface ConstantNodeData extends BaseNodeData {
  kind: "constant";
  value: SignalState;
}

export interface ClockNodeData extends BaseNodeData {
  kind: "clock";
  halfPeriod: number;
}

export interface SubcircuitNodeData extends BaseNodeData {
  kind: "subcircuit";
  circuitId: string;
}

export interface NoteNodeData extends BaseNodeData {
  kind: "note";
  text: string;
}

export type EditorNodeData =
  | GateNodeData
  | IoNodeData
  | ConstantNodeData
  | ClockNodeData
  | SubcircuitNodeData
  | NoteNodeData;

export type EditorNode = Node<EditorNodeData>;

export interface WireEdgeData extends Record<string, unknown> {
  signal?: SignalState;
}

export type EditorEdge = Edge<WireEdgeData>;

export interface Selection {
  nodeIds: string[];
  edgeIds: string[];
}

export const EMPTY_SELECTION: Selection = { nodeIds: [], edgeIds: [] };

export type SidebarTab = "palette" | "layers" | "circuits";
export type InspectorTab = "properties" | "truth-table" | "notes";
export type BottomPanelTab = "console" | "waveform" | "problems";
