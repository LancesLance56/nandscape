import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { listPublicProjects, type PublicProjectSummary } from "@/lib/projects/projects";
import { CommunityCircuitsList } from "@/components/projects/community-circuits-list";

export const metadata: Metadata = {
  title: "Community circuits,  Nandscape",
  description: "Circuits the Nandscape community has made public.",
};

export const revalidate = 60;

export default async function CommunityPage() {
  let projects: PublicProjectSummary[] = [];
  try {
    projects = await listPublicProjects();
  } catch {
    projects = [];
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-32">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-ink">Community circuits</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Circuits other builders have made public. Open one to explore it, or fork it into your own sandbox.
          </p>
        </div>
        <CommunityCircuitsList projects={projects} />
      </main>
    </>
  );
}
