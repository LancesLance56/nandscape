import { defineCommand } from "@/lib/commands/command";
import { useBlogEditorStore } from "@/store/blog-editor-store";
import type { ContentBlock } from "@/types/content-block";

/** Mirror of insert-block.command.ts: `block`/`atIndex` are the block's state right before removal. */
export function createRemoveBlockCommand(block: ContentBlock, atIndex: number) {
  return defineCommand({
    id: "block.remove",
    label: `Delete ${block.type}`,
    undoable: true,
    execute: () => useBlogEditorStore.getState().removeBlock(block.id),
    undo: () => useBlogEditorStore.getState().insertBlockAt(atIndex, block),
  });
}
