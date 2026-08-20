/**
 * Tree layout, shared by every widget that draws a recursion.
 *
 * Backtracking search trees and dynamic-programming call trees are the same
 * picture with different labels on the nodes, so they get the same layout code
 * rather than two copies that slowly drift apart. The function is generic over
 * the node type: it only ever reads `id`, `parentId` and `depth`, and hands
 * back whatever it was given with `x` and `y` attached.
 */

/** The minimum a node has to carry for the layout to place it. */
export interface LayoutNode {
  id: string;
  parentId: string | null;
  depth: number;
}

/** Anything the layout has placed. */
export type Placed<T> = T & { x: number; y: number };

/**
 * Tidy-ish layout: every leaf gets its own column in left-to-right order and
 * each parent centres over its children.
 *
 * Laying out the *complete* node list once, rather than re-laying out the
 * revealed subset on every frame, is the point. If positions were recomputed
 * per frame the whole tree would slide sideways each time a node appeared, and
 * following a single branch downward would be impossible.
 */
export function layoutTree<T extends LayoutNode>(nodes: T[], width: number, rowHeight: number): Placed<T>[] {
  if (nodes.length === 0) return [];

  const childrenOf = new Map<string | null, T[]>();
  for (const node of nodes) {
    const list = childrenOf.get(node.parentId);
    if (list) list.push(node);
    else childrenOf.set(node.parentId, [node]);
  }

  const slot = new Map<string, number>();
  let nextLeaf = 0;

  // Iterative post-order: these trees get deep enough that a recursive layout
  // would be at risk of the same stack overflow the tutorials warn about,
  // which would be an embarrassing way for the widget to fail.
  const walk: { node: T; expanded: boolean }[] = (childrenOf.get(null) ?? []).map((node) => ({
    node,
    expanded: false,
  }));

  while (walk.length > 0) {
    const frame = walk[walk.length - 1];
    const kids = childrenOf.get(frame.node.id) ?? [];

    if (kids.length === 0) {
      slot.set(frame.node.id, nextLeaf++);
      walk.pop();
      continue;
    }

    if (!frame.expanded) {
      frame.expanded = true;
      for (let i = kids.length - 1; i >= 0; i--) walk.push({ node: kids[i], expanded: false });
      continue;
    }

    const positions = kids.map((k) => slot.get(k.id) ?? 0);
    slot.set(frame.node.id, (Math.min(...positions) + Math.max(...positions)) / 2);
    walk.pop();
  }

  const leafCount = Math.max(nextLeaf, 1);
  return nodes.map((node) => ({
    ...node,
    x: ((slot.get(node.id) ?? 0) + 0.5) * (width / leafCount),
    y: node.depth * rowHeight + rowHeight * 0.7,
  }));
}

/** Depth of the deepest node, used to size a canvas. */
export function treeDepth(nodes: { depth: number }[]): number {
  return nodes.reduce((max, n) => Math.max(max, n.depth), 0);
}

/** Leaf count, which is what decides whether a drawn tree is still legible. */
export function leafCount(nodes: LayoutNode[]): number {
  const hasChild = new Set(nodes.map((n) => n.parentId).filter((id): id is string => Boolean(id)));
  return nodes.filter((n) => !hasChild.has(n.id)).length;
}
