import type { Metadata } from "next";
import Link from "next/link";
import { listTutorialTrackTrees } from "@/lib/tutorials/tutorial-tracks";
import { buildContentMetadata } from "@/lib/seo/metadata";
import { Rail, RailItem } from "@/components/ui/rail";
import { tutorialPath } from "@/types/tutorial";
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

/**
 * One track, drawn as its own spine.
 *
 * The identity sits in a narrow left column and the sections hang off a wire
 * on the right, so the page reads as "two subjects, eight paths between them"
 * rather than as two boxes that happen to contain lists.
 */
function TrackRail({ track }: { track: TutorialTrackTree }) {
  const sections = track.sections.filter((s) => s.pages.length > 0);

  return (
    <section className="grid gap-6 border-t border-border-strong pt-7 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:gap-12">
      <div className="lg:sticky lg:top-28 lg:self-start">
        <h2 className="font-display text-2xl font-bold leading-tight text-ink">{track.title}</h2>
        <p className="mt-1.5 text-xs font-semibold uppercase tracking-wide text-copper-dark">
          {track.pageCount} {track.pageCount === 1 ? "lesson" : "lessons"} · {sections.length}{" "}
          {sections.length === 1 ? "path" : "paths"}
        </p>
        {track.description && (
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{track.description}</p>
        )}
        <Link
          href={`/tutorials/${track.slug}`}
          className="mt-4 inline-block text-sm font-semibold text-copper-dark hover:text-copper"
        >
          Browse {track.title} →
        </Link>
      </div>

      <Rail>
        {sections.map((section, i) => {
          const first = section.pages[0];
          return (
            <RailItem
              key={section.id}
              // Straight to the first lesson: a section is a path, and the
              // useful thing to do with a path is start walking it.
              href={first ? tutorialPath(first.trackSlug, first.slug) : `/tutorials/${track.slug}`}
              title={section.title}
              detail={first?.title}
              meta={`${section.pages.length} ${section.pages.length === 1 ? "lesson" : "lessons"}`}
              filled={i === 0}
            />
          );
        })}
      </Rail>
    </section>
  );
}

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
    <main className="mx-auto max-w-330 px-6 pb-24 pt-32 sm:px-10">
      <header className="mb-10">
        <h1 className="font-display text-3xl font-bold leading-tight text-ink">Tutorials</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Pick a subject to start. Every lesson is free, needs no signup, and is built around something you can
          actually interact with rather than a wall of text.
        </p>
      </header>

      {withContent.length === 0 ? (
        <p className="text-sm text-ink-soft">No tutorials published yet, check back soon.</p>
      ) : (
        <div className="flex flex-col gap-12">
          {withContent.map((track) => (
            <TrackRail key={track.id} track={track} />
          ))}
        </div>
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
