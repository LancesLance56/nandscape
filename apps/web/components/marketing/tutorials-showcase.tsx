import Link from "next/link";
import { listTutorialTrackTrees } from "@/lib/tutorials/tutorial-tracks";
import { ScrollReveal } from "@/components/scroll-reveal";
import { AccentTile, SplitIndex } from "@/components/ui/rail";
import { accentsFor } from "@/lib/ui/accent-palette";
import { tutorialPath } from "@/types/tutorial";
import type { TutorialTrackTree } from "@/types/tutorial";

/**
 * The tutorials strip: one split index per track.
 *
 * Track identity sits in the left column, its sections on the right as filled
 * tiles carrying the lesson count as their numeral, each in its own accent.
 * This was a grid of one small card per section, which flattened a three-level
 * tree into eight identical tiles and never said which subject a path belonged
 * to.
 */
export async function TutorialsShowcase() {
  let tracks: TutorialTrackTree[] = [];
  try {
    tracks = await listTutorialTrackTrees();
  } catch {
    tracks = [];
  }

  const withContent = tracks.filter((t) => t.pageCount > 0);
  if (withContent.length === 0) return null;

  const lessons = withContent.reduce((n, t) => n + t.pageCount, 0);

  return (
    <section className="py-20">
      <ScrollReveal className="mb-9 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-copper-dark">
            <span className="h-1.75 w-1.75 rounded-full bg-copper" />
            {lessons} lessons across {withContent.length} subject{withContent.length === 1 ? "" : "s"}
          </div>
          <h2 className="font-display text-3xl font-semibold text-ink">Learn Step by Step</h2>
        </div>
        <Link
          href="/tutorials"
          className="rounded-xl border border-border-strong/70 bg-surface-card/80 px-4 py-2 text-sm font-semibold text-ink backdrop-blur-sm transition-all hover:border-ink-soft hover:shadow-md active:scale-[0.97]"
        >
          Browse all tutorials →
        </Link>
      </ScrollReveal>

      <div className="flex flex-col gap-10">
        {withContent.map((track, i) => {
          const sections = track.sections.filter((s) => s.pages.length > 0);
          const accents = accentsFor(sections.map((s) => s.slug));

          return (
            <ScrollReveal key={track.id} delay={i * 80}>
              <SplitIndex
                title={<h3 className="font-display text-xl font-bold leading-tight text-ink">{track.title}</h3>}
                intro={
                  <p className="mt-1.5 text-xs font-semibold uppercase tracking-wide text-copper-dark">
                    {track.pageCount} lessons · {sections.length} {sections.length === 1 ? "path" : "paths"}
                  </p>
                }
                aside={
                  <Link
                    href={`/tutorials/${track.slug}`}
                    className="mt-3 inline-block text-sm font-semibold text-copper-dark hover:text-copper"
                  >
                    Browse {track.title} →
                  </Link>
                }
              >
                {sections.map((section, j) => {
                  const first = section.pages[0];
                  return (
                    <AccentTile
                      key={section.id}
                      // Straight to the first lesson: a section is a path, and
                      // the useful thing to do with a path is start walking it.
                      href={first ? tutorialPath(first.trackSlug, first.slug) : `/tutorials/${track.slug}`}
                      index={String(section.pages.length).padStart(2, "0")}
                      title={section.title}
                      accent={accents[j]}
                    />
                  );
                })}
              </SplitIndex>
            </ScrollReveal>
          );
        })}
      </div>
    </section>
  );
}
