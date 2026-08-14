import { create } from "zustand";
import { arrayMove } from "@dnd-kit/sortable";
import type { ContentBlock } from "@/types/content-block";
import { createDocument, updateDocument } from "@/lib/blog-editor/api";
import { emptyMetadata, type DocumentKind, type DocumentMetadata } from "@/lib/blog-editor/types";
import { useHistoryStore } from "@/store/history-store";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface BlogEditorState {
  documentKind: DocumentKind;
  originalSlug: string | null;
  metadata: DocumentMetadata;
  blocks: ContentBlock[];
  selectedBlockId: string | null;
  lastLoadedAt: number;

  saveStatus: SaveStatus;
  saveError: string | null;

  loadDocument: (
    kind: DocumentKind,
    originalSlug: string | null,
    metadata: DocumentMetadata,
    blocks: ContentBlock[],
  ) => void;
  setMetadata: (patch: Partial<DocumentMetadata>) => void;

  /**
   * Raw, history-unaware mutations. UI never calls these directly for
   * structural edits (add/remove/duplicate/reorder/convert) - it dispatches
   * a Command built from lib/blog-editor/commands/* through useHistoryStore,
   * the same split the circuit editor uses between editor-store's addNode
   * and add-node.command.ts. updateBlock is the one exception: field-level
   * typing has no command wrapping it (see updateBlock's own comment).
   */
  insertBlockAt: (index: number, block: ContentBlock) => void;
  removeBlock: (id: string) => void;
  reorderBlock: (fromIndex: number, toIndex: number) => void;
  replaceBlock: (id: string, block: ContentBlock) => void;

  updateBlock: (id: string, patch: Record<string, unknown>) => void;
  selectBlock: (id: string | null) => void;

  save: () => Promise<void>;
}

export const useBlogEditorStore = create<BlogEditorState>((set, get) => ({
  documentKind: "post",
  originalSlug: null,
  metadata: emptyMetadata(),
  blocks: [],
  selectedBlockId: null,
  lastLoadedAt: 0,
  saveStatus: "idle",
  saveError: null,

  loadDocument: (kind, originalSlug, metadata, blocks) => {
    // Undo history is a process-wide singleton shared with the circuit
    // editor (see history-store.ts) - clear it on every document load so
    // switching documents (or arriving here from /logic-editor) can't leave a
    // stale, cross-document command on the stack.
    useHistoryStore.getState().clear();
    set({
      documentKind: kind,
      originalSlug,
      metadata,
      blocks,
      selectedBlockId: null,
      lastLoadedAt: Date.now(),
      saveStatus: "idle",
      saveError: null,
    });
  },

  setMetadata: (patch) => set((state) => ({ metadata: { ...state.metadata, ...patch } })),

  insertBlockAt: (index, block) =>
    set((state) => {
      const blocks = [...state.blocks];
      blocks.splice(index, 0, block);
      return { blocks, selectedBlockId: block.id };
    }),

  removeBlock: (id) =>
    set((state) => ({
      blocks: state.blocks.filter((block) => block.id !== id),
      selectedBlockId: state.selectedBlockId === id ? null : state.selectedBlockId,
    })),

  reorderBlock: (fromIndex, toIndex) =>
    set((state) => {
      if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return state;
      if (fromIndex >= state.blocks.length || toIndex >= state.blocks.length) return state;
      return { blocks: arrayMove(state.blocks, fromIndex, toIndex) };
    }),

  replaceBlock: (id, block) =>
    set((state) => ({
      blocks: state.blocks.map((existing) => (existing.id === id ? block : existing)),
      selectedBlockId: id,
    })),

  /**
   * Deliberately NOT run through a Command. Field edits fire on every
   * keystroke (or on blur - see paragraph-block-editor.tsx), and wrapping
   * each one would flood the 200-entry history stack in seconds and make
   * Ctrl+Z undo one character at a time. Structural edits (insert/remove/
   * reorder/convert) go through commands because they're the operations
   * users actually reach for undo after; typing already gets undo for free
   * from the browser's native input undo (global shortcuts skip focused
   * inputs - see use-blog-editor-shortcuts.ts) and, for paragraph rich
   * text, from Lexical's own HistoryPlugin.
   */
  updateBlock: (id, patch) =>
    set((state) => ({
      blocks: state.blocks.map((block) => (block.id === id ? ({ ...block, ...patch } as ContentBlock) : block)),
    })),

  selectBlock: (id) => set({ selectedBlockId: id }),

  save: async () => {
    const { documentKind, originalSlug, metadata, blocks } = get();
    if (!metadata.slug.trim()) {
      set({ saveStatus: "error", saveError: "Slug is required before saving." });
      return;
    }

    set({ saveStatus: "saving", saveError: null });
    try {
      if (originalSlug) {
        await updateDocument(documentKind, originalSlug, metadata, blocks);
      } else {
        await createDocument(documentKind, metadata, blocks);
      }
      set({ saveStatus: "saved", originalSlug: metadata.slug });
    } catch (error) {
      set({ saveStatus: "error", saveError: error instanceof Error ? error.message : "Save failed." });
    }
  },
}));
