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
import { ListBlockView } from "./list-block";
import { CalloutBlockView } from "./callout-block";
import { resolveBlockDiagrams } from "@/lib/diagrams/resolve-block-diagrams";
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
  list: ListBlockView,
  callout: CalloutBlockView,
} as unknown as Record<ContentBlock["type"], ComponentType<{ block: never }>>;

/**
 * Async because named diagrams are resolved out of the database here, once
 * for the whole page, rather than fetched by each widget after it mounts.
 * Both callers are server components, so the await costs the reader nothing
 * and the chart arrives in the initial HTML.
 */
export async function BlockRenderer({ blocks }: { blocks: ContentBlock[] }) {
  const resolved = await resolveBlockDiagrams(blocks);

  return (
    <div className="article-prose">
      {resolved.map((block) => {
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
