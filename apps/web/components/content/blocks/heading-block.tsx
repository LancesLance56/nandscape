import type { HeadingBlock } from "@/types/blog";
import { cn } from "@/lib/cn";
import { slugify } from "@/lib/blog-editor/types";

/**
 * Exported so the Markdown renderer (components/practices/statement-markdown)
 * can dress a bare `<h2>` exactly like a heading block. A markdown `##` and a
 * heading block should be indistinguishable on the page.
 */
export const HEADING_BASE_CLASS = "scroll-mt-28 text-balance font-display text-ink";

/**
 * The line height rides on the size as `text-2xl/tight`, not as a separate
 * `leading-tight` in the base class.
 *
 * In Tailwind v4 a size utility can carry its own line height (`text-2xl/7`),
 * so tailwind-merge treats `text-2xl` as conflicting with `leading-tight` and
 * drops the earlier one — which silently cost every heading on the site its
 * tight leading. Folding the two into one utility removes the conflict.
 */
export const HEADING_LEVEL_CLASSES: Record<HeadingBlock["level"], string> = {
  1: "text-3xl/tight font-bold",
  2: "text-2xl/tight font-bold",
  3: "text-xl/tight font-semibold",
  4: "text-lg/tight font-semibold",
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
        HEADING_BASE_CLASS,
        HEADING_LEVEL_CLASSES[block.level],
        block.className,
      )}
    >
      {block.text}
    </Tag>
  );
}
