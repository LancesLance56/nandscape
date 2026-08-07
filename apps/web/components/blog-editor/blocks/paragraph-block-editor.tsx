"use client";

import type { ContentBlock, ParagraphBlock } from "@/types/content-block";
import { RichTextField } from "@/components/blog-editor/fields/rich-text-field";
import { useBlockConversion } from "@/components/blog-editor/block-conversion-context";

export function ParagraphBlockEditor({
  block,
  onChange,
}: {
  block: ParagraphBlock;
  onChange: (patch: Partial<Omit<ParagraphBlock, "id" | "type">>) => void;
}) {
  const convertBlock = useBlockConversion();

  return (
    <RichTextField
      content={block.content}
      onChange={(content) => onChange({ content })}
      onSlashCommand={(type: ContentBlock["type"]) => convertBlock(block.id, type)}
    />
  );
}
