import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { PuzzleList } from "@/components/puzzles/puzzle-list";
import { DailyPuzzleCard } from "@/components/puzzles/daily-puzzle-card";
import { listPuzzles } from "@/lib/puzzles/puzzles";
import { getDailyPuzzle } from "@/lib/puzzles/puzzle-display";
import type { PuzzleSpec } from "@/types/puzzle";

export const metadata: Metadata = {
  title: "Puzzles,  Nandscape",
  description: "Browse logic-gate puzzles, filter by difficulty and topic, and start solving.",
};

export const revalidate = 60;

export default async function PuzzlesPage() {
  // Defensive: this page has no dynamic segment, so Next tries to statically
  // render it at build time, when the DB may not be reachable yet (e.g.
  // building the Docker image before postgres is networked in).
  let puzzles: PuzzleSpec[] = [];
  try {
    puzzles = await listPuzzles();
  } catch {
    puzzles = [];
  }

  const dailyPuzzle = getDailyPuzzle(puzzles);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-330 px-6 pb-24 pt-32 sm:px-10">
        <div className="mb-8 max-w-2xl">
          <div className="mb-3 flex items-center gap-2 font-mono text-sm font-medium text-copper-dark">
            <span className="h-1.75 w-1.75 rounded-full bg-copper" />
            Nandscape puzzles
          </div>
          <h1 className="font-display text-4xl font-semibold leading-tight text-ink">Problems</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Each puzzle gives you a goal, a gate budget, and sometimes a restriction on which blocks you have. Design inspired by leetcode.
          </p>
        </div>

        {dailyPuzzle && <DailyPuzzleCard puzzle={dailyPuzzle} />}

        <PuzzleList puzzles={puzzles} dailyPuzzleSlug={dailyPuzzle?.slug} />
      </main>
    </>
  );
}