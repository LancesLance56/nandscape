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

/**
 * Remove a preset.
 *
 * Returns false when nothing matched, so the caller can 404 rather than
 * report a successful delete of something that was never there. Whether a
 * preset is *safe* to delete is a separate question the caller has to ask
 * first - see `getDiagramUsage`; a deleted preset does not error at render
 * time, the block simply keeps its `preset:` key, resolves to nothing, and
 * the widget quietly falls back to its own default chart. That is the right
 * behaviour for a page mid-edit and exactly the wrong failure mode for an
 * accidental delete, because nobody finds out.
 */
export async function deleteDiagramPreset(slug: string): Promise<boolean> {
  const rows = await query<{ slug: string }>(
    `DELETE FROM diagram_presets WHERE slug = $1 RETURNING slug`,
    [slug],
  );
  return rows.length > 0;
}

/* -------------------------------------------------------------------------- */

/**
 * Which pages actually show a given preset.
 *
 * A preset is shared on purpose - that is the whole point of storing it once -
 * which means editing one is a change to every page using it. An editor that
 * does not say how many pages that is invites someone to "just fix the
 * wording" on a diagram that turns out to be load-bearing on nine lessons.
 *
 * Found with JSONB containment rather than a `LIKE` over `body::text`, which
 * would depend on how the JSON happens to be spaced and would match the word
 * appearing in prose. `body` is an array of blocks, and `@>` asks whether any
 * element contains `{"data": {"preset": <slug>}}` - containment recurses into
 * objects, so a block with a dozen other keys still matches on this one.
 */
export interface DiagramUsage {
  tutorials: { slug: string; title: string }[];
  posts: { slug: string; title: string }[];
}

function presetContainment(slug: string): string {
  return JSON.stringify([{ data: { preset: slug } }]);
}

export async function getDiagramUsage(slug: string): Promise<DiagramUsage> {
  const [tutorials, posts] = await Promise.all([
    query<{ slug: string; title: string }>(
      `SELECT slug, title FROM tutorial_pages WHERE body @> $1::jsonb ORDER BY title`,
      [presetContainment(slug)],
    ),
    query<{ slug: string; title: string }>(
      `SELECT slug, title FROM blog_posts WHERE body @> $1::jsonb ORDER BY title`,
      [presetContainment(slug)],
    ),
  ]);

  return { tutorials, posts };
}

/**
 * Usage counts for every preset at once, for the index.
 *
 * One correlated query rather than one per row: the list renders every preset,
 * and asking per preset would be two round-trips each.
 */
export async function listDiagramUsageCounts(): Promise<Map<string, number>> {
  const rows = await query<{ slug: string; uses: string }>(
    `SELECT d.slug,
            ( (SELECT count(*) FROM tutorial_pages t
                WHERE t.body @> jsonb_build_array(jsonb_build_object('data', jsonb_build_object('preset', d.slug))))
            + (SELECT count(*) FROM blog_posts b
                WHERE b.body @> jsonb_build_array(jsonb_build_object('data', jsonb_build_object('preset', d.slug))))
            )::text AS uses
       FROM diagram_presets d`,
  );

  return new Map(rows.map((row) => [row.slug, Number.parseInt(row.uses, 10) || 0]));
}
