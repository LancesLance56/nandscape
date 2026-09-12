import Link from "next/link";
import { listPuzzles } from "@/lib/puzzles/puzzles";
import { PuzzleChip } from "@/components/puzzles/puzzle-chip";
import { ScrollReveal } from "@/components/scroll-reveal";
import { cn } from "@/lib/cn";
import { SectionHeader, TILE_CLASS } from "./section-header";
import type { PuzzleSpec } from "@/types/puzzle";

/**
 * The puzzles block: a tray of chips waiting to be filled in.
 *
 * Each problem is drawn as the package it asks you to build - see PuzzleChip,
 * which is the same component the worked example on this page uses, so the
 * problem you are shown solved and the problems you are offered look like the
 * same kind of object.
 */
const FEATURED_SLUGS = [
  "and-from-nand",
  "two-to-one-multiplexer",
  "xor-from-scratch",
  "sr-latch-1-bit-memory",
  "full-adder-no-xor",
  "gated-d-latch-nor-only",
];

export async function PuzzlesShowcase() {
  let puzzles: PuzzleSpec[] = [];
  try {
    puzzles = await listPuzzles();
  } catch {
    puzzles = [];
  }

  const bySlug = new Map(puzzles.map((p) => [p.slug, p]));
  let featured = FEATURED_SLUGS.map((slug) => bySlug.get(slug)).filter((p): p is PuzzleSpec => Boolean(p));
  if (featured.length === 0) featured = puzzles.slice(0, 6);

  return (
    <section className="py-20">
      <ScrollReveal className="mb-10">
        <SectionHeader
          eyebrow="Logic problems"
          title="Try a logic problem"
          blurb="Each one is a chip with its pins named and its gate budget stamped on the lid. What it has to do, and whether you managed it, is on the other side of the click. Your job is the inside."
          action={{ href: "/puzzles", label: "Browse all problems" }}
        />
      </ScrollReveal>

      {featured.length === 0 ? (
        <p className="text-sm text-ink-soft">No puzzles in the database yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((puzzle, i) => (
            <ScrollReveal key={puzzle.slug} delay={i * 50}>
              <Link
                href={`/puzzles/${puzzle.slug}`}
                className={cn(TILE_CLASS, "items-center justify-center")}
              >
                <PuzzleChip puzzle={puzzle} className="w-full" />
              </Link>
            </ScrollReveal>
          ))}
        </div>
      )}
    </section>
  );
}
