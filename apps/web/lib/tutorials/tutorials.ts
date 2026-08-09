import { query } from "@/lib/db/client";
import type {
  NewTutorialPageInput,
  TutorialNavTree,
  TutorialPage,
  TutorialPageSummary,
  TutorialStatus,
  UpdateTutorialPageInput,
} from "@/types/tutorial";
import type { ContentBlock } from "@/types/content-block";

interface TutorialPageRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  author_name: string | null;
  status: TutorialStatus;
  body: ContentBlock[];
  tags: string[];
  position: number;
  section_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

function toSummary(row: TutorialPageRow): TutorialPageSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    coverImage: row.cover_image,
    authorName: row.author_name,
    status: row.status,
    tags: row.tags,
    sectionId: row.section_id,
    position: row.position,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPage(row: TutorialPageRow): TutorialPage {
  return { ...toSummary(row), body: row.body ?? [] };
}

const SUMMARY_COLUMNS = `
  id, slug, title, excerpt, cover_image, author_name, status, tags, section_id, position,
  published_at, created_at, updated_at
`;

export async function listTutorialPages(): Promise<TutorialPageSummary[]> {
  const rows = await query<TutorialPageRow>(
    `SELECT ${SUMMARY_COLUMNS} FROM tutorial_pages ORDER BY position ASC, title ASC`,
  );
  return rows.map(toSummary);
}

export async function listPublishedTutorialPages(): Promise<TutorialPageSummary[]> {
  const rows = await query<TutorialPageRow>(
    `SELECT ${SUMMARY_COLUMNS} FROM tutorial_pages WHERE status = 'published' ORDER BY position ASC, title ASC`,
  );
  return rows.map(toSummary);
}

export async function getTutorialPageBySlug(slug: string): Promise<TutorialPage | null> {
  const rows = await query<TutorialPageRow>(`SELECT * FROM tutorial_pages WHERE slug = $1 LIMIT 1`, [slug]);
  return rows[0] ? toPage(rows[0]) : null;
}

export async function getPublishedTutorialPageBySlug(slug: string): Promise<TutorialPage | null> {
  const rows = await query<TutorialPageRow>(
    `SELECT * FROM tutorial_pages WHERE slug = $1 AND status = 'published' LIMIT 1`,
    [slug],
  );
  return rows[0] ? toPage(rows[0]) : null;
}

export async function createTutorialPage(input: NewTutorialPageInput): Promise<TutorialPage> {
  const rows = await query<TutorialPageRow>(
    `INSERT INTO tutorial_pages
       (slug, title, excerpt, cover_image, author_name, status, body, tags, section_id, position, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11)
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
      input.sectionId ?? null,
      input.position ?? 0,
      input.publishedAt ?? null,
    ],
  );
  return toPage(rows[0]);
}

export async function updateTutorialPage(
  slug: string,
  patch: UpdateTutorialPageInput,
): Promise<TutorialPage | null> {
  const columnMap: Record<string, unknown> = {
    slug: patch.slug,
    title: patch.title,
    excerpt: patch.excerpt,
    cover_image: patch.coverImage,
    author_name: patch.authorName,
    status: patch.status,
    body: patch.body !== undefined ? JSON.stringify(patch.body) : undefined,
    tags: patch.tags,
    section_id: patch.sectionId,
    position: patch.position,
    published_at: patch.publishedAt,
  };

  const entries = Object.entries(columnMap).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return getTutorialPageBySlug(slug);

  const setClauses = entries.map(([col], i) => `${col} = $${i + 2}${col === "body" ? "::jsonb" : ""}`);
  const values = entries.map(([, value]) => value);

  const rows = await query<TutorialPageRow>(
    `UPDATE tutorial_pages SET ${setClauses.join(", ")} WHERE slug = $1 RETURNING *`,
    [slug, ...values],
  );
  return rows[0] ? toPage(rows[0]) : null;
}

export async function deleteTutorialPage(slug: string): Promise<boolean> {
  const rows = await query<{ id: string }>(`DELETE FROM tutorial_pages WHERE slug = $1 RETURNING id`, [slug]);
  return rows.length > 0;
}

export async function listTutorialNav(): Promise<TutorialNavTree> {
  const rows = await query<{
    slug: string;
    title: string;
    position: number;
    section_id: string | null;
    section_slug: string | null;
    section_title: string | null;
  }>(
    `SELECT
       p.slug, p.title, p.position,
       s.id AS section_id, s.slug AS section_slug, s.title AS section_title
     FROM tutorial_pages p
     LEFT JOIN tutorial_sections s ON s.id = p.section_id
     WHERE p.status = 'published'
     ORDER BY s.position ASC NULLS FIRST, p.position ASC, p.title ASC`,
  );

  const standalone: TutorialNavTree["standalone"] = [];
  const sectionsById = new Map<string, TutorialNavTree["sections"][number]>();

  for (const row of rows) {
    if (!row.section_id) {
      standalone.push({ slug: row.slug, title: row.title });
      continue;
    }

    let section = sectionsById.get(row.section_id);
    if (!section) {
      section = { id: row.section_id, slug: row.section_slug!, title: row.section_title!, pages: [] };
      sectionsById.set(row.section_id, section);
    }
    section.pages.push({ slug: row.slug, title: row.title });
  }

  return { standalone, sections: Array.from(sectionsById.values()) };
}