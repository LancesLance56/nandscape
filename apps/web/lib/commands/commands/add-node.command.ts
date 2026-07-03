import { defineCommand } from "../command";
import { useEditorStore } from "@/store/editor-store";
import type { EditorNode } from "@/types/editor";

/** Adds a single node. Undo removes it (and any edges React Flow may have attached to it). */
export function createAddNodeCommand(node: EditorNode) {
  return defineCommand({
    id: "node.add",
    label: `Add ${node.data.kind}`,
    undoable: true,
    execute: () => {
      useEditorStore.getState().addNode(node);
    },
    undo: () => {
      useEditorStore.getState().removeNodes([node.id]);
    },
  });
}
