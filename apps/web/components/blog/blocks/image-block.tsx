import type { ImageBlock } from "@/types/blog";

export function ImageBlockView({ block }: { block: ImageBlock }) {
  return (
    <figure className="my-2">
      <img
        src={block.src}
        alt={block.alt}
        loading="lazy"
        className="w-full rounded-xl border border-border object-cover"
      />
      {block.caption && (
        <figcaption className="mt-2 text-center font-mono text-xs text-slate">{block.caption}</figcaption>
      )}
    </figure>
  );
}
