import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";
import { Card } from "@/components/ui/card";
import { getPuzzleBySlug } from "@/lib/puzzles/puzzles";
import { getProjectBySlug } from "@/lib/projects/projects";
import type { PuzzleSpec } from "@/types/puzzle";

/**
 * A worked example: one problem, and one answer to it running live.
 *
 * This used to be an empty editor on an iframe. An empty canvas is the worst
 * possible advert for an editor - it shows the chrome and none of the point -
 * so the section now states a real problem from the puzzle set, in the words
 * the puzzle itself uses, and puts a working solution beside it. The circuit
 * is the real thing: flip A and B and the wires light up, exactly as they do
 * in the editor.
 *
 * XOR from NAND is the example because it is the site's whole argument in four
 * gates: a gate you were handed as a primitive, rebuilt out of the one gate
 * everything else is made of.
 */

/** The problem, and a project that solves it. Both are looked up, and the
 *  section degrades a piece at a time if either is missing. */
const PUZZLE_SLUG = "xor-from-scratch";
const SOLUTION_SLUG = "xor-from-nand";

export async function LiveDemo() {
  let puzzle: PuzzleSpec | null = null;
  let hasSolution = false;
  try {
    puzzle = await getPuzzleBySlug(PUZZLE_SLUG);
  } catch {
    puzzle = null;
  }
  try {
    hasSolution = Boolean(await getProjectBySlug(SOLUTION_SLUG));
  } catch {
    hasSolution = false;
  }

  // Without the seeded project there is nothing to show solved, so fall back
  // to the editor itself rather than an empty frame.
  const src = hasSolution ? `/embed/${SOLUTION_SLUG}` : "/logic-editor";

  return (
    <section className="py-20">
      <ScrollReveal className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-2 text-sm font-medium text-copper-dark">
          <span className="h-1.75 w-1.75 rounded-full bg-copper" />
          Worked example
        </div>
        <h2 className="text-3xl font-semibold text-ink">Practice Makes Perfect</h2>
        <p className="max-w-xl text-sm leading-relaxed text-ink-soft">
          Learn through hands-on experience.
        </p>
      </ScrollReveal>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        {puzzle && (
          <ScrollReveal delay={80}>
            <Card className="flex h-full flex-col p-5">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate">Example problem</span>

              <h3 className="mt-2 font-display text-lg font-semibold leading-snug text-ink">{puzzle.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{puzzle.description}</p>

              <Link
                href={`/puzzles/${puzzle.slug}`}
                className="mt-5 rounded-xl bg-copper px-4 py-2 text-center text-sm font-semibold text-copper-ink transition-colors hover:bg-copper-dark"
              >
                Solve it and run the tests &rarr;
              </Link>
            </Card>
          </ScrollReveal>
        )}

        <ScrollReveal delay={140} className={puzzle ? undefined : "lg:col-span-2"}>
          <Card className="flex h-full flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate">
                {hasSolution ? "One solution · 4 NAND gates" : "The editor"}
              </span>
              <span className="font-mono text-[10px] text-slate">click an input to flip it</span>
            </div>
            <iframe
              src={src}
              title={hasSolution ? "XOR built from four NAND gates" : "Nandscape logic editor"}
              loading="lazy"
              className="h-90 w-full border-0 sm:h-110 lg:h-130"
            />
          </Card>
        </ScrollReveal>
      </div>
    </section>
  );
}
