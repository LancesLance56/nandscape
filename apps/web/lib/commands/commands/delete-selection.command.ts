import {defineCommand} from "../command";
import {useEditorStore} from "@/store/editor-store";
import type {EditorNode, EditorEdge} from "@/types/editor";

// `nodeIds`/`edgeIds` are captured once at creation (the selection at the
// moment the user pressed delete), NOT re-read from live store state inside
// execute(). history-store's redo() re-invokes execute() rather than
// replaying from a snapshot, and by the time that happens the selection has
// long since been cleared, so reading it live would make redo silently
// no-op while the history stack still advanced past/future as if it hadn't.
export function createDeleteSelectionCommand(nodeIds: string[], edgeIds: string[]) {
  let removedNodes: EditorNode[] = [];
  let removedEdges: EditorEdge[] = [];

  return defineCommand({
    id: "selection.delete",
    label: "Delete selection",
    undoable: true,
    execute: () => {
      const store = useEditorStore.getState();

      const nodeIdSet = new Set(nodeIds);
      removedNodes = store.nodes.filter((n) => nodeIdSet.has(n.id));

      const edgeIdSet = new Set(edgeIds);
      removedEdges = store.edges.filter(
        (e) => edgeIdSet.has(e.id) || nodeIdSet.has(e.source) || nodeIdSet.has(e.target),
      );

      store.removeNodes(nodeIds);
      store.removeEdges(edgeIds);
      store.clearSelection();
    },
    undo: () => {
      const store = useEditorStore.getState();
      if (removedNodes.length) store.addNodes(removedNodes);
      for (const edge of removedEdges) store.addEdge(edge);
    },
  });
}
