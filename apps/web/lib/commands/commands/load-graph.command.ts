import {defineCommand} from "../command";
import {useEditorStore} from "@/store/editor-store";
import type {EditorNode, EditorEdge} from "@/types/editor";

export function createLoadGraphCommand(
  nodes: EditorNode[],
  edges: EditorEdge[],
  label = "Load circuit",
) {
  let previousNodes: EditorNode[] = [];
  let previousEdges: EditorEdge[] = [];

  return defineCommand({
    id: "circuit.load",
    label,
    undoable: true,
    execute: () => {
      const store = useEditorStore.getState();
      previousNodes = store.nodes;
      previousEdges = store.edges;
      // Shallow-clone so later canvas edits don't mutate the saved copy.
      store.setNodes(nodes.map((n) => ({...n, data: {...n.data}})));
      store.setEdges(edges.map((e) => ({...e, data: {...e.data}})));
      store.clearSelection();
    },
    undo: () => {
      const store = useEditorStore.getState();
      store.setNodes(previousNodes);
      store.setEdges(previousEdges);
    },
  });
}