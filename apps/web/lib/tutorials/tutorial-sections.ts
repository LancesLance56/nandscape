import { query } from "@/lib/db/client";
import type { NewTutorialSectionInput, TutorialSection, UpdateTutorialSectionInput } from "@/types/tutorial";

interface TutorialSectionRow {
  id: string;
  slug: string;
  title: string;
  position: number;
  track_id: string | null;
  [key: string]: unknown;
}

function toSection(row: TutorialSectionRow): TutorialSection {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    position: row.position,
    trackId: row.track_id,
  };
}

const COLUMNS = `id, slug, title, position, track_id`;

export async function listTutorialSections(): Promise<TutorialSection[]> {
  const rows = await query<TutorialSectionRow>(
    `SELECT ${COLUMNS} FROM tutorial_sections ORDER BY position ASC, title ASC`,
  );
  return rows.map(toSection);
}

export async function getTutorialSectionBySlug(slug: string): Promise<TutorialSection | null> {
  const rows = await query<TutorialSectionRow>(
    `SELECT ${COLUMNS} FROM tutorial_sections WHERE slug = $1 LIMIT 1`,
    [slug],
  );
  return rows[0] ? toSection(rows[0]) : null;
}

export async function createTutorialSection(input: NewTutorialSectionInput): Promise<TutorialSection> {
  const rows = await query<TutorialSectionRow>(
    `INSERT INTO tutorial_sections (slug, title, position, track_id)
     VALUES ($1, $2, $3, $4)
     RETURNING ${COLUMNS}`,
    [input.slug, input.title, input.position ?? 0, input.trackId ?? null],
  );
  return toSection(rows[0]);
}

export async function updateTutorialSection(
  slug: string,
  patch: UpdateTutorialSectionInput,
): Promise<TutorialSection | null> {
  const columnMap: Record<string, unknown> = {
    slug: patch.slug,
    title: patch.title,
    position: patch.position,
    track_id: patch.trackId,
  };

  const entries = Object.entries(columnMap).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return getTutorialSectionBySlug(slug);

  const setClauses = entries.map(([col], i) => `${col} = $${i + 2}`);
  const values = entries.map(([, value]) => value);

  const rows = await query<TutorialSectionRow>(
    `UPDATE tutorial_sections SET ${setClauses.join(", ")} WHERE slug = $1 RETURNING ${COLUMNS}`,
    [slug, ...values],
  );
  return rows[0] ? toSection(rows[0]) : null;
}

export async function deleteTutorialSection(slug: string): Promise<boolean> {
  const rows = await query<{ id: string }>(`DELETE FROM tutorial_sections WHERE slug = $1 RETURNING id`, [slug]);
  return rows.length > 0;
}