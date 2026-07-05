import { defineCommand } from "../command";
import { useEditorStore } from "@/store/editor-store";
import type { EditorEdge } from "@/types/editor";

export function createDeleteEdgeCommand(edgeId: string) {
  let removedEdge: EditorEdge | null = null;

  return defineCommand({
    id: "edge.delete",
    label: "Delete wire",
    undoable: true,
    execute: () => {
      const store = useEditorStore.getState();
      removedEdge = store.edges.find((e) => e.id === edgeId) ?? null;
      store.removeEdges([edgeId]);
    },
    undo: () => {
      if (removedEdge) useEditorStore.getState().addEdge(removedEdge);
    },
  });
}
