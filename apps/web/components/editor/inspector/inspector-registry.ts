import type {ComponentType} from "react";
import type {EditorNode, EditorNodeKind} from "@/types/editor";
import {GateInspectorPanel} from "./panels/gate-inspector";
import {IoInspectorPanel} from "./panels/io-inspector";
import {SubcircuitInspectorPanel} from "./panels/subcircuit-inspector";
import {ClockInspectorPanel} from "./panels/clock-inspector";
import {BusInspectorPanel} from "./panels/bus-inspector";
import {BusOutputInspectorPanel} from "./panels/bus-output-inspector";
import {SevenSegmentInspectorPanel} from "./panels/seven-segment-inspector";

export interface InspectorPanelProps {
  node: EditorNode;
}

export const inspectorPanelRegistry: Partial<Record<EditorNodeKind, ComponentType<InspectorPanelProps>>> = {
  gate: GateInspectorPanel,
  input: IoInspectorPanel,
  output: IoInspectorPanel,
  subcircuit: SubcircuitInspectorPanel, // was built but never registered
  clock: ClockInspectorPanel,
  "bus-merge": BusInspectorPanel,
  "bus-split": BusInspectorPanel,
  "bus-output": BusOutputInspectorPanel,
  "seven-segment": SevenSegmentInspectorPanel,
};