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
  CodeVariant,
  DividerBlock,
  TableBlock,
  InteractiveBlock,
  ListBlock,
  CalloutBlock,
  CalloutTone,
  ContentBlock as PostBlock,
} from "./content-block";

/** SEO metadata shared by blog posts and tutorial pages. Every field is
 *  optional and falls back to the on-page equivalent (seoTitle -> title,
 *  seoDescription -> excerpt), so content written before these existed still
 *  produces sensible tags,  see lib/seo/metadata.ts. */
export interface SeoFields {
  seoTitle: string | null;
  seoDescription: string | null;
  keywords: string[];
}

export interface PostSummary extends SeoFields {
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
  seoTitle?: string;
  seoDescription?: string;
  keywords?: string[];
  publishedAt?: string | null;
}

export type UpdatePostInput = Partial<NewPostInput>;
