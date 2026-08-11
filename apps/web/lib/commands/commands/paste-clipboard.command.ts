import {defineCommand} from "../command";
import {useEditorStore} from "@/store/editor-store";
import {cloneGraphSlice, type ClonedSlice} from "@/lib/editor/clone-graph-slice";
import {getClipboard} from "@/lib/editor/clipboard";

const PASTE_OFFSET = {x: 24, y: 24};

// Same "compute once, cache for redo" reasoning as
// duplicate-selection.command.ts - the clone is taken from the clipboard
// exactly once (on the first execute()) so undo/redo always operate on the
// same concrete nodes/edges, not a re-clone with fresh ids each time.
export function createPasteClipboardCommand() {
  let cloned: ClonedSlice | null = null;

  return defineCommand({
    id: "clipboard.paste",
    label: "Paste",
    undoable: true,
    execute: () => {
      const store = useEditorStore.getState();

      if (!cloned) {
        const clipboard = getClipboard();
        if (!clipboard || clipboard.nodes.length === 0) return;
        cloned = cloneGraphSlice(clipboard.nodes, clipboard.edges, PASTE_OFFSET);
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
