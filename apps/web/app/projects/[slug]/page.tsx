import { notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getProjectBySlug } from "@/lib/projects/projects";
import { CircuitEditor } from "@/components/editor";
import { ProjectViewer } from "@/components/projects/project-viewer";

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [user, project] = await Promise.all([getCurrentUser(), getProjectBySlug(slug)]);

  if (!project) notFound();

  const isOwner = user?.id === project.ownerId;
  if (!isOwner && project.visibility === "PRIVATE") notFound();

  if (isOwner) {
    return <CircuitEditor projectSlug={slug} />;
  }

  // isOwner already returned above, so this is reachable only for non-owners:
  // deletion here is exclusively the admin-override path.
  const canDelete = user?.role === "ADMIN";

  return (
    <>
      <Navbar />
      <ProjectViewer project={project} canFork={Boolean(user)} canDelete={canDelete} />
    </>
  );
}
