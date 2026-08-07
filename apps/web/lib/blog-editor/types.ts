export type DocumentKind = "post" | "tutorial";
export type DocumentStatus = "draft" | "published" | "archived";

export interface DocumentMetadata {
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  authorName: string;
  status: DocumentStatus;
  tags: string[];
  publishedAt: string | null;
  /** Tutorial-only. Ignored when documentKind === "post". */
  sectionId: string | null;
  /** Tutorial-only. Ignored when documentKind === "post". */
  position: number;
}

export function emptyMetadata(): DocumentMetadata {
  return {
    slug: "",
    title: "",
    excerpt: "",
    coverImage: "",
    authorName: "",
    status: "draft",
    tags: [],
    publishedAt: null,
    sectionId: null,
    position: 0,
  };
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * `PostRow`/`PostSummary`/`TutorialPageRow` type `publishedAt` as `string`,
 * but `pg` returns TIMESTAMPTZ columns as `Date` objects at runtime unless a
 * custom type parser is installed (it isn't - see session.ts's
 * `expiresAt.getTime()`, which depends on the opposite behavior elsewhere in
 * this app, so a global type-parser fix isn't safe to make blindly). Convert
 * at the boundary instead of trusting the type.
 */
export function toIsoStringOrNull(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
}
