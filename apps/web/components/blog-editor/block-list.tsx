"use client";

import { Fragment, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useBlogEditorStore } from "@/store/blog-editor-store";
import { BlockCard, BlockCardGhost } from "@/components/blog-editor/block-card";
import { AddBlockMenu } from "@/components/blog-editor/add-block-menu";
import { createReorderBlockCommand, createConvertBlockCommand } from "@/lib/blog-editor/commands";
import { convertBlockTo } from "@/lib/blog-editor/block-registry";
import { useCommandDispatch } from "@/hooks/use-command";
import { BlockConversionProvider, type ConvertBlock } from "@/components/blog-editor/block-conversion-context";
import type { ContentBlock } from "@/types/content-block";

export function BlockList({
  renderCompanion,
}: {
  /**
   * Split view only. Rendered as the second grid column of each block's
   * row, so the two panes share one scroll and line up block-for-block
   * instead of drifting apart as their heights diverge - CSS grid sizes
   * each row to its tallest cell natively, no scroll math needed.
   */
  renderCompanion?: (block: ContentBlock) => ReactNode;
}) {
  const blocks = useBlogEditorStore((s) => s.blocks);
  const dispatch = useCommandDispatch();
  const [draggingBlock, setDraggingBlock] = useState<ContentBlock | null>(null);

  const convertBlock: ConvertBlock = (id, targetType) => {
    const block = blocks.find((b) => b.id === id);
    if (!block || block.type === targetType) return;
    dispatch(createConvertBlockCommand(id, block, convertBlockTo(block, targetType)));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingBlock(blocks.find((block) => block.id === event.active.id) ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingBlock(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = blocks.findIndex((block) => block.id === active.id);
    const to = blocks.findIndex((block) => block.id === over.id);
    if (from === -1 || to === -1) return;
    dispatch(createReorderBlockCommand(from, to));
  };

  const isSplit = Boolean(renderCompanion);

  return (
    <BlockConversionProvider value={convertBlock}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDraggingBlock(null)}
      >
        <SortableContext items={blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
          <div className={isSplit ? "grid grid-cols-2 items-start gap-x-10 gap-y-0.5" : "flex flex-col gap-0.5"}>
            {blocks.map((block, index) => (
              <Fragment key={block.id}>
                <BlockCard block={block} index={index} total={blocks.length} />
                {renderCompanion?.(block)}
              </Fragment>
            ))}
            {blocks.length === 0 && (
              <p
                className={`rounded-lg border border-dashed border-border-strong px-4 py-6 text-center text-sm text-slate ${
                  isSplit ? "col-span-2" : "mb-2"
                }`}
              >
                No blocks yet.
              </p>
            )}
            <div className={isSplit ? "col-span-2" : undefined}>
              <AddBlockMenu atIndex={blocks.length} />
            </div>
          </div>
        </SortableContext>

        <DragOverlay>{draggingBlock && <BlockCardGhost block={draggingBlock} />}</DragOverlay>
      </DndContext>
    </BlockConversionProvider>
  );
}
