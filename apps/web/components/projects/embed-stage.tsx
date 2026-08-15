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
  name,
  href,
}: {
  nodes: EditorNode[];
  edges: EditorEdge[];
  blocks?: SubcircuitBlockDefinition[];
  /** Needed alongside `blocks` for tab-backed subcircuits - see the prop's
   *  doc comment on CircuitStage. */
  scopes?: CircuitScope[];
  name?: string;
  /** Absolute URL of the project this embed is showing. */
  href?: string;
}) {
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <ReactFlowProvider>
        <CircuitStage nodes={nodes} edges={edges} blocks={blocks} scopes={scopes} allowScrollZoom />
      </ReactFlowProvider>

      {/* The only thing an embed gives back. Every page that iframes a
          circuit is a page that should credit (and link to) where it came
          from - without this the embed is a pure giveaway. Deliberately
          small and out of the way so it doesn't spoil the embed itself. */}
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener"
          className="absolute bottom-2 right-2 rounded-lg border border-border bg-surface-card/90 px-2.5 py-1 text-[10px] font-medium text-ink-soft no-underline backdrop-blur-sm transition-colors hover:text-copper-dark"
        >
          {name ? `${name} · ` : ""}Built with Nandscape
        </a>
      )}
    </div>
  );
}
