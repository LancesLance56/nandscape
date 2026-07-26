import { create } from "zustand";
import type { EditorNode, EditorEdge } from "@/types/editor";

export interface PuzzleProgressEntry {
  solved: boolean;
  solvedAt: string | null;
  nodes: EditorNode[];
  edges: EditorEdge[];
  updatedAt: string;
}

export type PuzzleProgressStatus = "unknown" | "loading" | "loaded" | "signed-out" | "error";

export interface SaveProgressPatch {
  nodes?: EditorNode[];
  edges?: EditorEdge[];
  solved?: boolean;
}

export interface PuzzleProgressState {
  status: PuzzleProgressStatus;
  bySlug: Record<string, PuzzleProgressEntry>;

  loadAll: () => Promise<void>;
  loadOne: (slug: string) => Promise<PuzzleProgressEntry | null>;
  lastSaveError: string | null;
  save: (slug: string, patch: SaveProgressPatch) => Promise<void>;
  isSolved: (slug: string) => boolean;
}

export const usePuzzleProgressStore = create<PuzzleProgressState>((set, get) => ({
  status: "unknown",
  bySlug: {},
  lastSaveError: "",

  loadAll: async () => {
    set({ status: "loading" });
    try {
      const res = await fetch("/api/puzzle-progress");
      if (res.status === 401) {
        set({ status: "signed-out", bySlug: {} });
        return;
      }
      if (!res.ok) {
        set({ status: "error" });
        return;
      }
      const body = await res.json();
      const bySlug: Record<string, PuzzleProgressEntry> = {};
      for (const entry of body.progress as (PuzzleProgressEntry & { puzzleSlug: string })[]) {
        bySlug[entry.puzzleSlug] = entry;
      }
      set({ status: "loaded", bySlug });
    } catch {
      set({ status: "error" });
    }
  },

  loadOne: async (slug) => {
    try {
      const res = await fetch(`/api/puzzle-progress/${slug}`);
      if (!res.ok) return null;
      const body = await res.json();
      if (!body.progress) return null;
      const entry: PuzzleProgressEntry = body.progress;
      set((state) => ({ bySlug: { ...state.bySlug, [slug]: entry } }));
      return entry;
    } catch {
      return null;
    }
  },

save: async (slug, patch) => {
  try {
    const res = await fetch(`/api/puzzle-progress/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      set({ lastSaveError: `Save failed (${res.status})` });
      return;
    }
    const body = await res.json();
    const entry: PuzzleProgressEntry = body.progress;
    set((state) => ({ bySlug: { ...state.bySlug, [slug]: entry }, lastSaveError: null }));
  } catch (err) {
    set({ lastSaveError: err instanceof Error ? err.message : "Save failed" });
  }
},

  isSolved: (slug) => get().bySlug[slug]?.solved === true,
}));