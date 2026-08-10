import {defineCommand} from "../command";
import {useEditorStore} from "@/store/editor-store";
import type {Waypoint} from "@/types/editor";

/**
 * Inserts a single waypoint into an existing edge at `index` (mirrors the
 * splice index used by edge-path.ts's nearestSegmentIndex). Used by the
 * "double-click a wire to add a turn" interaction,  kept as its own command
 * (rather than a raw updateEdgeData call) so that action is undo/redo-able
 * like every other structural edit, matching clear-edge-turns.command.ts.
 */
export function createAddEdgeWaypointCommand(
  edgeId: string,
  index: number,
  point: Waypoint,
) {
  let previousWaypoints: Waypoint[] = [];

  return defineCommand({
    id: "edge.addWaypoint",
    label: "Add wire turn",
    undoable: true,
    execute: () => {
      const store = useEditorStore.getState();
      const edge = store.edges.find((e) => e.id === edgeId);
      previousWaypoints = edge?.data?.waypoints ?? [];
      const next = [...previousWaypoints];
      next.splice(index, 0, point);
      store.updateEdgeData(edgeId, {waypoints: next});
    },
    undo: () => {
      useEditorStore.getState().updateEdgeData(edgeId, {waypoints: previousWaypoints});
    },
  });
}