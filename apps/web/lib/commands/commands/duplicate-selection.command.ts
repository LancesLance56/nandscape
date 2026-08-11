import {defineCommand} from "../command";
import {useEditorStore} from "@/store/editor-store";
import {cloneGraphSlice, type ClonedSlice} from "@/lib/editor/clone-graph-slice";

const DUPLICATE_OFFSET = {x: 24, y: 24};

// `nodeIds` is captured once at creation (the selection at the moment the
// user pressed duplicate), same reasoning as delete-selection.command.ts:
// history-store's redo() re-invokes execute() rather than replaying from a
// snapshot, so reading live selection state inside execute() would make
// redo silently duplicate whatever's selected *then* instead of what was
// duplicated the first time. The clone itself is also computed once and
// cached (not recomputed per execute() call), so redo() re-adds the exact
// same nodes/edges undo() removed, not a fresh set with different ids.
export function createDuplicateSelectionCommand(nodeIds: string[]) {
  const idSet = new Set(nodeIds);
  let cloned: ClonedSlice | null = null;

  return defineCommand({
    id: "selection.duplicate",
    label: "Duplicate selection",
    undoable: true,
    execute: () => {
      const store = useEditorStore.getState();

      if (!cloned) {
        const nodes = store.nodes.filter((n) => idSet.has(n.id));
        if (nodes.length === 0) return;
        const edges = store.edges.filter((e) => idSet.has(e.source) && idSet.has(e.target));
        cloned = cloneGraphSlice(nodes, edges, DUPLICATE_OFFSET);
      }

      store.addNodes(cloned.nodes);
      for (const edge of cloned.edges) store.addEdge(edge);
      store.setSelection({
        nodeIds: cloned.nodes.map((n) => n.id),
        edgeIds: cloned.edges.map((e) => e.id),
      });
    },
    undo: () => {
      if (!cloned) return;
      const store = useEditorStore.getState();
      store.removeEdges(cloned.edges.map((e) => e.id));
      store.removeNodes(cloned.nodes.map((n) => n.id));
    },
  });
}
