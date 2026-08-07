"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { CircuitStage } from "@/components/content/blocks/circuit/circuit-stage";
import type { EditorNode, EditorEdge } from "@/types/editor";

export function EmbedStage({ nodes, edges }: { nodes: EditorNode[]; edges: EditorEdge[] }) {
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <ReactFlowProvider>
        <CircuitStage nodes={nodes} edges={edges} allowScrollZoom />
      </ReactFlowProvider>
    </div>
  );
}
