import type { HeadingBlock } from "@/types/blog";
import { cn } from "@/lib/cn";

const LEVEL_CLASSES: Record<HeadingBlock["level"], string> = {
  1: "text-3xl font-bold",
  2: "text-2xl font-bold",
  3: "text-xl font-semibold",
  4: "text-lg font-semibold",
};

export function HeadingBlockView({ block }: { block: HeadingBlock & { className?: string } }) {
  const Tag = `h${block.level}` as const;
  return (
    <Tag
      className={cn(
        "text-balance font-display leading-tight text-ink",
        LEVEL_CLASSES[block.level],
        block.className,
      )}
    >
      {block.text}
    </Tag>
  );
}
