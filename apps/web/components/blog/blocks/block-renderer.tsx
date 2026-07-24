import type { ComponentType } from "react";
import type { PostBlock } from "@/types/blog";
import { ParagraphBlockView } from "./paragraph-block";
import { HeadingBlockView } from "./heading-block";
import { ImageBlockView } from "./image-block";
import { VideoBlockView } from "./video-block";
import { ButtonBlockView } from "./button-block";
import { CodeBlockView } from "./code-block";
import { DividerBlockView } from "./divider-block";
import { InteractiveBlockView } from "./interactive/interactive-block";

const blockRegistry: Record<PostBlock["type"], ComponentType<{ block: never }>> = {
  paragraph: ParagraphBlockView,
  heading: HeadingBlockView,
  image: ImageBlockView,
  video: VideoBlockView,
  button: ButtonBlockView,
  code: CodeBlockView,
  divider: DividerBlockView,
  interactive: InteractiveBlockView,
} as unknown as Record<PostBlock["type"], ComponentType<{ block: never }>>;

export function BlockRenderer({ blocks }: { blocks: PostBlock[] }) {
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block) => {
        const Renderer = blockRegistry[block.type] as ComponentType<{ block: PostBlock }> | undefined;
        if (!Renderer) {
          if (process.env.NODE_ENV !== "production") {
            console.warn(`[blog] no renderer registered for block type "${block.type}"`);
          }
          return null;
        }
        return <Renderer key={block.id} block={block} />;
      })}
    </div>
  );
}
