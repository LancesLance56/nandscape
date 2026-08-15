"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { CircuitStage } from "@/components/content/blocks/circuit/circuit-stage";
import { LazyMount } from "@/components/lazy-mount";
import type { EditorNode, EditorEdge } from "@/types/editor";
import type { SubcircuitBlockDefinition } from "@/types/subcircuit-block";

/**
 * A read-only, non-interactive glimpse of a circuit for use in list/card
 * contexts. Reuses CircuitStage (the same renderer as the blog embed and
 * project detail page) rather than a hand-drawn or static-image stand-in,
 * so what you see in a listing is what the circuit actually looks like.
 * pointer-events-none turns off panning/zooming/toggling so the preview
 * doesn't fight page scroll or a wrapping <Link>; lazy-mounted since each
 * instance is a full ReactFlow tree and a listing can have many.
 */
export function CircuitPreviewThumbnail({
  nodes,
  edges,
  blocks,
  className = "h-40",
}: {
  nodes: EditorNode[];
  edges: EditorEdge[];
  /** The project's own embedded custom-block snapshot, if any - required for
   *  a subcircuit node to render as anything but a blank box for a viewer
   *  who isn't the owner (see the doc comment on ProjectRecord.blocks). */
  blocks?: SubcircuitBlockDefinition[];
  className?: string;
}) {
  return (
    <LazyMount
      className={`relative w-full overflow-hidden bg-surface ${className}`}
      fallback={<div className={`h-full w-full animate-pulse bg-surface-2`} />}
    >
      <div className="pointer-events-none h-full w-full">
        <ReactFlowProvider>
          <CircuitStage
            nodes={nodes}
            edges={edges}
            blocks={blocks}
            pannable={false}
            allowScrollZoom={false}
            fitPadding={0.2}
          />
        </ReactFlowProvider>
      </div>
    </LazyMount>
  );
}
