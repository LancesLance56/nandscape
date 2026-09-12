import { gateTypeToString } from "@nandscape/engine";
import { listPuzzles } from "@/lib/puzzles/puzzles";
import { PuzzleChip } from "@/components/puzzles/puzzle-chip";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SectionHeader } from "./section-header";
import { PuzzleDemo, type DemoPuzzle } from "./puzzle-demo";
import type { PuzzleSpec } from "@/types/puzzle";

/**
 * The logic problems block, sitting directly below the coding problems.
 *
 * Both sections now contain the problem rather than describing it, and both
 * are built the same way: a picker, one framed card, the real editor inside
 * it. What they must not share is the artwork, or the page reads as one
 * section printed twice - so this one keeps the chip. A logic problem is a
 * package with its pins named and its gate budget stamped on the lid, which is
 * a different kind of object from a function signature and a code editor.
 *
 * The chip is drawn here rather than in the client component next door, so
 * PuzzleSpec - test cases, display groups and all - never has to be serialized
 * into the page. Only the drawing travels.
 */

/**
 * The problems the picker offers, in order.
 *
 * Three, and short ones: AND from NAND is four gates, and someone can finish
 * it in the frame. A demo nobody can complete is an advert for the scroll bar.
 */
const FEATURED_SLUGS = ["and-from-nand", "two-to-one-multiplexer", "xor-from-scratch"];

/** The gate restriction, in the words the puzzle page uses. */
function restriction(puzzle: PuzzleSpec): string | null {
  if (puzzle.allowedGateTypes?.length) {
    return `${puzzle.allowedGateTypes.map(gateTypeToString).join("/")} only`;
  }
  if (puzzle.disallowedGateTypes?.length) {
    return `no ${puzzle.disallowedGateTypes.map(gateTypeToString).join("/")}`;
  }
  return null;
}

/** Gate budget and gate restriction, as the two lines the card prints. */
function constraintsOf(puzzle: PuzzleSpec): string[] {
  const lines: string[] = [];
  if (puzzle.gateBudget !== null) {
    lines.push(`${puzzle.gateBudget} gate${puzzle.gateBudget === 1 ? "" : "s"} or fewer`);
  }
  const limit = restriction(puzzle);
  if (limit) lines.push(limit);
  return lines;
}

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
    difficulty: puzzle.difficulty,
    description: puzzle.description,
    constraints: constraintsOf(puzzle),
    chip: <PuzzleChip puzzle={puzzle} className="w-full" />,
  }));

  return (
    <section className="py-20">
      <ScrollReveal className="mb-10">
        <SectionHeader
          eyebrow="Logic problems"
          title="Try a logic problem"
          blurb="A chip with its pins named and its gate budget stamped on the lid, waiting for you to wire up the inside."
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
