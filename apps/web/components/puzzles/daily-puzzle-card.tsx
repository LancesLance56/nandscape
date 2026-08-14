import Link from "next/link";
import type { PuzzleSpec } from "@/types/puzzle";
import { DifficultyTag } from "./difficulty-tag";

export function DailyPuzzleCard({ puzzle }: { puzzle: PuzzleSpec }) {
  return (
    <Link
      href={`/puzzles/${puzzle.slug}`}
      className="group mb-8 flex items-center justify-between gap-4 rounded-2xl border border-copper/40 bg-copper-bg/30 px-5 py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-copper/70 hover:shadow-md"
    >
      <div className="flex min-w-0 items-center gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-copper/15 text-xs font-bold text-copper-dark">
          {new Date().toLocaleDateString("en-US", { day: "2-digit" })}
        </span>
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold text-copper-dark">
            <span className="h-1.5 w-1.5 rounded-full bg-copper" />
            Daily puzzle
          </div>
          <p className="truncate font-display text-base font-semibold text-ink">{puzzle.title}</p>
          <p className="mt-0.5 line-clamp-1 text-xs text-ink-soft">{puzzle.description}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <DifficultyTag difficulty={puzzle.difficulty} />
        <span className="rounded-lg border border-border-strong bg-surface-card px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors group-hover:border-copper group-hover:text-copper-dark">
          Solve →
        </span>
      </div>
    </Link>
  );
}
