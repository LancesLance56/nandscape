/**
 * The blog stores structured content, not raw HTML. A post's `body` is an
 * array of typed blocks (paragraph, image, video, button, interactive...).
 * Each block type has its own renderer component — see
 * components/blog/blocks/block-renderer.tsx — so adding a new block kind
 * never requires a DB migration or touching existing content.
 */

export type PostStatus = "draft" | "published" | "archived";

// --- Inline text formatting --------------------------------------------------
// Marks apply to spans of text *within* a paragraph/heading block. Keeping
// these separate from block types is what lets "bold blue linked text"
// exist without a combinatorial explosion of block kinds.

export type TextMark =
  | { kind: "bold" }
  | { kind: "italic" }
  | { kind: "code" }
  | { kind: "color"; value: string }
  | { kind: "link"; href: string };

export interface TextSpan {
  text: string;
  marks?: TextMark[];
}

// --- Block kinds --------------------------------------------------------------

export interface ParagraphBlock {
  id: string;
  type: "paragraph";
  content: TextSpan[];
}

export interface HeadingBlock {
  id: string;
  type: "heading";
  level: 1 | 2 | 3 | 4;
  text: string;
}

export interface ImageBlock {
  id: string;
  type: "image";
  src: string;
  alt: string;
  caption?: string;
}

export interface VideoBlock {
  id: string;
  type: "video";
  provider: "youtube" | "vimeo";
  videoId: string;
  caption?: string;
}

export interface ButtonBlock {
  id: string;
  type: "button";
  label: string;
  href: string;
  style?: "primary" | "secondary";
}

export interface CodeBlock {
  id: string;
  type: "code";
  language?: string;
  code: string;
}

export interface DividerBlock {
  id: string;
  type: "divider";
}

/**
 * Free-form interactive widgets (polls, embedded circuit demos, quizzes...).
 * `data` is intentionally loose — new widgets are additive and don't need a
 * migration. `interactive-block.tsx` dispatches on `widget` the same way
 * `block-renderer.tsx` dispatches on `type`.
 */
export interface InteractiveBlock {
  id: string;
  type: "interactive";
  widget: string;
  data: Record<string, unknown>;
}

export type PostBlock =
  | ParagraphBlock
  | HeadingBlock
  | ImageBlock
  | VideoBlock
  | ButtonBlock
  | CodeBlock
  | DividerBlock
  | InteractiveBlock;

// --- Post -----------------------------------------------------------------

export interface PostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  authorName: string | null;
  status: PostStatus;
  tags: string[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Post extends PostSummary {
  body: PostBlock[];
}

export interface NewPostInput {
  slug: string;
  title: string;
  excerpt?: string;
  coverImage?: string;
  authorName?: string;
  status?: PostStatus;
  body?: PostBlock[];
  tags?: string[];
  publishedAt?: string | null;
}

export type UpdatePostInput = Partial<NewPostInput>;
