import Link from "next/link";
import { listPuzzles } from "@/lib/puzzles/puzzles";
import { PuzzleChip } from "@/components/puzzles/puzzle-chip";
import { ScrollReveal } from "@/components/scroll-reveal";
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
      <ScrollReveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-copper-dark">
            <span className="h-1.75 w-1.75 rounded-full bg-copper" />
            Practice
          </div>
          <h2 className="font-display text-3xl font-semibold text-ink">Try a Logic Problem</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
            Each one is a chip with its pins named and its gate budget stamped on the lid. What it has to do, and
            whether you managed it, is on the other side of the click. Your job is the inside.
          </p>
        </div>
        <Link
          href="/puzzles"
          className="rounded-xl border border-border-strong/70 bg-surface-card/80 px-4 py-2 text-sm font-semibold text-ink backdrop-blur-sm transition-all hover:border-ink-soft hover:shadow-md active:scale-[0.97]"
        >
          Browse all problems &rarr;
        </Link>
      </ScrollReveal>

      {featured.length === 0 ? (
        <p className="text-sm text-ink-soft">No puzzles in the database yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((puzzle, i) => (
            <ScrollReveal key={puzzle.slug} delay={i * 50}>
              <Link
                href={`/puzzles/${puzzle.slug}`}
                className="group flex h-full items-center justify-center rounded-2xl border border-border bg-surface-card p-4 transition-[transform,border-color,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:border-copper/40 hover:shadow-[0_18px_36px_-24px_rgba(20,27,20,0.5)] motion-reduce:transition-none"
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
