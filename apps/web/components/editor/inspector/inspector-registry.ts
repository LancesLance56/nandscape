import type { ComponentType } from "react";
import type { EditorNode, EditorNodeKind } from "@/types/editor";
import { GateInspectorPanel } from "./panels/gate-inspector";

export interface InspectorPanelProps {
  node: EditorNode;
}

/**
 * Mirrors nodes/node-registry.ts and edges/edge-registry.ts: a single map
 * new node kinds plug into, so "Inspector adapts to current selection"
 * (per the architecture brief) never requires touching inspector.tsx
 * itself. Kinds without an entry fall back to EmptyInspectorPanel with a
 * "not yet editable" message.
 */
export const inspectorPanelRegistry: Partial<Record<EditorNodeKind, ComponentType<InspectorPanelProps>>> = {
  gate: GateInspectorPanel,
};
