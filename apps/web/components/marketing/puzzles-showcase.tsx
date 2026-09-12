import { listPuzzles } from "@/lib/puzzles/puzzles";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SectionHeader } from "./section-header";
import { PuzzleDemo, type DemoPuzzle } from "./puzzle-demo";
import type { PuzzleSpec } from "@/types/puzzle";

/**
 * The logic problems block, sitting directly below the coding problems.
 *
 * Both sections contain the problem rather than describing it, and both are
 * built the same way: a picker, and the real editor under it.
 *
 * Nothing about a puzzle is drawn here any more. The chip, the difficulty, the
 * gate budget and the restriction all used to be rendered into a column beside
 * the frame, and every one of them is already in the editor's own problem
 * panel a few centimetres away. All this section needs from a puzzle now is
 * enough to label a picker button and address a URL.
 */

/**
 * The problems the picker offers, in order.
 *
 * Three, and short ones: AND from NAND is four gates, and someone can finish
 * it in the frame. A demo nobody can complete is an advert for the scroll bar.
 */
const FEATURED_SLUGS = ["and-from-nand", "two-to-one-multiplexer", "xor-from-scratch"];

export async function PuzzlesShowcase() {
  let puzzles: PuzzleSpec[] = [];
  try {
    puzzles = await listPuzzles();
  } catch {
    puzzles = [];
  }

  const bySlug = new Map(puzzles.map((p) => [p.slug, p]));
  let featured = FEATURED_SLUGS.map((slug) => bySlug.get(slug)).filter(
    (p): p is PuzzleSpec => Boolean(p),
  );
  if (featured.length === 0) featured = puzzles.slice(0, 3);

  const problems: DemoPuzzle[] = featured.map((puzzle) => ({
    slug: puzzle.slug,
    title: puzzle.title,
  }));

  return (
    <section className="py-20">
      <ScrollReveal className="mb-10">
        <SectionHeader
          eyebrow="Logic problems"
          title="Try a logic problem"
          blurb="Pick one, wire up the inside of the chip, and run the tests in the real editor below."
          action={{ href: "/puzzles", label: "Browse all problems" }}
        />
      </ScrollReveal>

      {problems.length === 0 ? (
        <p className="text-sm text-ink-soft">No puzzles in the database yet.</p>
      ) : (
        <ScrollReveal delay={80}>
          <PuzzleDemo puzzles={problems} />
        </ScrollReveal>
      )}
    </section>
  );
}
