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
  | "bus-merge"
  | "bus-split"
  | "bus-output"
  | "seven-segment"
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

/**
 * N single-bit wires (in-0..in-(width-1)) bundled into one thick "bus-out"
 * wire, industry-schematic-tool style. Electrically inert on its own: it
 * only does something when its bus-out feeds a matching-width BusSplit's
 * bus-in (see lib/editor/bus-utils.ts,  compile-circuit.ts and
 * live-simulate.ts both special-case exactly that one connection).
 */
export interface BusMergeNodeData extends BaseNodeData {
  kind: "bus-merge";
  width: number;
}

/** The mirror image of BusMergeNodeData: one "bus-in" fans out to N
 *  single-bit wires (out-0..out-(width-1)). */
export interface BusSplitNodeData extends BaseNodeData {
  kind: "bus-split";
  width: number;
}

/**
 * A pure-display output sink: N single-bit target pins (in-0..in-(N-1),
 * index 0 = MSB) shown as one combined decimal/binary readout instead of N
 * separate LEDs. `names` is authoritative everywhere (compiling, grading,
 * the header label shown on the node); it's what a puzzle's starter graph
 * sets directly to match its output port names exactly. The inspector's
 * label+width fields (see bus-output-inspector.tsx) are just a convenience
 * for regenerating this array, not separately persisted state.
 */
export interface BusOutputNodeData extends BaseNodeData {
  kind: "bus-output";
  names: string[];
}

/**
 * Seven fixed single-bit target pins (in-0..in-6, a..g order) rendered as
 * an actual seven-segment digit instead of seven separate LEDs. `names[i]`
 * is the puzzle output port name for segment i (see SEVEN_SEGMENT_LABELS
 * in lib/editor/bus-utils.ts for the a..g ordering).
 */
export interface SevenSegmentNodeData extends BaseNodeData {
  kind: "seven-segment";
  names: [string, string, string, string, string, string, string];
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
  | BusMergeNodeData
  | BusSplitNodeData
  | BusOutputNodeData
  | SevenSegmentNodeData
  | NoteNodeData;

export type EditorNode = Node<EditorNodeData>;

export interface WireEdgeData extends Record<string, unknown> {
  /** Live signal drawn from the simulation store; undefined while not simulating. */
  signal?: SignalState;
  waypoints?: { x: number; y: number }[];
  /** Set only on the one edge connecting a BusMerge's bus-out to a
   *  BusSplit's bus-in. Doesn't correspond to a single net (it stands in
   *  for `busWidth` parallel ones), so it's rendered as a fixed thick
   *  neutral wire instead of being signal-colored,  see wire-edge.tsx. */
  isBus?: boolean;
  busWidth?: number;
}

export type EditorEdge = Edge<WireEdgeData>;

export interface Selection {
  nodeIds: string[];
  edgeIds: string[];
}

export const EMPTY_SELECTION: Selection = {nodeIds: [], edgeIds: []};

export type SidebarTab = "problem";
export type InspectorTab = "properties" | "truth-table" | "notes" | "palette";
export type BottomPanelTab = "palette";

export interface SubcircuitNodeData extends BaseNodeData {
  kind: "subcircuit";
  circuitId: string; // -> SubcircuitBlockDefinition.id
}

export interface GateNodeData extends BaseNodeData {
  kind: "gate";
  gateType: GateType;
  inputCount?: number;
  /** Clockwise rotation in degrees. Handles move to the corresponding side; labels stay upright. */
  rotation?: 0 | 90 | 180 | 270;
  /** Propagation delay override, in sim-time units. Undefined means "use the
   *  engine's per-gate-type default" (see DEFAULT_GATE_DELAY in @nandscape/engine). */
  delay?: number;
}
