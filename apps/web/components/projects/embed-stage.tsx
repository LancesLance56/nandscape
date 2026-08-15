"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { CircuitStage } from "@/components/content/blocks/circuit/circuit-stage";
import type { EditorNode, EditorEdge } from "@/types/editor";
import type { SubcircuitBlockDefinition } from "@/types/subcircuit-block";
import type { CircuitScope } from "@/types/scope";

export function EmbedStage({
  nodes,
  edges,
  blocks,
  scopes,
}: {
  nodes: EditorNode[];
  edges: EditorEdge[];
  blocks?: SubcircuitBlockDefinition[];
  /** Needed alongside `blocks` for tab-backed subcircuits - see the prop's
   *  doc comment on CircuitStage. */
  scopes?: CircuitScope[];
}) {
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <ReactFlowProvider>
        <CircuitStage nodes={nodes} edges={edges} blocks={blocks} scopes={scopes} allowScrollZoom />
      </ReactFlowProvider>
    </div>
  );
}
