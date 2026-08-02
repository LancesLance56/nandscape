import type { HeadingBlock } from "@/types/blog";
import { cn } from "@/lib/cn";

const LEVEL_CLASSES: Record<HeadingBlock["level"], string> = {
  1: "text-3xl font-bold mt-2",
  2: "text-2xl font-bold mt-8",
  3: "text-xl font-semibold mt-6",
  4: "text-lg font-semibold mt-4",
};

export function HeadingBlockView({ block }: { block: HeadingBlock & { className?: string } }) {
  const Tag = `h${block.level}` as const;
  return (
    <Tag className={cn("font-display leading-tight text-ink", LEVEL_CLASSES[block.level], block.className)}>
      {block.text}
    </Tag>
  );
}
