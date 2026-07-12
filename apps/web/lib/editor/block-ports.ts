import type { EditorNode, IoNodeData } from "@/types/editor";
import type { BlockPort } from "@/types/subcircuit-block";

export function deriveBlockPorts(nodes: EditorNode[]): { inputs: BlockPort[]; outputs: BlockPort[] } {
  const byY = (a: EditorNode, b: EditorNode) => a.position.y - b.position.y;

  const inputs = nodes
    .filter((n) => n.data.kind === "input")
    .sort(byY)
    .map((n) => ({ name: (n.data as IoNodeData).name }));

  const outputs = nodes
    .filter((n) => n.data.kind === "output")
    .sort(byY)
    .map((n) => ({ name: (n.data as IoNodeData).name }));

  return { inputs, outputs };
}