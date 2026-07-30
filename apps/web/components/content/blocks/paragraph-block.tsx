import { RichText } from "./rich-text";
import type { ParagraphBlock } from "@/types/blog";

export function ParagraphBlockView({ block }: { block: ParagraphBlock }) {
  return (
    <p className="text-base leading-relaxed text-ink-soft">
      <RichText spans={block.content} />
    </p>
  );
}
