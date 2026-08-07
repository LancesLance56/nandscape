import Link from "next/link";
import type { PublicProjectSummary } from "@/lib/projects/projects";

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
    <div className="flex flex-col gap-1">
      {projects.map((project) => (
        <Link
          key={project.id}
          href={`/projects/${project.slug}`}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-2/60"
        >
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{project.name}</span>
          <span className="shrink-0 font-mono text-[11px] text-slate">by {project.ownerUsername}</span>
          <span className="shrink-0 font-mono text-[11px] text-slate">{formatDate(project.updatedAt)}</span>
        </Link>
      ))}
    </div>
  );
}
