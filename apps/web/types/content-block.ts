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

export interface InteractiveBlock {
  id: string;
  type: "interactive";
  widget: string;
  data: Record<string, unknown>;
}

export type ContentBlock =
  | ParagraphBlock
  | HeadingBlock
  | ImageBlock
  | VideoBlock
  | ButtonBlock
  | CodeBlock
  | DividerBlock
  | InteractiveBlock;