import { defineCommand } from "../command";
import { useEditorStore } from "@/store/editor-store";

export function createClearEdgeTurnsCommand(edgeId: string) {
  let previousWaypoints: { x: number; y: number }[] = [];

  return defineCommand({
    id: "edge.clearTurns",
    label: "Clear turns",
    undoable: true,
    execute: () => {
      const store = useEditorStore.getState();
      const edge = store.edges.find((e) => e.id === edgeId);
      previousWaypoints = edge?.data?.waypoints ?? [];
      store.updateEdgeData(edgeId, { waypoints: [] });
    },
    undo: () => {
      useEditorStore.getState().updateEdgeData(edgeId, { waypoints: previousWaypoints });
    },
  });
}
