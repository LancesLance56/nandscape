import { query } from "@/lib/db/client";
import type { NewPostInput, Post, PostBlock, PostStatus, PostSummary, UpdatePostInput } from "@/types/blog";

interface PostRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  author_name: string | null;
  status: PostStatus;
  body: PostBlock[];
  tags: string[];
  published_at: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

function toSummary(row: PostRow): PostSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    coverImage: row.cover_image,
    authorName: row.author_name,
    status: row.status,
    tags: row.tags,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPost(row: PostRow): Post {
  return { ...toSummary(row), body: row.body ?? [] };
}

const SUMMARY_COLUMNS = `
  id, slug, title, excerpt, cover_image, author_name, status, tags,
  published_at, created_at, updated_at
`;

export async function listPublishedPosts(): Promise<PostSummary[]> {
  const rows = await query<PostRow>(
    `SELECT ${SUMMARY_COLUMNS} FROM blog_posts
     WHERE status = 'published'
     ORDER BY published_at DESC NULLS LAST, created_at DESC`,
  );
  return rows.map(toSummary);
}

export async function listAllPosts(): Promise<PostSummary[]> {
  const rows = await query<PostRow>(
    `SELECT ${SUMMARY_COLUMNS} FROM blog_posts ORDER BY created_at DESC`,
  );
  return rows.map(toSummary);
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const rows = await query<PostRow>(`SELECT * FROM blog_posts WHERE slug = $1 LIMIT 1`, [slug]);
  return rows[0] ? toPost(rows[0]) : null;
}

export async function getPublishedPostBySlug(slug: string): Promise<Post | null> {
  const rows = await query<PostRow>(
    `SELECT * FROM blog_posts WHERE slug = $1 AND status = 'published' LIMIT 1`,
    [slug],
  );
  return rows[0] ? toPost(rows[0]) : null;
}

export async function createPost(input: NewPostInput): Promise<Post> {
  const rows = await query<PostRow>(
    `INSERT INTO blog_posts
       (slug, title, excerpt, cover_image, author_name, status, body, tags, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
     RETURNING *`,
    [
      input.slug,
      input.title,
      input.excerpt ?? null,
      input.coverImage ?? null,
      input.authorName ?? null,
      input.status ?? "draft",
      JSON.stringify(input.body ?? []),
      input.tags ?? [],
      input.publishedAt ?? null,
    ],
  );
  return toPost(rows[0]);
}

export async function updatePost(slug: string, patch: UpdatePostInput): Promise<Post | null> {
  const columnMap: Record<string, unknown> = {
    slug: patch.slug,
    title: patch.title,
    excerpt: patch.excerpt,
    cover_image: patch.coverImage,
    author_name: patch.authorName,
    status: patch.status,
    body: patch.body !== undefined ? JSON.stringify(patch.body) : undefined,
    tags: patch.tags,
    published_at: patch.publishedAt,
  };

  const entries = Object.entries(columnMap).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return getPostBySlug(slug);

  const setClauses = entries.map(([col], i) => `${col} = $${i + 2}${col === "body" ? "::jsonb" : ""}`);
  const values = entries.map(([, value]) => value);

  const rows = await query<PostRow>(
    `UPDATE blog_posts SET ${setClauses.join(", ")} WHERE slug = $1 RETURNING *`,
    [slug, ...values],
  );
  return rows[0] ? toPost(rows[0]) : null;
}

export async function deletePost(slug: string): Promise<boolean> {
  const rows = await query<{ id: string }>(`DELETE FROM blog_posts WHERE slug = $1 RETURNING id`, [slug]);
  return rows.length > 0;
}
