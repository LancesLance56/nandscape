import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { listTutorialTrackTrees } from "@/lib/tutorials/tutorial-tracks";
import { buildContentMetadata } from "@/lib/seo/metadata";
import { accentsFor } from "@/lib/ui/accent-palette";
import { Rail, RailItem } from "@/components/ui/rail";
import { tutorialPath } from "@/types/tutorial";
import type { TutorialNavSection, TutorialTrackTree } from "@/types/tutorial";

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
 * How many lessons a section lists here before it stops and points at the
 * track page.
 *
 * The directory used to print every published lesson under every section,
 * which turned the page into one very long ladder - the longest section ran
 * past a screenful on its own, so the tracks under it were never seen. Seven
 * rows still reads as a list at a glance, and capping every column at the same
 * height is what makes the grid below read as a grid rather than as three
 * columns of unrelated lengths.
 */
const LESSONS_PER_SECTION = 7;

/**
 * One section: a ruled heading, up to seven lessons on the rail, and an
 * overflow link into the track page when there are more.
 */
function SectionColumn({ track, section }: { track: TutorialTrackTree; section: TutorialNavSection }) {
  const shown = section.pages.slice(0, LESSONS_PER_SECTION);
  const hidden = section.pages.length - shown.length;

  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-border bg-surface-card p-4 transition-colors hover:border-[color-mix(in_oklab,var(--track)_50%,var(--border))]">
      <div className="mb-2 flex items-baseline justify-between gap-3 border-b border-border pb-2">
        <h3 className="truncate font-display text-sm font-bold uppercase tracking-wide text-ink">{section.title}</h3>
        <span className="shrink-0 text-[11px] tabular-nums text-slate">
          {section.pages.length} {section.pages.length === 1 ? "lesson" : "lessons"}
        </span>
      </div>

      <Rail>
        {shown.map((page, i) => (
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

      {hidden > 0 && (
        <Link
          href={`/tutorials/${track.slug}`}
          className="mt-auto pl-6 pt-2 text-xs font-semibold text-copper transition-colors hover:text-copper-dark"
        >
          {hidden} more {hidden === 1 ? "lesson" : "lessons"} →
        </Link>
      )}
    </div>
  );
}

/**
 * One track: a tinted header band that is itself the way into the track, then
 * a card per section under it.
 *
 * The tint is the track's own accent, from the same palette the tools index
 * draws on, so two tracks separate without a single extra rule on the page. A
 * section is a label here, not a link - the lessons under it are the click
 * targets, so there is no row whose destination you have to guess at.
 */
function TrackBlock({ track, index, accent }: { track: TutorialTrackTree; index: number; accent: string }) {
  const sections = track.sections.filter((s) => s.pages.length > 0);

  return (
    <section id={track.slug} style={{ "--track": accent } as CSSProperties} className="scroll-mt-28">
      <div className="relative overflow-hidden rounded-2xl bg-[color-mix(in_oklab,var(--track)_13%,transparent)] px-6 py-6 dark:bg-[color-mix(in_oklab,var(--track)_20%,transparent)] sm:px-8 sm:py-7">
        {/* The corner bloom the accent tiles already carry, so a flat tint gains
            a little depth without a gradient across the whole band. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-[color-mix(in_oklab,var(--track)_28%,transparent)] opacity-60"
        />

        <div className="relative flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="font-display text-sm font-bold tabular-nums text-[color-mix(in_oklab,var(--track)_75%,black)] dark:text-[color-mix(in_oklab,var(--track)_45%,white)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span aria-hidden className="h-px w-8 bg-[color-mix(in_oklab,var(--track)_55%,transparent)]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
                {track.pageCount} {track.pageCount === 1 ? "lesson" : "lessons"} · {sections.length}{" "}
                {sections.length === 1 ? "path" : "paths"}
              </span>
            </div>

            <h2 className="mt-2 font-display text-2xl font-bold leading-tight text-ink sm:text-3xl">
              <Link href={`/tutorials/${track.slug}`} className="transition-colors hover:text-copper-dark">
                {track.title}
              </Link>
            </h2>

            {track.description && (
              <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">{track.description}</p>
            )}
          </div>

          <Link
            href={`/tutorials/${track.slug}`}
            className="shrink-0 rounded-xl border border-[color-mix(in_oklab,var(--track)_45%,transparent)] bg-surface-card/70 px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-card"
          >
            Browse {track.title} →
          </Link>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <SectionColumn key={section.id} track={track} section={section} />
        ))}
      </div>
    </section>
  );
}

/** A figure in the header strip: the number large, its label under it. */
function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-display text-2xl font-bold leading-none tabular-nums text-ink">{value}</span>
      <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate">{label}</span>
    </div>
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
  const accents = accentsFor(withContent.map((t) => t.slug));
  const total = withContent.reduce((n, t) => n + t.pageCount, 0);
  const paths = withContent.reduce((n, t) => n + t.sections.filter((s) => s.pages.length > 0).length, 0);

  return (
    <main className="mx-auto max-w-330 px-6 pb-24 pt-32 sm:px-10">
      <header className="mb-12 grid gap-8 lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)] lg:items-end lg:gap-16">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-copper-dark">
            Free · no signup · interactive
          </p>
          <h1 className="mt-3 text-balance font-display text-4xl font-bold leading-[1.05] text-ink sm:text-5xl">
            Tutorials
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-soft">
            Every lesson on the site, listed below. All of them are free, need no signup, and are built around something
            you can actually interact with rather than a wall of text.
          </p>
        </div>

        {withContent.length > 0 && (
          <div className="lg:pb-1">
            <div className="flex flex-wrap items-start gap-x-10 gap-y-5 border-t border-border-strong pt-5">
              <Stat value={total} label="lessons" />
              <Stat value={paths} label="paths" />
              <Stat value={withContent.length} label={withContent.length === 1 ? "track" : "tracks"} />
            </div>

            {/* Jump links rather than links away: the track's own page is one
                click further on, from the band below. */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {withContent.map((track, i) => (
                <Link
                  key={track.id}
                  href={`#${track.slug}`}
                  style={{ "--track": accents[i] } as CSSProperties}
                  className="rounded-full border border-[color-mix(in_oklab,var(--track)_40%,transparent)] bg-[color-mix(in_oklab,var(--track)_10%,transparent)] px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-[color-mix(in_oklab,var(--track)_22%,transparent)] dark:bg-[color-mix(in_oklab,var(--track)_18%,transparent)] dark:hover:bg-[color-mix(in_oklab,var(--track)_30%,transparent)]"
                >
                  {track.title}
                  <span className="ml-1.5 font-normal tabular-nums text-slate">{track.pageCount}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {withContent.length === 0 ? (
        <p className="text-sm text-ink-soft">No tutorials published yet, check back soon.</p>
      ) : (
        <div className="flex flex-col gap-12">
          {withContent.map((track, i) => (
            <TrackBlock key={track.id} track={track} index={i} accent={accents[i]} />
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
