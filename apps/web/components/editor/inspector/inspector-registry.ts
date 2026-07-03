import type { ComponentType } from "react";
import type { EditorNode, EditorNodeKind } from "@/types/editor";
import { GateInspectorPanel } from "./panels/gate-inspector";

export interface InspectorPanelProps {
  node: EditorNode;
}

export const inspectorPanelRegistry: Partial<Record<EditorNodeKind, ComponentType<InspectorPanelProps>>> = {
  gate: GateInspectorPanel,
};
