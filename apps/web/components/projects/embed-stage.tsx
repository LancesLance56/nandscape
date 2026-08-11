"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { CircuitStage } from "@/components/content/blocks/circuit/circuit-stage";
import type { EditorNode, EditorEdge } from "@/types/editor";
import type { SubcircuitBlockDefinition } from "@/types/subcircuit-block";

export function EmbedStage({
  nodes,
  edges,
  blocks,
}: {
  nodes: EditorNode[];
  edges: EditorEdge[];
  blocks?: SubcircuitBlockDefinition[];
}) {
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <ReactFlowProvider>
        <CircuitStage nodes={nodes} edges={edges} blocks={blocks} allowScrollZoom />
      </ReactFlowProvider>
    </div>
  );
}
