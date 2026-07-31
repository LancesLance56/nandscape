"use client";

import Link from "next/link";
import { usePuzzleStore } from "@/store/puzzle-store";
import { usePuzzleDataStore } from "@/store/puzzle-data-store";

function BackIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M10 3.5L5 8l5 4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BreadcrumbNav() {
  const activeSlug = usePuzzleStore((s) => s.activePuzzleSlug);
  const puzzle = usePuzzleDataStore((s) => (activeSlug ? s.getPuzzle(activeSlug) : undefined));

  return (
    <Link
      href="/puzzles"
      className="flex min-w-0 items-center gap-1.5 rounded-md py-1 pl-1 pr-2 font-mono text-[13px] font-medium text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
    >
      <BackIcon />
      <span className="truncate" title={puzzle ? puzzle.title : "Back to puzzles"}>
        {puzzle ? puzzle.title : "Sandbox"}
      </span>
    </Link>
  );
}