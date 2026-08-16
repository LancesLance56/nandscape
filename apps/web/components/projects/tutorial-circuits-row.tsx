import Link from "next/link";
import type { PublicProjectSummary } from "@/lib/projects/projects";
import { CircuitPreviewThumbnail } from "@/components/projects/circuit-preview-thumbnail";
import { CardLink } from "@/components/ui/card";

/** Every tutorial's companion circuit (tagged "tutorial" at seed time - see
 *  seed/projects/*.json), surfaced as its own row rather than mixed
 *  anonymously into the general grid, so someone browsing recognizes them
 *  as "the worked example that goes with a lesson" rather than an ordinary
 *  community submission. */
export function TutorialCircuitsRow({ projects }: { projects: PublicProjectSummary[] }) {
  if (projects.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-ink">From the Tutorials</h2>
          <p className="mt-0.5 text-xs text-ink-soft">The worked-example circuit behind each digital logic lesson.</p>
        </div>
        <Link href="/tutorials/digital-logic" className="shrink-0 text-xs font-semibold text-copper-dark hover:text-copper">
          Browse tutorials →
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {projects.map((project) => (
          <CardLink
            key={project.id}
            href={`/projects/${project.slug}`}
            className="w-56 shrink-0 overflow-hidden"
          >
            <CircuitPreviewThumbnail
              nodes={project.nodes}
              edges={project.edges}
              blocks={project.blocks}
              scopes={project.scopes}
              className="h-28 border-b border-border"
            />
            <div className="px-3 py-2.5">
              <span className="line-clamp-1 text-xs font-semibold text-ink group-hover:text-copper-dark">
                {project.name}
              </span>
            </div>
          </CardLink>
        ))}
      </div>
    </section>
  );
}
