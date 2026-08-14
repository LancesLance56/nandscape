import type { VideoBlock } from "@/types/blog";
import { cn } from "@/lib/cn";

const EMBED_URL: Record<VideoBlock["provider"], (id: string) => string> = {
  youtube: (id) => `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`,
  vimeo: (id) => `https://player.vimeo.com/video/${encodeURIComponent(id)}`,
};

export function VideoBlockView({ block }: { block: VideoBlock & { className?: string } }) {
  const src = EMBED_URL[block.provider]?.(block.videoId);
  if (!src) return null;

  return (
    <figure className={cn("my-2", block.className)}>
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
        <iframe
          src={src}
          title={block.caption ?? "Embedded video"}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      {block.caption && (
        <figcaption className="mt-2 text-center text-xs text-slate">{block.caption}</figcaption>
      )}
    </figure>
  );
}
