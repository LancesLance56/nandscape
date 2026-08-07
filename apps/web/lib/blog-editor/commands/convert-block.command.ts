import { defineCommand } from "@/lib/commands/command";
import { useBlogEditorStore } from "@/store/blog-editor-store";
import type { ContentBlock } from "@/types/content-block";

/** Used by the slash-command menu. `fromBlock`/`toBlock` share the same `id` - see convertBlockTo() in block-registry.tsx. */
export function createConvertBlockCommand(id: string, fromBlock: ContentBlock, toBlock: ContentBlock) {
  return defineCommand({
    id: "block.convert",
    label: `Convert to ${toBlock.type}`,
    undoable: true,
    execute: () => useBlogEditorStore.getState().replaceBlock(id, toBlock),
    undo: () => useBlogEditorStore.getState().replaceBlock(id, fromBlock),
  });
}
