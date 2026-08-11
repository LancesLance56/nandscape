import type { EditorNode, EditorEdge } from "./editor";

/**
 * A named circuit within a project - CircuitVerse calls these "scopes" (one
 * per tab). Any scope can be dropped into another scope of the SAME project
 * as a subcircuit instance (see scope-block.ts), the same way a saved block
 * from the global library can - the two are deliberately interchangeable
 * from a subcircuit node's point of view (see SubcircuitNodeData.circuitId).
 * Unlike a block, a scope isn't reusable across DIFFERENT projects; it's
 * this project's own composition, saved directly on the Project row.
 */
export interface CircuitScope {
  id: string;
  name: string;
  nodes: EditorNode[];
  edges: EditorEdge[];
}
