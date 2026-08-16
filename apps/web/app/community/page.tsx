import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { listPublicProjects, type PublicProjectSummary } from "@/lib/projects/projects";
import { getActiveFeaturedProject } from "@/lib/featured-circuits/featured-circuits";
import { CircuitOfTheWeek } from "@/components/projects/circuit-of-the-week";
import { TutorialCircuitsRow } from "@/components/projects/tutorial-circuits-row";
import { CommunityTagFilter } from "@/components/projects/community-tag-filter";
import { buildContentMetadata } from "@/lib/seo/metadata";
import { TUTORIAL_COMPANION_TAG } from "@/lib/tutorials/tutorial-companion-circuits";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildContentMetadata({
  title: "Community Circuits",
  seoTitle: "Community Circuits: Logic Gate Projects Shared by Users",
  seoDescription:
    "Browse digital logic circuits the Nandscape community has made public. Open one to explore it, fork it, or embed it in your own page.",
  path: "/community",
  type: "website",
});

export default async function CommunityPage() {
  const [projects, weekly] = await Promise.all([
    listPublicProjects().catch((): PublicProjectSummary[] => []),
    getActiveFeaturedProject("COMMUNITY_WEEKLY").catch(() => null),
  ]);

  const tutorialCircuits = projects.filter((p) => p.tags.includes(TUTORIAL_COMPANION_TAG));
  // The weekly pick and the tutorial row already show these circuits
  // prominently - repeating them in the general grid right below would read
  // as the same handful of cards twice.
  const generalProjects = projects.filter(
    (p) => !p.tags.includes(TUTORIAL_COMPANION_TAG) && p.slug !== weekly?.slug,
  );

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

        {weekly && <CircuitOfTheWeek project={weekly} />}

        <TutorialCircuitsRow projects={tutorialCircuits} />

        <div>
          <h2 className="mb-4 font-display text-lg font-bold text-ink">All circuits</h2>
          <CommunityTagFilter projects={generalProjects} />
        </div>
      </main>
      <Footer />
    </>
  );
}
