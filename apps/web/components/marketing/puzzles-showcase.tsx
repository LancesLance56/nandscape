import Link from "next/link";
import { listPuzzles } from "@/lib/puzzles/puzzles";
import { DifficultyTag } from "@/components/puzzles/difficulty-tag";
import { DEFAULT_BLOCK_COLORS, hexToRgba } from "@/lib/editor/block-colors";
import { gateTypeToString } from "@nandscape/engine";
import { ScrollReveal } from "@/components/scroll-reveal";
import type { PuzzleSpec } from "@/types/puzzle";

function tagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) >>> 0;
  return DEFAULT_BLOCK_COLORS[hash % DEFAULT_BLOCK_COLORS.length];
}

function restriction(puzzle: PuzzleSpec): string | null {
  if (puzzle.allowedGateTypes?.length) return `${puzzle.allowedGateTypes.map(gateTypeToString).join(", ")} only`;
  if (puzzle.disallowedGateTypes?.length) return `No ${puzzle.disallowedGateTypes.map(gateTypeToString).join(", ")}`;
  return null;
}

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
  let featured = FEATURED_SLUGS.map((slug) => bySlug.get(slug)).filter(
    (p): p is PuzzleSpec => Boolean(p),
  );
  if (featured.length === 0) featured = puzzles.slice(0, 6);

  return (
    <section className="py-20">
      <ScrollReveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 font-mono text-sm font-medium text-copper-dark">
            <span className="h-1.75 w-1.75 rounded-full bg-copper" />
            Practice
          </div>
          <h2 className="font-display text-3xl font-semibold text-ink">Try a Puzzle Yourself!</h2>
        </div>
        <Link
          href="/puzzles"
          className="rounded-xl border border-border-strong/70 bg-surface-card/80 px-4 py-2 text-sm font-semibold text-ink backdrop-blur-sm transition-all hover:border-ink-soft hover:shadow-md active:scale-[0.97]"
        >
          Browse all puzzles →
        </Link>
      </ScrollReveal>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((puzzle, i) => (
          <ScrollReveal key={puzzle.slug} delay={i * 60}>
            <Link
              href={`/puzzles/${puzzle.slug}`}
              className="group flex h-full flex-col gap-3 rounded-2xl border border-border/70 bg-surface-card/85 p-5 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <DifficultyTag difficulty={puzzle.difficulty} />
                <span className="font-mono text-[11px] text-slate">
                  {puzzle.gateBudget !== null ? `≤${puzzle.gateBudget} gates` : "no budget"}
                </span>
              </div>

              <h3 className="font-display text-base font-bold text-ink transition-colors group-hover:text-copper-dark">
                {puzzle.title}
              </h3>
              <p className="line-clamp-2 text-xs leading-relaxed text-ink-soft">{puzzle.description}</p>

              <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
                {puzzle.tags.slice(0, 2).map((tag) => {
                  const color = tagColor(tag);
                  return (
                    <span
                      key={tag}
                      style={{ backgroundColor: hexToRgba(color, 0.12), color }}
                      className="rounded-full px-2 py-0.5 font-mono text-[10px] font-medium"
                    >
                      {tag}
                    </span>
                  );
                })}
                {restriction(puzzle) && (
                  <span className="ml-auto font-mono text-[10px] text-border-strong">{restriction(puzzle)}</span>
                )}
              </div>
            </Link>
          </ScrollReveal>
        ))}
      </div>

      {featured.length === 0 && (
        <p className="text-sm text-ink-soft">No puzzles in the database yet.</p>
      )}
    </section>
  );
}