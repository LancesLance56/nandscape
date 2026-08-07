import type { ComponentType } from "react";
import type {
  ContentBlock,
  ParagraphBlock,
  HeadingBlock,
  ImageBlock,
  VideoBlock,
  ButtonBlock,
  CodeBlock,
  DividerBlock,
  InteractiveBlock,
} from "@/types/content-block";

import { ParagraphBlockView } from "@/components/content/blocks/paragraph-block";
import { HeadingBlockView } from "@/components/content/blocks/heading-block";
import { ImageBlockView } from "@/components/content/blocks/image-block";
import { VideoBlockView } from "@/components/content/blocks/video-block";
import { ButtonBlockView } from "@/components/content/blocks/button-block";
import { DividerBlockView } from "@/components/content/blocks/divider-block";
import { InteractiveBlockView } from "@/components/content/blocks/interactive/interactive-block";

import { PreviewCodeBlock } from "@/components/blog-editor/preview-code-block";
import { ParagraphBlockEditor } from "@/components/blog-editor/blocks/paragraph-block-editor";
import { HeadingBlockEditor } from "@/components/blog-editor/blocks/heading-block-editor";
import { ImageBlockEditor } from "@/components/blog-editor/blocks/image-block-editor";
import { VideoBlockEditor } from "@/components/blog-editor/blocks/video-block-editor";
import { ButtonBlockEditor } from "@/components/blog-editor/blocks/button-block-editor";
import { CodeBlockEditor } from "@/components/blog-editor/blocks/code-block-editor";
import { DividerBlockEditor } from "@/components/blog-editor/blocks/divider-block-editor";
import { InteractiveBlockEditor } from "@/components/blog-editor/blocks/interactive-block-editor";
import { widgetDefinitions, getWidgetDefinition } from "@/lib/blog-editor/widget-registry";

/**
 * Loosely typed on purpose. Matching this to each concrete block type with a
 * generic would need a cast at every call site anyway (see block-renderer.tsx's
 * own `as unknown as Record<...>` for the same reason) - better to do the cast
 * once, here, than fight the type system at every usage site for no real
 * safety gain, since Renderer/Editor are always paired with their own block's
 * data via the registry lookup, not constructed ad hoc.
 */
export interface BlockDefinition {
  type: ContentBlock["type"];
  label: string;
  creatable: boolean;
  createDefault: () => ContentBlock;
  Renderer: ComponentType<{ block: never }>;
  Editor: ComponentType<{ block: never; onChange: (patch: Record<string, unknown>) => void }>;
  validate?: (block: never) => string[];
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

const registryImpl = {
  paragraph: {
    type: "paragraph",
    label: "Paragraph",
    creatable: true,
    createDefault: (): ParagraphBlock => ({ id: newId("p"), type: "paragraph", content: [{ text: "" }] }),
    Renderer: ParagraphBlockView,
    Editor: ParagraphBlockEditor,
  },
  heading: {
    type: "heading",
    label: "Heading",
    creatable: true,
    createDefault: (): HeadingBlock => ({ id: newId("h"), type: "heading", level: 2, text: "" }),
    Renderer: HeadingBlockView,
    Editor: HeadingBlockEditor,
  },
  image: {
    type: "image",
    label: "Image",
    creatable: true,
    createDefault: (): ImageBlock => ({ id: newId("img"), type: "image", src: "", alt: "" }),
    Renderer: ImageBlockView,
    Editor: ImageBlockEditor,
    validate: (block: ImageBlock) => (block.src.trim() ? [] : ["Image needs a source URL."]),
  },
  video: {
    type: "video",
    label: "Video",
    creatable: true,
    createDefault: (): VideoBlock => ({ id: newId("vid"), type: "video", provider: "youtube", videoId: "" }),
    Renderer: VideoBlockView,
    Editor: VideoBlockEditor,
    validate: (block: VideoBlock) => (block.videoId.trim() ? [] : ["Video needs an ID."]),
  },
  button: {
    type: "button",
    label: "Button",
    creatable: true,
    createDefault: (): ButtonBlock => ({ id: newId("btn"), type: "button", label: "Learn more", href: "/" }),
    Renderer: ButtonBlockView,
    Editor: ButtonBlockEditor,
    validate: (block: ButtonBlock) => (block.href.trim() ? [] : ["Button needs a destination."]),
  },
  code: {
    type: "code",
    label: "Code",
    creatable: true,
    createDefault: (): CodeBlock => ({ id: newId("code"), type: "code", language: "text", code: "" }),
    // NOT CodeBlockView. That component is an async Server Component that
    // awaits shiki's createHighlighter() at module scope - it cannot run in
    // a client-rendered live-preview tree. PreviewCodeBlock is a client-safe
    // stand-in that highlights with shiki's browser bundle instead, used
    // ONLY inside this editor's preview pane. The published page still
    // renders through the real CodeBlockView via the untouched
    // block-renderer.tsx.
    Renderer: PreviewCodeBlock,
    Editor: CodeBlockEditor,
  },
  divider: {
    type: "divider",
    label: "Divider",
    creatable: true,
    createDefault: (): DividerBlock => ({ id: newId("div"), type: "divider" }),
    Renderer: DividerBlockView,
    Editor: DividerBlockEditor,
  },
  interactive: {
    type: "interactive",
    label: "Interactive widget",
    creatable: true,
    createDefault: (): InteractiveBlock => {
      // "poll" as the starting widget is arbitrary but deliberate: it's the
      // simplest widget (question + options), so a freshly-added block is
      // immediately something an author can fill in without reading docs.
      const poll = widgetDefinitions.find((w) => w.name === "poll") ?? widgetDefinitions[0];
      return { id: newId("widget"), type: "interactive", widget: poll.name, data: poll.createDefault() };
    },
    Renderer: InteractiveBlockView,
    Editor: InteractiveBlockEditor,
    validate: (block: InteractiveBlock) => getWidgetDefinition(block.widget)?.validate?.(block.data) ?? [],
  },
};

export const blockRegistry = registryImpl as unknown as Record<ContentBlock["type"], BlockDefinition>;

export const creatableBlockTypes = Object.values(registryImpl).filter(
  (definition) => definition.creatable,
) as unknown as BlockDefinition[];

export function getBlockDefinition(type: ContentBlock["type"]): BlockDefinition {
  return blockRegistry[type];
}

/** Plain text a slash-command conversion can carry across block types. Anything richer (marks, images, code) doesn't survive - there's no sensible target for it. */
function plainTextOf(block: ContentBlock): string | null {
  if (block.type === "paragraph") return block.content.map((span) => span.text).join("");
  if (block.type === "heading") return block.text;
  return null;
}

/**
 * Used by the slash-command menu (slash-command-plugin.tsx) to turn a block
 * into a different type in place. Keeps the original `id` so React keys,
 * drag-and-drop identity, and selection all survive the swap. Falls back to
 * the target type's default content; only paragraph<->heading carry their
 * plain text across, since that's the only pair where "the same words, a
 * different container" is an unambiguous operation.
 */
export function convertBlockTo(block: ContentBlock, targetType: ContentBlock["type"]): ContentBlock {
  const text = plainTextOf(block);

  if (text && text.length > 0) {
    if (targetType === "paragraph") return { id: block.id, type: "paragraph", content: [{ text }] };
    if (targetType === "heading") return { id: block.id, type: "heading", level: 2, text };
  }

  return { ...blockRegistry[targetType].createDefault(), id: block.id };
}
