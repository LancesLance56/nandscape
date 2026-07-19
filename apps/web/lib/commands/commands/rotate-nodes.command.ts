import {defineCommand} from "../command";
import {useEditorStore} from "@/store/editor-store";

export interface NodeRotation {
  nodeId: string;
  from: number;
  to: number;
}

export function createRotateNodesCommand(rotations: NodeRotation[]) {
  return defineCommand({
    id: "node.rotate",
    label: rotations.length === 1 ? "Rotate gate" : `Rotate ${rotations.length} gates`,
    undoable: true,
    execute: () => {
      const store = useEditorStore.getState();
      for (const r of rotations) store.updateNodeData(r.nodeId, {rotation: r.to});
    },
    undo: () => {
      const store = useEditorStore.getState();
      for (const r of rotations) store.updateNodeData(r.nodeId, {rotation: r.from});
    },
  });
}