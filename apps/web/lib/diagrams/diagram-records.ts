import { randomUUID } from "node:crypto";
import { query } from "@/lib/db/client";

/**
 * Named diagrams, stored rather than compiled in.
 *
 * A flowchart or a graph example is content, not code: it gets a wording fix
 * far more often than it gets a structural change, and needing a deploy for
 * that was the wrong trade. `spec` is deliberately opaque here - it is
 * whatever shape the widget on the other end already accepts inline, so this
 * layer never has to learn what a decision node or a weighted edge is.
 */
export type DiagramKind = "flowchart" | "graph";

export interface DiagramPresetRecord {
  id: string;
  slug: string;
  kind: DiagramKind;
  title: string;
  group: string | null;
  position: number;
  spec: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface DiagramPresetInput {
  slug: string;
  kind: DiagramKind;
  title: string;
  group?: string | null;
  position?: number;
  spec: unknown;
}

interface DiagramRow {
  id: string;
  slug: string;
  kind: string;
  title: string;
  group: string | null;
  position: number;
  spec: unknown;
  created_at: Date | string;
  updated_at: Date | string;
  [key: string]: unknown;
}

function toRecord(row: DiagramRow): DiagramPresetRecord {
  return {
    id: row.id,
    slug: row.slug,
    kind: row.kind === "graph" ? "graph" : "flowchart",
    title: row.title,
    group: row.group,
    position: row.position,
    spec: row.spec,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function listDiagramPresets(kind?: DiagramKind): Promise<DiagramPresetRecord[]> {
  const rows = kind
    ? await query<DiagramRow>(
        `SELECT * FROM diagram_presets WHERE kind = $1 ORDER BY "group" NULLS FIRST, position, title`,
        [kind],
      )
    : await query<DiagramRow>(`SELECT * FROM diagram_presets ORDER BY kind, "group" NULLS FIRST, position, title`);
  return rows.map(toRecord);
}

export async function getDiagramPreset(slug: string): Promise<DiagramPresetRecord | null> {
  const rows = await query<DiagramRow>(`SELECT * FROM diagram_presets WHERE slug = $1`, [slug]);
  return rows[0] ? toRecord(rows[0]) : null;
}

/**
 * Fetches many at once, keyed by slug.
 *
 * A tutorial page can hold half a dozen diagrams, and resolving them one
 * query at a time would put a serial round-trip in front of the article for
 * each one.
 */
export async function getDiagramPresets(slugs: string[]): Promise<Map<string, DiagramPresetRecord>> {
  const unique = [...new Set(slugs)].filter(Boolean);
  if (unique.length === 0) return new Map();

  const rows = await query<DiagramRow>(`SELECT * FROM diagram_presets WHERE slug = ANY($1::text[])`, [unique]);
  return new Map(rows.map((row) => [row.slug, toRecord(row)]));
}

export async function createDiagramPreset(input: DiagramPresetInput): Promise<DiagramPresetRecord> {
  const rows = await query<DiagramRow>(
    `INSERT INTO diagram_presets (id, slug, kind, title, "group", position, spec, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, now(), now())
     RETURNING *`,
    [
      randomUUID(),
      input.slug,
      input.kind,
      input.title,
      input.group ?? null,
      input.position ?? 0,
      JSON.stringify(input.spec),
    ],
  );
  return toRecord(rows[0]);
}

export async function updateDiagramPreset(
  slug: string,
  input: DiagramPresetInput,
): Promise<DiagramPresetRecord | null> {
  const rows = await query<DiagramRow>(
    `UPDATE diagram_presets
        SET kind = $2, title = $3, "group" = $4, position = $5, spec = $6::jsonb, updated_at = now()
      WHERE slug = $1
      RETURNING *`,
    [slug, input.kind, input.title, input.group ?? null, input.position ?? 0, JSON.stringify(input.spec)],
  );
  return rows[0] ? toRecord(rows[0]) : null;
}
