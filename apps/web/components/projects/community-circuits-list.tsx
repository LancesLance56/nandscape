import Link from "next/link";
import type { PublicProjectSummary } from "@/lib/projects/projects";
import { CircuitPreviewThumbnail } from "@/components/projects/circuit-preview-thumbnail";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function CommunityCircuitsList({ projects }: { projects: PublicProjectSummary[] }) {
  if (projects.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        No public circuits yet,  be the first to share one. Open a circuit in the sandbox, hit Share, and set it to
        Public.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <Link
          key={project.id}
          href={`/projects/${project.slug}`}
          className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface-card transition-colors hover:border-copper"
        >
          <CircuitPreviewThumbnail nodes={project.nodes} edges={project.edges} className="h-36 border-b border-border" />
          <div className="flex flex-col gap-0.5 px-4 py-3">
            <span className="truncate text-sm font-medium text-ink group-hover:text-copper-dark">{project.name}</span>
            <span className="font-mono text-[11px] text-slate">
              by {project.ownerUsername} · {formatDate(project.updatedAt)}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
