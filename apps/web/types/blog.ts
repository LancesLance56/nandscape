import {ContentBlock} from "@/types/content-block";

export type PostStatus = "draft" | "published" | "archived";
export type {
  TextMark,
  TextSpan,
  ParagraphBlock,
  HeadingBlock,
  ImageBlock,
  VideoBlock,
  ButtonBlock,
  CodeBlock,
  DividerBlock,
  TableBlock,
  InteractiveBlock,
  ContentBlock as PostBlock,
} from "./content-block";

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
  body: ContentBlock[];
}

export interface NewPostInput {
  slug: string;
  title: string;
  excerpt?: string;
  coverImage?: string;
  authorName?: string;
  status?: PostStatus;
  body?: ContentBlock[];
  tags?: string[];
  publishedAt?: string | null;
}

export type UpdatePostInput = Partial<NewPostInput>;
