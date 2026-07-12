import type {Node, Edge} from "@xyflow/react";
import type {GateType, SignalState} from "@nandscape/engine";

/** Every placeable node kind. Mirrors GateType plus editor-only pseudo-nodes. */
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
  /** Only meaningful for variable-arity gates (AND/OR/NAND/NOR/XOR/XNOR). */
  inputCount?: number;
}

export interface IoNodeData extends BaseNodeData {
  kind: "input" | "output";
  name: string;
  value?: SignalState;
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
  /** Live signal drawn from the simulation store; undefined while not simulating. */
  signal?: SignalState;
  /** User-placed bend points, in flow coordinates, between source and target. Empty/undefined means auto-routed. */
  waypoints?: { x: number; y: number }[];
}

export type EditorEdge = Edge<WireEdgeData>;

/** Anything selectable in the editor — nodes, edges, or (future) groups. */
export interface Selection {
  nodeIds: string[];
  edgeIds: string[];
}

export const EMPTY_SELECTION: Selection = {nodeIds: [], edgeIds: []};

/** Which side panel/tab is currently active — used by ui-store. */
export type SidebarTab = "palette" | "layers" | "circuits";
export type InspectorTab = "properties" | "truth-table" | "notes";
export type BottomPanelTab = "console" | "waveform" | "problems";

export interface SubcircuitNodeData extends BaseNodeData {
  kind: "subcircuit";
  circuitId: string; // -> SubcircuitBlockDefinition.id
}
