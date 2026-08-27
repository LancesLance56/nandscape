import type { ImageBlock } from "@/types/blog";
import { cn } from "@/lib/cn";

export function ImageBlockView({ block }: { block: ImageBlock & { className?: string } }) {
  return (
    <figure className={cn(block.className)}>
      <img
        src={block.src}
        alt={block.alt}
        loading="lazy"
        className="w-full rounded-xl border border-border object-cover"
      />
      {block.caption && (
        <figcaption className="mt-2 text-center text-xs text-slate">{block.caption}</figcaption>
      )}
    </figure>
  );
}
