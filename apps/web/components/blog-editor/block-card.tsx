"use client";

import { useState, type ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { blockRegistry, newId, type BlockDefinition } from "@/lib/blog-editor/block-registry";
import { BLOCK_ACCENT, hexToRgba } from "@/lib/blog-editor/block-accent";
import { useBlogEditorStore } from "@/store/blog-editor-store";
import { createInsertBlockCommand, createRemoveBlockCommand, createReorderBlockCommand } from "@/lib/blog-editor/commands";
import { useCommandDispatch } from "@/hooks/use-command";
import { BlockInspector } from "@/components/blog-editor/blocks/block-inspector";
import { AddBlockMenu } from "@/components/blog-editor/add-block-menu";
import type { ContentBlock } from "@/types/content-block";

function GripIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="3" r="1.2" />
      <circle cx="11" cy="3" r="1.2" />
      <circle cx="5" cy="8" r="1.2" />
      <circle cx="11" cy="8" r="1.2" />
      <circle cx="5" cy="13" r="1.2" />
      <circle cx="11" cy="13" r="1.2" />
    </svg>
  );
}

function DuplicateIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.3" />
      <path d="M2.5 10.5V3.3a.8.8 0 0 1 .8-.8h7.2" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5V13a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Small ghost icon buttons for the hover toolbar - deliberately not the
// shared <Button> component, which is sized for standalone actions (Save,
// New post) and reads as too heavy packed three-in-a-row inside a block.
function IconButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-surface hover:text-ink disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}

export function BlockCard({ block, index, total }: { block: ContentBlock; index: number; total: number }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const dispatch = useCommandDispatch();

  const definition = blockRegistry[block.type] as unknown as BlockDefinition;
  const issues = definition.validate?.(block as never) ?? [];
  const Editor = definition.Editor;
  const accent = BLOCK_ACCENT[block.type];

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  return (
    <div
      ref={setNodeRef}
      data-block-id={block.id}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group relative rounded-lg pl-14 pr-1 ${
        isDragging ? "z-10 bg-surface-2/60 shadow-lg ring-1 ring-copper/30" : ""
      }`}
    >
      {/* Gutter: insert-above and drag handle, hidden until hovered - this
          replaces a "+ Add block" control that used to sit between every
          pair of blocks (see block-list.tsx). Stays visible while the
          insert menu itself is open, even if the cursor has moved into a
          dropdown that renders below the hoverable area (see
          add-block-menu.tsx's onOpenChange). */}
      <div
        className={`pointer-events-none absolute left-0 top-1.5 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 ${
          addMenuOpen ? "!pointer-events-auto !opacity-100" : ""
        }`}
      >
        <AddBlockMenu atIndex={index} variant="icon" onOpenChange={setAddMenuOpen} />
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="flex h-6 w-6 cursor-grab items-center justify-center rounded-md text-border-strong transition-colors hover:bg-surface hover:text-ink-soft active:cursor-grabbing"
        >
          <GripIcon />
        </button>
      </div>

      {/* Hover toolbar: type tag + move/duplicate/delete. Floats above the
          block's own border rather than inside it - the label text is too
          variable in width (e.g. "Comparison slider") to reserve a
          permanent right-side gutter the way the left drag handle does
          without eating into the editing width on every block. Validation
          dot stays visible even without hovering - it's information the
          author should notice, not a control. */}
      <div className="absolute -top-8 right-1 z-10 flex items-center gap-1 rounded-md border border-border bg-surface-card/95 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
        <span
          className="px-1.5 text-[10px] font-semibold"
          style={accent ? { color: accent } : undefined}
        >
          {definition.label}
        </span>
        <IconButton
          label="Move up"
          disabled={index === 0}
          onClick={() => dispatch(createReorderBlockCommand(index, index - 1))}
        >
          ↑
        </IconButton>
        <IconButton
          label="Move down"
          disabled={index === total - 1}
          onClick={() => dispatch(createReorderBlockCommand(index, index + 1))}
        >
          ↓
        </IconButton>
        <IconButton
          label="Duplicate"
          onClick={() => {
            const clone: ContentBlock = { ...block, id: newId(block.type) };
            dispatch(createInsertBlockCommand(clone, index + 1, `Duplicate ${definition.label}`));
          }}
        >
          <DuplicateIcon />
        </IconButton>
        <IconButton label="Delete" onClick={() => dispatch(createRemoveBlockCommand(block, index))}>
          <TrashIcon />
        </IconButton>
      </div>

      <div
        className="border-l-2 py-1.5 pl-3"
        style={{ borderLeftColor: accent ?? "var(--border)" }}
      >
        {issues.length > 0 && (
          <span title={issues.join(" ")} className="mb-1 inline-block h-1.5 w-1.5 rounded-full bg-signal-coral" />
        )}
        <Editor block={block as never} onChange={(patch) => updateBlock(block.id, patch)} />
        <BlockInspector block={block} onChange={(patch) => updateBlock(block.id, patch)} />
      </div>
    </div>
  );
}

// A lightweight, non-interactive stand-in for the drag overlay in
// block-list.tsx - avoids mounting a second live textarea/editor instance
// for whatever block is currently being dragged. Unlike the resting block
// above, this is meant to read as a distinct floating chip, so it keeps a
// full border/shadow treatment.
export function BlockCardGhost({ block }: { block: ContentBlock }) {
  const definition = blockRegistry[block.type] as unknown as BlockDefinition;
  const accent = BLOCK_ACCENT[block.type];

  return (
    <div
      style={{ borderLeftColor: accent ?? undefined, backgroundColor: accent ? hexToRgba(accent, 0.06) : undefined }}
      className={`flex items-center gap-2 rounded-lg border border-border bg-surface-card px-3 py-2 shadow-xl ${
        accent ? "border-l-[3px]" : "border-l border-dashed border-l-border-strong"
      }`}
    >
      <GripIcon />
      <span
        className=" text-[11px] font-semibold"
        style={accent ? { color: accent } : undefined}
      >
        {definition.label}
      </span>
    </div>
  );
}
