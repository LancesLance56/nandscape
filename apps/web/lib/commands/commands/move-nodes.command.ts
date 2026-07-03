import { defineCommand } from "../command";
import { useEditorStore } from "@/store/editor-store";

export interface NodeMove {
  nodeId: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

/**
 * Drag interactions update position continuously via onNodesChange (see
 * editor-store) for smooth 60fps feedback, WITHOUT touching history. Only
 * on drag *end* does the canvas dispatch one of these, capturing the net
 * from/to positions so undo is a single step rather than one entry per
 * intermediate frame.
 */
export function createMoveNodesCommand(moves: NodeMove[]) {
  return defineCommand({
    id: "node.move",
    label: moves.length === 1 ? "Move node" : `Move ${moves.length} nodes`,
    undoable: true,
    execute: () => {
      const store = useEditorStore.getState();
      for (const move of moves) store.moveNode(move.nodeId, move.to);
    },
    undo: () => {
      const store = useEditorStore.getState();
      for (const move of moves) store.moveNode(move.nodeId, move.from);
    },
  });
}
