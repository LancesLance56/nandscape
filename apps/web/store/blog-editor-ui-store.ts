import { create } from "zustand";
import { persist } from "zustand/middleware";

export type BlogEditorViewMode = "split" | "edit" | "preview";

export interface BlogEditorUiState {
  viewMode: BlogEditorViewMode;
  setViewMode: (mode: BlogEditorViewMode) => void;
}

export const useBlogEditorUiStore = create<BlogEditorUiState>()(
  persist(
    (set) => ({
      viewMode: "split",
      setViewMode: (mode) => set({ viewMode: mode }),
    }),
    {
      name: "nandscape-blog-editor-ui",
      version: 1,
    },
  ),
);
