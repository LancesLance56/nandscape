import {defineCommand} from "../command";
import {useEditorStore} from "@/store/editor-store";
import type {EditorNode, EditorEdge} from "@/types/editor";

/**
 * Deletes every currently-selected node and edge. Captures a snapshot up
 * front (rather than diffing before/after) so undo can restore nodes AND
 * the edges that were cascade-deleted along with them, in their original
 * positions — not just re-add nodes and leave wires dangling.
 */
export function createDeleteSelectionCommand() {
  let removedNodes: EditorNode[] = [];
  let removedEdges: EditorEdge[] = [];

  return defineCommand({
    id: "selection.delete",
    label: "Delete selection",
    undoable: true,
    execute: () => {
      const store = useEditorStore.getState();
      const {nodeIds, edgeIds} = store.selection;
      if (nodeIds.length === 0 && edgeIds.length === 0) return;

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
