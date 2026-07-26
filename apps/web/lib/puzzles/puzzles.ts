import type { PuzzleSpec } from "@/types/puzzle";
import { DEFAULT_PUZZLES, getDefaultPuzzle } from "./default-puzzles";

export async function listPuzzles(): Promise<PuzzleSpec[]> {
  return DEFAULT_PUZZLES;
}

export async function getPuzzleBySlug(slug: string): Promise<PuzzleSpec | null> {
  return getDefaultPuzzle(slug) ?? null;
}