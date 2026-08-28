import type { HeadingBlock } from "@/types/blog";
import { cn } from "@/lib/cn";
import { slugify } from "@/lib/blog-editor/types";

const LEVEL_CLASSES: Record<HeadingBlock["level"], string> = {
  1: "text-3xl font-bold",
  2: "text-2xl font-bold",
  3: "text-xl font-semibold",
  4: "text-lg font-semibold",
};

/**
 * A stable anchor for the heading, so a link can jump straight to a section
 * (used by the tutorial merge redirects, and useful for any deep link). The
 * slug is derived from the visible text - same scheme the editor uses for
 * page slugs - so `#storing-a-graph-in-code` lands on "Storing a Graph in
 * Code". `scroll-mt` keeps the target clear of the fixed navbar.
 */
export function headingAnchorId(text: string): string {
  return slugify(text);
}

export function HeadingBlockView({ block }: { block: HeadingBlock & { className?: string } }) {
  const Tag = `h${block.level}` as const;
  return (
    <Tag
      id={headingAnchorId(block.text)}
      className={cn(
        "scroll-mt-28 text-balance font-display leading-tight text-ink",
        LEVEL_CLASSES[block.level],
        block.className,
      )}
    >
      {block.text}
    </Tag>
  );
}
