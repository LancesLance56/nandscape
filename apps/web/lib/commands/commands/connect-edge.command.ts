import type { Connection } from "@xyflow/react";
import { defineCommand } from "../command";
import { useEditorStore } from "@/store/editor-store";

/**
 * Wraps CircuitEditor's onConnect handler in a Command so a drawn wire is
 * undoable. Validity checks (e.g. "an INPUT_PIN's output can't drive
 * another INPUT_PIN's output", pin arity, no self-loops) belong in a
 * dedicated `lib/editor/validate-connection.ts` — this command assumes the
 * connection already passed React Flow's `isValidConnection` and focuses
 * only on making the edit undoable.
 */
export function createConnectEdgeCommand(connection: Connection) {
  let createdEdgeId: string | null = null;

  return defineCommand({
    id: "edge.connect",
    label: "Connect wire",
    undoable: true,
    execute: () => {
      const edge = useEditorStore.getState().connect(connection);
      createdEdgeId = edge.id;
    },
    undo: () => {
      if (createdEdgeId) useEditorStore.getState().removeEdges([createdEdgeId]);
    },
  });
}
