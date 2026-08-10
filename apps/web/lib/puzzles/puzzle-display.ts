import type { PuzzleSpec } from "@/types/puzzle";

// FNV-1a: fast, deterministic, good-enough distribution for display ordering.
// Not cryptographic, doesn't need to be.
function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Stable shuffle keyed off each item's identity rather than Math.random().
 * The list still looks scrambled (not grouped by difficulty), but the order
 * is a pure function of the slugs, so server- and client-rendered markup
 * agree and the table doesn't reshuffle itself on every filter keystroke.
 */
export function shuffleDeterministic<T>(items: T[], keyFn: (item: T) => string): T[] {
  return [...items].sort((a, b) => hashString(keyFn(a)) - hashString(keyFn(b)));
}

const DAY_MS = 24 * 60 * 60 * 1000;
// Arbitrary fixed reference point; only the delta in days matters.
const EPOCH = Date.UTC(2024, 0, 1);

function daysSince(date: Date): number {
  const utcMidnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((utcMidnight - EPOCH) / DAY_MS);
}

/**
 * Rotates through every puzzle once per (UTC) day, cycling in slug order so
 * the sequence is independent of DB insertion order and identical for every
 * visitor. No table or admin curation needed: "today's puzzle" is a pure
 * function of the date and the current puzzle set.
 */
export function getDailyPuzzle(puzzles: PuzzleSpec[], date: Date = new Date()): PuzzleSpec | null {
  if (puzzles.length === 0) return null;
  const cycle = [...puzzles].sort((a, b) => a.slug.localeCompare(b.slug));
  const index = ((daysSince(date) % cycle.length) + cycle.length) % cycle.length;
  return cycle[index];
}
