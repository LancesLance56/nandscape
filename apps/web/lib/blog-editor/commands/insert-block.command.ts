import { defineCommand } from "@/lib/commands/command";
import { useBlogEditorStore } from "@/store/blog-editor-store";
import type { ContentBlock } from "@/types/content-block";

/**
 * Covers both "add a new block" and "duplicate an existing block" - both are
 * the same operation from history's point of view (insert this exact block
 * object at this index; undo removes it by id), so callers just supply a
 * different label rather than this having two near-identical siblings.
 * `block`/`atIndex` are captured once by the caller at dispatch time, same
 * pattern as add-node.command.ts.
 */
export function createInsertBlockCommand(block: ContentBlock, atIndex: number, label: string) {
  return defineCommand({
    id: "block.insert",
    label,
    undoable: true,
    execute: () => useBlogEditorStore.getState().insertBlockAt(atIndex, block),
    undo: () => useBlogEditorStore.getState().removeBlock(block.id),
  });
}
