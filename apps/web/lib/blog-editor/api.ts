import type { ContentBlock } from "@/types/content-block";
import type { DocumentKind, DocumentMetadata } from "./types";

const ENDPOINT: Record<DocumentKind, string> = {
  post: "/api/posts",
  tutorial: "/api/tutorials",
};

function toPayload(kind: DocumentKind, metadata: DocumentMetadata, blocks: ContentBlock[]) {
  const shared = {
    slug: metadata.slug,
    title: metadata.title,
    excerpt: metadata.excerpt || undefined,
    coverImage: metadata.coverImage || undefined,
    authorName: metadata.authorName || undefined,
    status: metadata.status,
    tags: metadata.tags,
    seoTitle: metadata.seoTitle || undefined,
    seoDescription: metadata.seoDescription || undefined,
    keywords: metadata.keywords,
    publishedAt: metadata.publishedAt,
    body: blocks,
  };

  // sectionId/position only exist on tutorial pages - omit them for posts
  // rather than sending fields the post endpoint doesn't understand.
  if (kind === "tutorial") {
    return { ...shared, sectionId: metadata.sectionId, position: metadata.position };
  }
  return shared;
}

async function describeError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  return text || `Request failed with status ${res.status}`;
}

export async function createDocument(
  kind: DocumentKind,
  metadata: DocumentMetadata,
  blocks: ContentBlock[],
): Promise<void> {
  const res = await fetch(ENDPOINT[kind], {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toPayload(kind, metadata, blocks)),
  });
  if (!res.ok) throw new Error(await describeError(res));
}

export async function updateDocument(
  kind: DocumentKind,
  originalSlug: string,
  metadata: DocumentMetadata,
  blocks: ContentBlock[],
): Promise<void> {
  const res = await fetch(`${ENDPOINT[kind]}/${encodeURIComponent(originalSlug)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toPayload(kind, metadata, blocks)),
  });
  if (!res.ok) throw new Error(await describeError(res));
}
