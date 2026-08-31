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
 * One track: a header band that is itself the way into the track, then every
 * section it holds with every lesson under it.
 *
 * The previous version listed sections and linked each one to `pages[0]`,
 * which meant the only lesson reachable from this page was the first of each
 * section - 9 of 52. A section is a label here, not a link, and the lessons
 * under it are the click targets, so there is no longer a row whose
 * destination you have to guess at.
 */
function TrackBlock({ track }: { track: TutorialTrackTree }) {
  const sections = track.sections.filter((s) => s.pages.length > 0);

  return (
    <section id={track.slug} className="scroll-mt-28 border-t border-border-strong pt-7">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl font-bold leading-tight text-ink sm:text-3xl">
            <Link href={`/tutorials/${track.slug}`} className="transition-colors hover:text-copper-dark">
              {track.title}
            </Link>
          </h2>
          <p className="mt-1.5 text-xs font-semibold uppercase tracking-wide text-copper-dark">
            {track.pageCount} {track.pageCount === 1 ? "lesson" : "lessons"} · {sections.length}{" "}
            {sections.length === 1 ? "path" : "paths"}
          </p>
          {track.description && (
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{track.description}</p>
          )}
        </div>

        <Link
          href={`/tutorials/${track.slug}`}
          className="shrink-0 rounded-xl bg-copper px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-copper-dark"
        >
          Browse {track.title} →
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <div key={section.id} className="min-w-0">
            <div className="mb-2 flex items-baseline justify-between gap-3 border-b border-border pb-1.5">
              <h3 className="truncate font-display text-sm font-bold uppercase tracking-wide text-ink">
                {section.title}
              </h3>
              <span className="shrink-0 text-[11px] tabular-nums text-slate">
                {section.pages.length} {section.pages.length === 1 ? "lesson" : "lessons"}
              </span>
            </div>
            <Rail>
              {section.pages.map((page, i) => (
                <RailItem
                  key={page.slug}
                  href={tutorialPath(page.trackSlug ?? track.slug, page.slug)}
                  title={page.title}
                  meta={i + 1}
                  // Solid node on the lesson a reader should start from.
                  filled={i === 0}
                />
              ))}
            </Rail>
          </div>
        ))}
      </div>
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
  const total = withContent.reduce((n, t) => n + t.pageCount, 0);

  return (
    <main className="mx-auto max-w-330 px-6 pb-24 pt-32 sm:px-10">
      <header className="mb-10">
        <h1 className="text-balance font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">Tutorials</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Every lesson on the site, listed below. All of them are free, need no signup, and are built around something
          you can actually interact with rather than a wall of text.
        </p>

        {withContent.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {withContent.map((track) => (
              <Link
                key={track.id}
                href={`/tutorials/${track.slug}`}
                className="rounded-full border border-border-strong px-4 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-copper hover:bg-copper-bg/50 hover:text-copper-dark"
              >
                {track.title}
                <span className="ml-1.5 text-xs font-normal tabular-nums text-slate">{track.pageCount}</span>
              </Link>
            ))}
            <span className="ml-1 text-xs text-slate">{total} lessons in total</span>
          </div>
        )}
      </header>

      {withContent.length === 0 ? (
        <p className="text-sm text-ink-soft">No tutorials published yet, check back soon.</p>
      ) : (
        <div className="flex flex-col gap-14">
          {withContent.map((track) => (
            <TrackBlock key={track.id} track={track} />
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
