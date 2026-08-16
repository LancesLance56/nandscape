"use client";

import Link from "next/link";
import { ReactFlowProvider } from "@xyflow/react";
import { CircuitStage } from "@/components/content/blocks/circuit/circuit-stage";
import type { ActiveFeaturedProject } from "@/lib/featured-circuits/featured-circuits";

/** The community page's admin-curated highlight - same "single active pick"
 *  concept as the homepage's live demo (see FeaturedCircuit's `placement`),
 *  applied here instead to spotlight one community submission a week. */
export function CircuitOfTheWeek({ project }: { project: ActiveFeaturedProject }) {
  return (
    <section className="mb-10 overflow-hidden rounded-2xl border border-copper/30 bg-gradient-to-br from-copper-bg/60 to-transparent">
      <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-copper-dark">
            <span className="h-1.5 w-1.5 rounded-full bg-copper" />
            Circuit of the Week
          </div>
          <h2 className="font-display text-xl font-bold text-ink">{project.name}</h2>
          {project.description && (
            <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-ink-soft">{project.description}</p>
          )}
          <p className="mt-2 text-xs text-slate">by {project.ownerUsername}</p>
          <Link
            href={`/projects/${project.slug}`}
            className="mt-4 inline-block rounded-lg bg-copper px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-copper-dark"
          >
            Open circuit →
          </Link>
        </div>

        <div className="h-52 w-full shrink-0 overflow-hidden rounded-xl border border-border bg-surface-card sm:w-96">
          <ReactFlowProvider>
            <CircuitStage
              nodes={project.nodes}
              edges={project.edges}
              blocks={project.blocks}
              scopes={project.scopes}
              pannable={false}
              allowScrollZoom={false}
              fitPadding={0.15}
            />
          </ReactFlowProvider>
        </div>
      </div>
    </section>
  );
}
