import type { Metadata } from "next";
import Link from "next/link";
import { listTutorialTrackTrees } from "@/lib/tutorials/tutorial-tracks";
import { buildContentMetadata } from "@/lib/seo/metadata";
import { ContentsBrowser } from "@/components/tutorials/contents-browser";
import type { TutorialTrackTree } from "@/types/tutorial";

export const revalidate = 60;

export const metadata: Metadata = buildContentMetadata({
  title: "Computer Science Tutorials",
  seoTitle: "Computer Science Tutorials: Digital Logic and DSA",
  seoDescription:
    "Free interactive computer science tutorials. Learn digital logic, boolean algebra, graphs and algorithms with visualisations you can step through.",
  path: "/tutorials",
  type: "website",
  keywords: ["computer science tutorials", "digital logic tutorial", "data structures and algorithms"],
});

export default async function TutorialsIndexPage() {
  // Defensive: no dynamic segment here, so Next tries to render this at
  // build time, when the DB may not be reachable yet.
  let tracks: TutorialTrackTree[] = [];
  try {
    tracks = await listTutorialTrackTrees();
  } catch {
    tracks = [];
  }

  const withContent = tracks.filter((t) => t.pageCount > 0);

  return (
    <main className="mx-auto max-w-320 px-6 pb-24 pt-32 sm:px-8">
      {withContent.length === 0 ? (
        <>
          <h1 className="font-display text-5xl font-semibold tracking-tight text-ink">Contents</h1>
          <p className="mt-6 text-sm text-ink-soft">No tutorials published yet, check back soon.</p>
        </>
      ) : (
        <ContentsBrowser tracks={withContent} />
      )}

      <p className="mt-14 border-t border-border pt-6 text-sm text-ink-soft">
        Prefer to poke at something first?{" "}
        <Link href="/tools" className="font-medium text-copper hover:text-copper-dark">
          Try the interactive tools
        </Link>{" "}
        or{" "}
        <Link href="/puzzles" className="font-medium text-copper hover:text-copper-dark">
          solve a puzzle
        </Link>
        .
      </p>
    </main>
  );
}
