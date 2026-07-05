import { defineCommand } from "../command";
import { useEditorStore } from "@/store/editor-store";
import { getDefaultCircuit } from "@/lib/editor/default-circuits";
import type { EditorNode, EditorEdge } from "@/types/editor";

export function createLoadCircuitCommand(circuitId: string) {
  const circuit = getDefaultCircuit(circuitId);
  let previousNodes: EditorNode[] = [];
  let previousEdges: EditorEdge[] = [];

  return defineCommand({
    id: "circuit.load",
    label: circuit ? `Load "${circuit.name}"` : "Load circuit",
    undoable: true,
    execute: () => {
      if (!circuit) return;
      const store = useEditorStore.getState();
      previousNodes = store.nodes;
      previousEdges = store.edges;

      const { nodes, edges } = circuit.build();
      store.setNodes(nodes);
      store.setEdges(edges);
      store.clearSelection();
    },
    undo: () => {
      const store = useEditorStore.getState();
      store.setNodes(previousNodes);
      store.setEdges(previousEdges);
    },
  });
}
