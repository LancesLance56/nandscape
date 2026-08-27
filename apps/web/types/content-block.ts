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

export interface CodeVariant {
  language: string;
  code: string;
}

/**
 * `language`/`code` is the primary listing and renders on its own when
 * `variants` is absent, which keeps every block written before multi-language
 * support valid. When variants are present the block renders as tabs, with the
 * primary as the first tab.
 */
export interface CodeBlock {
  id: string;
  type: "code";
  language?: string;
  code: string;
  variants?: CodeVariant[];
}

export interface DividerBlock {
  id: string;
  type: "divider";
}

/**
 * `headers` presence (not a separate boolean) is what decides whether a
 * header row renders - `undefined`/`[]` means no header row, a populated
 * array means there is one. Every row in `rows` is expected to have the same
 * length as `headers` (when present) or each other; the editor is what
 * keeps that in sync (see table-block-editor.tsx), this type doesn't enforce
 * it structurally.
 */
export interface TableBlock {
  id: string;
  type: "table";
  headers?: string[];
  rows: string[][];
  caption?: string;
}

export interface InteractiveBlock {
  id: string;
  type: "interactive";
  widget: string;
  data: Record<string, unknown>;
}

/**
 * An ordered or unordered list. Each item is its own run of rich-text spans
 * (the same shape as a paragraph's `content`), so an item can carry bold,
 * code, links, and so on - not just a plain string.
 */
export interface ListBlock {
  id: string;
  type: "list";
  ordered: boolean;
  items: TextSpan[][];
}

export type CalloutTone = "note" | "tip" | "warning" | "important";

/**
 * A set-apart aside: a note, tip, warning, or "important" box. `tone` picks
 * the accent colour and icon; `title` is optional and falls back to a label
 * derived from the tone.
 */
export interface CalloutBlock {
  id: string;
  type: "callout";
  tone: CalloutTone;
  title?: string;
  content: TextSpan[];
}

export type ContentBlock =
  | ParagraphBlock
  | HeadingBlock
  | ImageBlock
  | VideoBlock
  | ButtonBlock
  | CodeBlock
  | DividerBlock
  | TableBlock
  | InteractiveBlock
  | ListBlock
  | CalloutBlock;