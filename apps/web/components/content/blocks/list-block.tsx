import { RichText } from "./rich-text";
import { cn } from "@/lib/cn";
import type { ListBlock } from "@/types/blog";

export function ListBlockView({ block }: { block: ListBlock & { className?: string } }) {
  const Tag = block.ordered ? "ol" : "ul";

  return (
    <Tag
      className={cn(
        "flex flex-col gap-2 pl-6 text-ink-soft marker:text-slate",
        block.ordered ? "list-decimal" : "list-disc",
        block.className,
      )}
    >
      {block.items.map((item, i) => (
        <li key={i} className="pl-1 leading-relaxed">
          <RichText spans={item} />
        </li>
      ))}
    </Tag>
  );
}
