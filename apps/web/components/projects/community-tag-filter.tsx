"use client";

import { useMemo, useState } from "react";
import type { PublicProjectSummary } from "@/lib/projects/projects";
import { CircuitPreviewThumbnail } from "@/components/projects/circuit-preview-thumbnail";
import { CardLink } from "@/components/ui/card";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function ProjectCard({ project }: { project: PublicProjectSummary }) {
  return (
    <CardLink href={`/projects/${project.slug}`} className="flex flex-col overflow-hidden">
      <CircuitPreviewThumbnail
        nodes={project.nodes}
        edges={project.edges}
        blocks={project.blocks}
        scopes={project.scopes}
        className="h-36 border-b border-border"
      />
      <div className="flex flex-col gap-1 px-4 py-3">
        <span className="truncate text-sm font-medium text-ink group-hover:text-copper-dark">{project.name}</span>
        {project.description && (
          <span className="line-clamp-2 text-xs text-ink-soft">{project.description}</span>
        )}
        <span className="text-[11px] text-slate">
          by {project.ownerUsername} · {formatDate(project.updatedAt)}
        </span>
        {project.tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {project.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-ink-soft">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </CardLink>
  );
}

/**
 * The general grid, with a client-side tag filter above it. Filtering
 * client-side (rather than a server round-trip per click) is deliberate:
 * the whole public listing is already fetched for the page (capped at
 * PUBLIC_LISTING_LIMIT, see projects.ts), so there's nothing to gain from
 * re-querying the DB for a subset of data already sitting in the response.
 */
export function CommunityTagFilter({ projects }: { projects: PublicProjectSummary[] }) {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const project of projects) {
      for (const tag of project.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [projects]);

  const visible = activeTag ? projects.filter((p) => p.tags.includes(activeTag)) : projects;

  if (projects.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        No public circuits yet,  be the first to share one. Open a circuit in the sandbox, hit Share, and set it to
        Public.
      </p>
    );
  }

  return (
    <div>
      {tagCounts.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTag(null)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTag === null ? "bg-copper text-white" : "bg-surface-2 text-ink-soft hover:text-ink"
            }`}
          >
            All ({projects.length})
          </button>
          {tagCounts.map(([tag, count]) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag(tag === activeTag ? null : tag)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTag === tag ? "bg-copper text-white" : "bg-surface-2 text-ink-soft hover:text-ink"
              }`}
            >
              {tag} ({count})
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="text-sm text-ink-soft">No circuits tagged &ldquo;{activeTag}&rdquo;.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
