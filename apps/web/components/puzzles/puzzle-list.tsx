"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { gateTypeToString } from "@nandscape/engine";
import type { PuzzleDifficulty, PuzzleSpec } from "@/types/puzzle";
import { DifficultyTag } from "./difficulty-tag";
import { DEFAULT_BLOCK_COLORS, hexToRgba } from "@/lib/editor/block-colors";
import { usePuzzleProgressStore } from "@/store/puzzle-progress-store";
import { shuffleDeterministic } from "@/lib/puzzles/puzzle-display";

type DifficultyFilter = "all" | PuzzleDifficulty;

const DIFFICULTY_FILTERS: DifficultyFilter[] = ["all", "easy", "medium", "hard", "expert"];

function tagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) >>> 0;
  return DEFAULT_BLOCK_COLORS[hash % DEFAULT_BLOCK_COLORS.length];
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M13.2 13.2 18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-3 w-3" aria-hidden="true">
      <path d="M4 10.5 8 14.5 16 5.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatusDot({ solved, signedOut }: { solved: boolean; signedOut: boolean }) {
  if (solved) {
    return (
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-signal-green text-white">
        <CheckIcon />
      </span>
    );
  }

  return (
    <span
      title={signedOut ? "Sign in to track your progress" : undefined}
      className="inline-flex h-4 w-4 items-center justify-center rounded-full border-2 border-border-strong"
    />
  );
}

function ProgressRing({ solved, total, signedOut }: { solved: number; total: number; signedOut: boolean }) {
  const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
  const complete = total > 0 && solved === total;

  return (
    <span
      title={signedOut ? "Sign in to track your progress" : `${solved} of ${total} solved`}
      className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
      style={{
        background:
          pct > 0
            ? `conic-gradient(var(--signal-green) ${pct}%, var(--border-strong) 0)`
            : "var(--border-strong)",
      }}
    >
      <span className="absolute inset-[2.5px] rounded-full bg-surface-card" />
      {complete && <span className="relative z-10 text-signal-green-strong"><CheckIcon /></span>}
    </span>
  );
}

function formatRestriction(puzzle: PuzzleSpec): string {
  if (puzzle.allowedGateTypes && puzzle.allowedGateTypes.length > 0) {
    return `${puzzle.allowedGateTypes.map(gateTypeToString).join(", ")} only`;
  }
  if (puzzle.disallowedGateTypes && puzzle.disallowedGateTypes.length > 0) {
    return `No ${puzzle.disallowedGateTypes.map(gateTypeToString).join(", ")}`;
  }
  return "No restriction";
}

export function PuzzleList({ puzzles, dailyPuzzleSlug }: { puzzles: PuzzleSpec[]; dailyPuzzleSlug?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("all");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Deliberately not sorted by difficulty: order is scrambled once, based on
  // slug identity, so it looks mixed up but stays put across renders/filters
  // and matches between server and client.
  const shuffled = useMemo(() => shuffleDeterministic(puzzles, (p) => p.slug), [puzzles]);

  const progressStatus = usePuzzleProgressStore((s) => s.status);
  const progressBySlug = usePuzzleProgressStore((s) => s.bySlug);
  const loadAllProgress = usePuzzleProgressStore((s) => s.loadAll);
  const signedOut = progressStatus === "signed-out";

  useEffect(() => {
    void loadAllProgress();
  }, [loadAllProgress]);

  const solvedCount = useMemo(
    () => puzzles.filter((p) => progressBySlug[p.slug]?.solved).length,
    [puzzles, progressBySlug],
  );

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const puzzle of puzzles) {
      for (const tag of puzzle.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [puzzles]);

  const difficultyCounts = useMemo(() => {
    const counts: Record<DifficultyFilter, number> = { all: puzzles.length, easy: 0, medium: 0, hard: 0, expert: 0 };
    for (const puzzle of puzzles) counts[puzzle.difficulty]++;
    return counts;
  }, [puzzles]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return shuffled
      .filter((p) => (difficulty === "all" ? true : p.difficulty === difficulty))
      .filter((p) => (activeTag ? p.tags.includes(activeTag) : true))
      .filter((p) => (q ? p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) : true));
  }, [shuffled, query, activeTag, difficulty]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate">
            <SearchIcon />
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search puzzles"
            className="w-full rounded-xl border border-border-strong bg-surface-card py-2 pl-9 pr-3 text-sm text-ink outline-none"
          />
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-slate">
          <ProgressRing solved={solvedCount} total={puzzles.length} signedOut={signedOut} />
          {solvedCount} / {puzzles.length} Solved
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tagCounts.map(([tag, count]) => {
          const color = tagColor(tag);
          const active = activeTag === tag;
          return (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag((prev) => (prev === tag ? null : tag))}
              style={{
                color,
                borderColor: active ? color : hexToRgba(color, 0.35),
                backgroundColor: active ? hexToRgba(color, 0.18) : hexToRgba(color, 0.08),
              }}
              className="rounded-full border px-3 py-1 font-mono text-[11px] font-medium transition-colors hover:brightness-110"
            >
              {tag} <span className="opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 border-b border-border pb-1">
        {DIFFICULTY_FILTERS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDifficulty(d)}
            className={`rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition-colors ${
              difficulty === d ? "bg-surface-2 text-ink" : "text-ink-soft hover:bg-surface-2/60 hover:text-ink"
            }`}
          >
            {d === "all" ? "All" : d[0].toUpperCase() + d.slice(1)} ({difficultyCounts[d]})
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface-card">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-surface-2 font-mono text-[11px] uppercase tracking-wider text-slate">
              <th className="w-10 px-4 py-3" aria-label="Status" />
              <th className="px-4 py-3">Title</th>
              <th className="hidden px-4 py-3 md:table-cell">Tags</th>
              <th className="hidden px-4 py-3 lg:table-cell">Restriction</th>
              <th className="px-4 py-3 text-right">Difficulty</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((puzzle, index) => (
              <tr
                key={puzzle.slug}
                onClick={() => router.push(`/puzzles/${puzzle.slug}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/puzzles/${puzzle.slug}`);
                  }
                }}
                role="button"
                tabIndex={0}
                className="cursor-pointer border-t border-border transition-colors hover:bg-surface-2/60 focus-visible:outline-none focus-visible:bg-surface-2/60"
              >
                <td className="px-4 py-3">
                  <StatusDot solved={progressBySlug[puzzle.slug]?.solved === true} signedOut={signedOut} />
                </td>
                <td className="px-4 py-3">
                  <p className="flex items-center gap-2 font-semibold text-ink">
                    {index + 1}. {puzzle.title}
                    {puzzle.slug === dailyPuzzleSlug && (
                      <span className="rounded-full bg-copper/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-copper-dark">
                        Today
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-ink-soft">{puzzle.description}</p>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <div className="flex flex-wrap gap-1.5">
                    {puzzle.tags.map((tag) => {
                      const color = tagColor(tag);
                      return (
                        <span
                          key={tag}
                          style={{ backgroundColor: hexToRgba(color, 0.14), color }}
                          className="rounded-full px-2 py-0.5 font-mono text-[10px] font-medium"
                        >
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                </td>
                <td className="hidden px-4 py-3 font-mono text-xs text-slate lg:table-cell">
                  {formatRestriction(puzzle)}
                  {puzzle.gateBudget !== null && (
                    <span className="text-border-strong"> · budget {puzzle.gateBudget}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <DifficultyTag difficulty={puzzle.difficulty} />
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate">
                  No puzzles match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}