import type { EditorNode, EditorEdge } from "@/types/editor";

export interface ClonedSlice {
  nodes: EditorNode[];
  edges: EditorEdge[];
}

let cloneCounter = 0;

function nextCloneId(prefix: string): string {
  cloneCounter += 1;
  return `${prefix}_clone_${Date.now().toString(36)}_${cloneCounter}`;
}

/**
 * Clones `nodes` with fresh ids and every position shifted by `offset`,
 * plus any `edges` whose BOTH endpoints are among them (an edge reaching
 * outside the cloned set is dropped rather than left dangling, since its
 * other endpoint isn't being cloned). Shared by selection.duplicate
 * (source = the current selection) and clipboard.paste (source = whatever
 * was last copied) - same operation, different source, see
 * duplicate-selection.command.ts / paste-clipboard.command.ts.
 */
export function cloneGraphSlice(
  nodes: EditorNode[],
  edges: EditorEdge[],
  offset: { x: number; y: number },
): ClonedSlice {
  const idMap = new Map<string, string>();

  const clonedNodes: EditorNode[] = nodes.map((n) => {
    const newId = nextCloneId(n.data.kind);
    idMap.set(n.id, newId);
    return {
      ...n,
      id: newId,
      position: { x: n.position.x + offset.x, y: n.position.y + offset.y },
      selected: false,
    };
  });

  const clonedEdges: EditorEdge[] = [];
  for (const e of edges) {
    const newSource = idMap.get(e.source);
    const newTarget = idMap.get(e.target);
    if (!newSource || !newTarget) continue;
    clonedEdges.push({
      ...e,
      id: nextCloneId("edge"),
      source: newSource,
      target: newTarget,
      selected: false,
      // Waypoints may carry a junctionId shared with an edge NOT in this
      // clone (e.g. a tap into a wire outside the selection) - dropping
      // the id here keeps a cloned "branch" from silently linking back
      // into the original graph's wires (see Waypoint's doc comment in
      // types/editor.ts).
      data: e.data
        ? { ...e.data, waypoints: e.data.waypoints?.map((w) => ({ x: w.x, y: w.y })) }
        : e.data,
    });
  }

  return { nodes: clonedNodes, edges: clonedEdges };
}
