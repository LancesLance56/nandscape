import { create } from "zustand";
import { persist } from "zustand/middleware";

export type BlogEditorViewMode = "split" | "edit" | "preview";

export interface BlogEditorUiState {
  viewMode: BlogEditorViewMode;
  setViewMode: (mode: BlogEditorViewMode) => void;
  /** Split view only: scrolling one pane scrolls the other to the same block. */
  syncScroll: boolean;
  setSyncScroll: (sync: boolean) => void;
}

export const useBlogEditorUiStore = create<BlogEditorUiState>()(
  persist(
    (set) => ({
      viewMode: "split",
      setViewMode: (mode) => set({ viewMode: mode }),
      syncScroll: true,
      setSyncScroll: (sync) => set({ syncScroll: sync }),
    }),
    {
      name: "nandscape-blog-editor-ui",
      version: 2,
    },
  ),
);
