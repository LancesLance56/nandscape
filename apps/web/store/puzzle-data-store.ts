import { create } from "zustand";
import type { PuzzleSpec } from "@/types/puzzle";

interface PuzzleRecordResponse {
  puzzle?: { spec: PuzzleSpec } | null;
}

export interface PuzzleDataState {
  bySlug: Record<string, PuzzleSpec>;
  loading: Record<string, boolean>;
  getPuzzle: (slug: string) => PuzzleSpec | undefined;
  fetchPuzzle: (slug: string) => Promise<PuzzleSpec | null>;
}

export const usePuzzleDataStore = create<PuzzleDataState>((set, get) => ({
  bySlug: {},
  loading: {},

  getPuzzle: (slug) => get().bySlug[slug],

  fetchPuzzle: async (slug) => {
    const cached = get().bySlug[slug];
    if (cached) return cached;
    if (get().loading[slug]) return null;

    set((s) => ({ loading: { ...s.loading, [slug]: true } }));
    try {
      const res = await fetch(`/api/puzzles/${slug}`);
      if (!res.ok) return null;
      const body: PuzzleRecordResponse = await res.json();
      const spec = body.puzzle?.spec;
      if (!spec) return null;
      set((s) => ({ bySlug: { ...s.bySlug, [slug]: spec } }));
      return spec;
    } catch {
      return null;
    } finally {
      set((s) => ({ loading: { ...s.loading, [slug]: false } }));
    }
  },
}));