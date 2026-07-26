import { create } from "zustand";

export type PuzzleRunStatus = "idle" | "running" | "passed" | "failed";

export interface PuzzleCaseResult {
  index: number;
  passed: boolean;
  detail: string;
}

export interface PuzzleState {
  activePuzzleSlug: string | null;
  runStatus: PuzzleRunStatus;
  caseResults: PuzzleCaseResult[];
  structuralError: string | null;

  setActivePuzzle: (slug: string | null) => void;
  startRun: () => void;
  finishRun: (passed: boolean, caseResults: PuzzleCaseResult[], structuralError?: string | null) => void;
  reset: () => void;
}

export const usePuzzleStore = create<PuzzleState>((set) => ({
  activePuzzleSlug: null,
  runStatus: "idle",
  caseResults: [],
  structuralError: null,

  setActivePuzzle: (slug) =>
    set({ activePuzzleSlug: slug, runStatus: "idle", caseResults: [], structuralError: null }),

  startRun: () => set({ runStatus: "running", caseResults: [], structuralError: null }),

  finishRun: (passed, caseResults, structuralError = null) =>
    set({ runStatus: passed ? "passed" : "failed", caseResults, structuralError }),

  reset: () => set({ runStatus: "idle", caseResults: [], structuralError: null }),
}));