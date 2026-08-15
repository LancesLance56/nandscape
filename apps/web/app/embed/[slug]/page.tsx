import type { Metadata } from "next";
import { getProjectBySlug } from "@/lib/projects/projects";
import { EmbedStage } from "@/components/projects/embed-stage";
import { siteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const revalidate = 60;

export default async function EmbedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project || project.visibility === "PRIVATE") {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-slate">
        This circuit isn&apos;t available for embedding.
      </div>
    );
  }

  return (
    <EmbedStage
      nodes={project.nodes}
      edges={project.edges}
      blocks={project.blocks}
      scopes={project.scopes}
      name={project.name}
      href={`${siteUrl()}/projects/${project.slug}`}
    />
  );
}
