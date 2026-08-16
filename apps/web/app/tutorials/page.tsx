import type { Metadata } from "next";
import Link from "next/link";
import { listTutorialTrackTrees } from "@/lib/tutorials/tutorial-tracks";
import { buildContentMetadata } from "@/lib/seo/metadata";
import { CardLink } from "@/components/ui/card";
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

function TrackCard({ track }: { track: TutorialTrackTree }) {
  return (
    <CardLink href={`/tutorials/${track.slug}`} className="flex h-full flex-col p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-ink transition-colors group-hover:text-copper-dark">
          {track.title}
        </h2>
        <span className="shrink-0 text-xs text-slate">
          {track.pageCount} {track.pageCount === 1 ? "lesson" : "lessons"}
        </span>
      </div>

      {track.description && (
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{track.description}</p>
      )}

      <ul className="mt-4 flex flex-col gap-1.5">
        {track.sections.map((section) => (
          <li key={section.id} className="flex items-center gap-2 text-sm text-ink-soft">
            <span className="h-1 w-1 shrink-0 rounded-full bg-copper" />
            <span className="truncate">{section.title}</span>
            <span className="ml-auto shrink-0 text-[11px] text-slate">{section.pages.length}</span>
          </li>
        ))}
      </ul>

      <span className="mt-4 text-sm font-semibold text-copper-dark">Browse {track.title} →</span>
    </CardLink>
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
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold leading-tight text-ink">Tutorials</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Pick a subject to start. Every lesson is free, needs no signup, and is built around something you can
          actually interact with rather than a wall of text.
        </p>
      </header>

      {withContent.length === 0 ? (
        <p className="text-sm text-ink-soft">No tutorials published yet, check back soon.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {withContent.map((track) => (
            <TrackCard key={track.id} track={track} />
          ))}
        </div>
      )}

      <p className="mt-10 text-sm text-ink-soft">
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
