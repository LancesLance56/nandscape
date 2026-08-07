import { defineCommand } from "@/lib/commands/command";
import { useBlogEditorStore } from "@/store/blog-editor-store";

/**
 * Covers both the up/down move buttons and drag-and-drop - both end up as a
 * single-item relocation from `fromIndex` to `toIndex`. `arrayMove`'s own
 * inverse is itself with the indices swapped (remove-at-j/insert-at-i undoes
 * remove-at-i/insert-at-j), so undo doesn't need to re-derive anything.
 */
export function createReorderBlockCommand(fromIndex: number, toIndex: number, label = "Reorder blocks") {
  return defineCommand({
    id: "block.reorder",
    label,
    undoable: true,
    execute: () => useBlogEditorStore.getState().reorderBlock(fromIndex, toIndex),
    undo: () => useBlogEditorStore.getState().reorderBlock(toIndex, fromIndex),
  });
}
