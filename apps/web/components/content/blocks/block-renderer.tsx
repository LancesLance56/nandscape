import type { ComponentType } from "react";
import type { ContentBlock } from "@/types/content-block";
import { ParagraphBlockView } from "./paragraph-block";
import { HeadingBlockView } from "./heading-block";
import { ImageBlockView } from "./image-block";
import { VideoBlockView } from "./video-block";
import { ButtonBlockView } from "./button-block";
import { CodeBlockView } from "./code-block";
import { DividerBlockView } from "./divider-block";
import { TableBlockView } from "./table-block";
import { InteractiveBlockView } from "./interactive/interactive-block";
import {PostBlock} from "@/types/blog";

const blockRegistry: Record<ContentBlock["type"], ComponentType<{ block: never }>> = {
  paragraph: ParagraphBlockView,
  heading: HeadingBlockView,
  image: ImageBlockView,
  video: VideoBlockView,
  button: ButtonBlockView,
  code: CodeBlockView,
  divider: DividerBlockView,
  table: TableBlockView,
  interactive: InteractiveBlockView,
} as unknown as Record<ContentBlock["type"], ComponentType<{ block: never }>>;

export function BlockRenderer({ blocks }: { blocks: ContentBlock[] }) {
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
