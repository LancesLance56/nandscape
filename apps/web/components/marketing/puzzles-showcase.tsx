import Link from "next/link";
import { listPuzzles } from "@/lib/puzzles/puzzles";
import { DifficultyTag } from "@/components/puzzles/difficulty-tag";
import { DEFAULT_BLOCK_COLORS, hexToRgba } from "@/lib/editor/block-colors";
import { gateTypeToString } from "@nandscape/engine";
import { ScrollReveal } from "@/components/scroll-reveal";
import { RowItem, RowList } from "@/components/ui/rail";
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
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-copper-dark">
            <span className="h-1.75 w-1.75 rounded-full bg-copper" />
            Practice
          </div>
          <h2 className="font-display text-3xl font-semibold text-ink">Try a Logic Problem</h2>
        </div>
        <Link
          href="/puzzles"
          className="rounded-xl border border-border-strong/70 bg-surface-card/80 px-4 py-2 text-sm font-semibold text-ink backdrop-blur-sm transition-all hover:border-ink-soft hover:shadow-md active:scale-[0.97]"
        >
          Browse all problems →
        </Link>
      </ScrollReveal>

      <RowList>
        {featured.map((puzzle, i) => (
          <ScrollReveal key={puzzle.slug} delay={i * 50}>
            <RowItem
              href={`/puzzles/${puzzle.slug}`}
              index={String(i + 1).padStart(2, "0")}
              title={puzzle.title}
              description={puzzle.description}
              meta={puzzle.gateBudget !== null ? `≤${puzzle.gateBudget} gates` : "no budget"}
              badges={
                <>
                  <DifficultyTag difficulty={puzzle.difficulty} />
                  {puzzle.tags.slice(0, 2).map((tag) => {
                    const color = tagColor(tag);
                    return (
                      <span
                        key={tag}
                        style={{ backgroundColor: hexToRgba(color, 0.12), color }}
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                      >
                        {tag}
                      </span>
                    );
                  })}
                  {restriction(puzzle) && (
                    <span className="text-[10px] text-slate">{restriction(puzzle)}</span>
                  )}
                </>
              }
            />
          </ScrollReveal>
        ))}
      </RowList>

      {featured.length === 0 && (
        <p className="text-sm text-ink-soft">No puzzles in the database yet.</p>
      )}
    </section>
  );
}