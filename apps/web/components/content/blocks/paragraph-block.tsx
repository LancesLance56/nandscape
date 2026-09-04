import { RichText } from "./rich-text";
import { cn } from "@/lib/cn";
import type { ParagraphBlock } from "@/types/blog";

/** Shared with the Markdown renderer. */
export const PARAGRAPH_CLASS = "text-pretty text-ink-soft";

export function ParagraphBlockView({ block }: { block: ParagraphBlock & { className?: string } }) {
  return (
    <p className={cn(PARAGRAPH_CLASS, block.className)}>
      <RichText spans={block.content} />
    </p>
  );
}
