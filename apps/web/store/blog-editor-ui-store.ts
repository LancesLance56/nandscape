import { create } from "zustand";
import { persist } from "zustand/middleware";

export type BlogEditorViewMode = "split" | "edit" | "preview";

export interface BlogEditorUiState {
  viewMode: BlogEditorViewMode;
  setViewMode: (mode: BlogEditorViewMode) => void;
  /** Split view only: pair each block with its rendered preview in a shared grid row, instead of two independent columns. */
  alignBlocks: boolean;
  setAlignBlocks: (align: boolean) => void;
}

export const useBlogEditorUiStore = create<BlogEditorUiState>()(
  persist(
    (set) => ({
      viewMode: "split",
      setViewMode: (mode) => set({ viewMode: mode }),
      alignBlocks: true,
      setAlignBlocks: (align) => set({ alignBlocks: align }),
    }),
    {
      name: "nandscape-blog-editor-ui",
      version: 2,
    },
  ),
);
