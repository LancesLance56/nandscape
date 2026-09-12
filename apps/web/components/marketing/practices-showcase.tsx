import Link from "next/link";

import { listPracticeRecords } from "@/lib/practice/practice-records";
import { DifficultyTag } from "@/components/puzzles/difficulty-tag";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SectionHeader, TILE_CLASS } from "./section-header";
import type { PracticeSignature, PracticeSpec } from "@/types/practice";

/**
 * The coding problems block, sitting directly above the logic problems.
 *
 * The two are siblings - the navbar calls them Logic Problems and Coding
 * Problems, and they share a browser (`components/problems`) - so they get the
 * same heading shape, the same grid and the same tile. What they must not
 * share is the artwork, or the page reads as one section printed twice.
 *
 * A logic puzzle is drawn as the chip it asks you to build, with its pins
 * named. The equivalent here is the signature: the function's name, what it is
 * handed and what it has to give back, which is the whole contract a coding
 * problem states before you have read a word of the statement. Everything else
 * on the tile is a number the reader can act on - how hard, how many cases it
 * will be judged against, what it is about.
 *
 * Languages are deliberately absent from the tile. Every problem in the set
 * supports all three, so a row of identical chips on six cards would be six
 * cards of noise; the section says it once, in the blurb.
 */
const FEATURED_SLUGS = [
  "two-sum",
  "count-set-bits",
  "merge-intervals",
  "group-anagrams",
  "course-schedule",
  "edit-distance",
];

/** How many topic tags a tile shows before it stops. */
const TAG_LIMIT = 2;

export async function PracticesShowcase() {
  let practices: PracticeSpec[] = [];
  try {
    practices = await listPracticeRecords();
  } catch {
    practices = [];
  }

  const bySlug = new Map(practices.map((p) => [p.slug, p]));
  let featured = FEATURED_SLUGS.map((slug) => bySlug.get(slug)).filter((p): p is PracticeSpec => Boolean(p));
  if (featured.length === 0) featured = practices.slice(0, 6);

  return (
    <section className="py-20">
      <ScrollReveal className="mb-10">
        <SectionHeader
          eyebrow="Coding problems"
          title="Try a coding problem"
          blurb="Implement one function, run it against the worked examples, then submit it against the hidden cases. Python, JavaScript or C++, in the browser, with nothing to install."
          action={{ href: "/practices", label: "Browse all problems" }}
        />
      </ScrollReveal>

      {featured.length === 0 ? (
        <p className="text-sm text-ink-soft">No coding problems in the database yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((practice, i) => (
            <ScrollReveal key={practice.slug} delay={i * 50}>
              <Link href={`/practices/${practice.slug}`} className={TILE_CLASS}>
                <div className="flex items-center justify-between gap-3">
                  <DifficultyTag difficulty={practice.difficulty} />
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate">
                    {practice.visibleTests.length + practice.hiddenTestCount} tests
                  </span>
                </div>

                <h3 className="mt-2.5 font-display text-base font-semibold text-ink transition-colors group-hover:text-copper-dark">
                  {practice.title}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-soft">{practice.summary}</p>

                {/* Pushed to the floor of the tile, so the signatures line up
                    across a row however long the summaries above them run. */}
                <div className="mt-auto pt-4">
                  <Signature signature={practice.signature} />

                  {practice.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {practice.tags.slice(0, TAG_LIMIT).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-slate"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * The function you have to write, spelled the way the starter code spells it.
 *
 * Names in ink and types in slate, so the shape of the problem - two arrays in,
 * one integer out - is legible before any of it is read. It wraps rather than
 * truncating: a clipped signature is worse than a two-line one, because the
 * part that gets cut is the return type.
 */
function Signature({ signature }: { signature: PracticeSignature }) {
  return (
    <code className="block break-words rounded-lg border border-border bg-surface-2 px-2.5 py-2 font-mono text-[11px] leading-relaxed">
      <span className="font-semibold text-copper-dark">{signature.name}</span>
      <span className="text-slate">(</span>
      {signature.params.map((param, i) => (
        <span key={param.name}>
          {i > 0 && <span className="text-slate">, </span>}
          <span className="text-ink">{param.name}</span>
          <span className="text-slate">: {param.type}</span>
        </span>
      ))}
      <span className="text-slate">) &rarr; </span>
      <span className="text-ink">{signature.returns}</span>
    </code>
  );
}
