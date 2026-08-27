import { RichText } from "./rich-text";
import { cn } from "@/lib/cn";
import type { ParagraphBlock } from "@/types/blog";

export function ParagraphBlockView({ block }: { block: ParagraphBlock & { className?: string } }) {
  return (
    <p className={cn("text-pretty text-ink-soft", block.className)}>
      <RichText spans={block.content} />
    </p>
  );
}
