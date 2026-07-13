import type { EditorNode, EditorEdge } from "./editor";

export interface BlockPort {
  name: string;
}

export interface SubcircuitBlockDefinition {
  id: string;
  name: string;
  description?: string;
  inputs: BlockPort[];
  outputs: BlockPort[];
  nodes: EditorNode[];
  edges: EditorEdge[];
  builtIn: boolean;
  updatedAt: number;
  color?: string;
}