import type { EditorNode, EditorEdge } from "./editor";

export interface BlockPort {
  /** Matches the `name` field on the internal Input/Output node — this is the whole interface. */
  name: string;
}

export interface SubcircuitBlockDefinition {
  id: string;
  name: string;
  description?: string;
  inputs: BlockPort[];
  outputs: BlockPort[];
  /** The internal implementation graph. Treated as immutable once created — see note at the bottom. */
  nodes: EditorNode[];
  edges: EditorEdge[];
  builtIn: boolean;
  updatedAt: number;
  color?: string;
}