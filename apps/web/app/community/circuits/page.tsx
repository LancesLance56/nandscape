import type { Metadata } from "next";
import { CommunityShell } from "@/components/community/community-shell";
import { listPublicProjects, type PublicProjectSummary } from "@/lib/projects/projects";
import { getActiveFeaturedProject } from "@/lib/featured-circuits/featured-circuits";
import { CircuitOfTheWeek } from "@/components/projects/circuit-of-the-week";
import { TutorialCircuitsRow } from "@/components/projects/tutorial-circuits-row";
import { CommunityTagFilter } from "@/components/projects/community-tag-filter";
import { buildContentMetadata } from "@/lib/seo/metadata";
import { TUTORIAL_COMPANION_TAG } from "@/lib/tutorials/tutorial-companion-circuits";

/**
 * The public circuit gallery.
 *
 * This page *was* `/community`. It moved down a level when the community hub
 * took that URL, and kept every part of itself: the weekly pick, the tutorial
 * companion row and the tag filter are the same components, unchanged. The old
 * URL still resolves - it is now the hub, which links here in its tab row.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildContentMetadata({
  title: "Community Circuits",
  seoTitle: "Community Circuits: Logic Gate Projects Shared by Users",
  seoDescription:
    "Browse digital logic circuits the Nandscape community has made public. Open one to explore it, fork it, or embed it in your own page.",
  path: "/community/circuits",
  type: "website",
});

export default async function CommunityCircuitsPage() {
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
    <CommunityShell
      active="circuits"
      eyebrow="Circuits"
      title="Community circuits"
      intro="Circuits other builders have made public. Open one to explore it, or fork it into your own sandbox."
      wide
    >
      {weekly && <CircuitOfTheWeek project={weekly} />}

      <TutorialCircuitsRow projects={tutorialCircuits} />

      <div>
        <h2 className="mb-4 font-display text-lg font-bold text-ink">All circuits</h2>
        <CommunityTagFilter projects={generalProjects} />
      </div>
    </CommunityShell>
  );
}
