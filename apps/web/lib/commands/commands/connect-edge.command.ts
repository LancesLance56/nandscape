import type {Connection} from "@xyflow/react";
import {defineCommand} from "../command";
import {useEditorStore} from "@/store/editor-store";

/**
 * Validity checks (pin arity, no self-loops, type matching) belong in a
 * dedicated lib/editor/validate-connection.ts — this command assumes the
 * connection already passed React Flow's `isValidConnection`/the wire-draft
 * flow's own compatibility check, and focuses on making the edit undoable.
 * `waypoints` carries any turns the user placed while click-routing the
 * wire (see wire-draft-store.ts); omitted for a plain drag-to-connect.
 */
export function createConnectEdgeCommand(connection: Connection, waypoints?: { x: number; y: number }[]) {
  let createdEdgeId: string | null = null;

  return defineCommand({
    id: "edge.connect",
    label: "Connect wire",
    undoable: true,
    execute: () => {
      const edge = useEditorStore.getState().connect(connection, waypoints);
      createdEdgeId = edge.id;
    },
    undo: () => {
      if (createdEdgeId) useEditorStore.getState().removeEdges([createdEdgeId]);
    },
  });
}
