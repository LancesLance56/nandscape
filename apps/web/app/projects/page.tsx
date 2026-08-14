import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listProjectsForUser } from "@/lib/projects/projects";
import { ProjectsList } from "@/components/projects/projects-list";

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const projects = await listProjectsForUser(user.id);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 pb-24 pt-32">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-ink">My projects</h1>
          <Link
            href="/logic-editor"
            className="rounded-lg bg-copper px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-copper-dark"
          >
            + New project
          </Link>
        </div>
        <ProjectsList initial={projects} />

        <Link
          href="/community"
          className="mt-10 inline-flex items-center gap-1.5 text-sm font-medium text-copper-dark hover:text-copper"
        >
          Browse community circuits →
        </Link>
      </main>
    </>
  );
}
