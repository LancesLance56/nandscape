import { RichText } from "./rich-text";
import { cn } from "@/lib/cn";
import type { ListBlock } from "@/types/blog";

/** Shared with the Markdown renderer so `- a` looks like a list block. */
export const LIST_BASE_CLASS = "flex flex-col gap-2 pl-6 text-ink-soft marker:text-slate";
export const LIST_ITEM_CLASS = "pl-1 leading-relaxed";

export function ListBlockView({ block }: { block: ListBlock & { className?: string } }) {
  const Tag = block.ordered ? "ol" : "ul";

  return (
    <Tag
      className={cn(
        LIST_BASE_CLASS,
        block.ordered ? "list-decimal" : "list-disc",
        block.className,
      )}
    >
      {block.items.map((item, i) => (
        <li key={i} className={LIST_ITEM_CLASS}>
          <RichText spans={item} />
        </li>
      ))}
    </Tag>
  );
}
