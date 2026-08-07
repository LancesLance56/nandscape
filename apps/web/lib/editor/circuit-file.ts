import type { EditorNode, EditorEdge } from "@/types/editor";

export function circuitToJsonDataUrl(name: string, nodes: EditorNode[], edges: EditorEdge[]): string {
  const json = JSON.stringify({ name, nodes, edges }, null, 2);
  return `data:application/json;charset=utf-8,${encodeURIComponent(json)}`;
}

export interface ParsedCircuit {
  name?: string;
  nodes: EditorNode[];
  edges: EditorEdge[];
}

export function parseCircuitJson(text: string): ParsedCircuit {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Not valid JSON.");
  }

  const record = data as Record<string, unknown> | null;
  if (!record || typeof record !== "object" || !Array.isArray(record.nodes) || !Array.isArray(record.edges)) {
    throw new Error('File must contain "nodes" and "edges" arrays.');
  }

  return {
    name: typeof record.name === "string" ? record.name : undefined,
    nodes: record.nodes as EditorNode[],
    edges: record.edges as EditorEdge[],
  };
}
