import type { ImageBlock } from "@/types/blog";

export function ImageBlockView({ block }: { block: ImageBlock }) {
  return (
    <figure className="my-2">
      {/*
        Plain <img>, not next/image: post images can come from any author-
        supplied URL, and next/image requires each remote host to be
        allow-listed in next.config.ts ahead of time. If you want the
        optimization, add the relevant hosts to `images.remotePatterns` and
        swap this for <Image>.
      */}
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
