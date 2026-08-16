import { randomUUID } from "node:crypto";
import { query } from "@/lib/db/client";
import { generateProjectSlug } from "./slug";
import type { EditorNode, EditorEdge } from "@/types/editor";
import type { SubcircuitBlockDefinition } from "@/types/subcircuit-block";
import type { CircuitScope } from "@/types/scope";

export type ProjectVisibility = "PRIVATE" | "UNLISTED" | "PUBLIC";

export interface ProjectRecord {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  /** Always mirrors `scopes[0]` - kept for readers that predate tabs (embeds,
   *  thumbnails, the sitemap) so they can keep reading a flat circuit. */
  nodes: EditorNode[];
  edges: EditorEdge[];
  /** Every tab in this project. Empty for projects saved before tabs existed
   *  - callers should fall back to wrapping `nodes`/`edges` as a single
   *  scope in that case (see CircuitEditor's project-load effect). */
  scopes: CircuitScope[];
  /** Snapshot of every non-builtin custom block this project's subcircuit
   *  nodes reference, computed client-side by resolveBlockClosure() at save
   *  time - see subcircuit-flatten.ts. Keeps the project self-contained: a
   *  fork, an unlisted-link visitor, or an embed all resolve subcircuits
   *  correctly without needing anything from the original author's browser. */
  blocks: SubcircuitBlockDefinition[];
  /** Freeform, owner- or seed-set - see the schema doc comment on
   *  Project.tags. */
  tags: string[];
  visibility: ProjectVisibility;
  ownerId: string;
  ownerUsername: string;
  forkedFromId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  visibility: ProjectVisibility;
  updatedAt: string;
}

interface ProjectRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  nodes: EditorNode[];
  edges: EditorEdge[];
  scopes: CircuitScope[];
  blocks: SubcircuitBlockDefinition[];
  tags: string[];
  visibility: ProjectVisibility;
  owner_id: string;
  owner_username: string;
  forked_from_id: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

interface SummaryRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  visibility: ProjectVisibility;
  updated_at: string;
  [key: string]: unknown;
}

function toRecord(row: ProjectRow): ProjectRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    nodes: row.nodes ?? [],
    edges: row.edges ?? [],
    scopes: row.scopes ?? [],
    blocks: row.blocks ?? [],
    tags: row.tags ?? [],
    visibility: row.visibility,
    ownerId: row.owner_id,
    ownerUsername: row.owner_username,
    forkedFromId: row.forked_from_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSummary(row: SummaryRow): ProjectSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    visibility: row.visibility,
    updatedAt: row.updated_at,
  };
}

const RECORD_SELECT = `
  SELECT p.id, p.slug, p.name, p.description, p.nodes, p.edges, p.scopes, p.blocks, p.tags, p.visibility,
         p.owner_id, u.username AS owner_username, p.forked_from_id,
         p.created_at, p.updated_at
  FROM projects p
  JOIN "User" u ON u.id = p.owner_id
`;

export async function listProjectsForUser(userId: string): Promise<ProjectSummary[]> {
  const rows = await query<SummaryRow>(
    `SELECT id, slug, name, description, visibility, updated_at
     FROM projects
     WHERE owner_id = $1
     ORDER BY updated_at DESC`,
    [userId],
  );
  return rows.map(toSummary);
}

export interface PublicProjectSummary extends ProjectSummary {
  ownerUsername: string;
  nodes: EditorNode[];
  edges: EditorEdge[];
  /** Same self-contained snapshot as ProjectRecord.blocks - without it, a
   *  preview of a project using custom subcircuit blocks can only resolve
   *  those blocks by luck (the viewer happening to already have identically
   *  named blocks in their own local library). For anyone else, the
   *  subcircuit nodes render blank. */
  blocks: SubcircuitBlockDefinition[];
  /** The project's tabs. `blocks` alone isn't enough: a subcircuit built
   *  from another tab of the same project is deliberately never copied into
   *  `blocks`, so the thumbnail needs the tabs themselves to resolve it -
   *  see CircuitStage's `scopes` prop. */
  scopes: CircuitScope[];
  tags: string[];
}

interface PublicSummaryRow extends SummaryRow {
  owner_username: string;
  nodes: EditorNode[];
  edges: EditorEdge[];
  blocks: SubcircuitBlockDefinition[];
  scopes: CircuitScope[];
  tags: string[];
}

// Reasonable upper bound so the community page never has to render an
// unbounded list,  revisit with real pagination if it's ever hit in practice.
const PUBLIC_LISTING_LIMIT = 200;

export async function listPublicProjects(): Promise<PublicProjectSummary[]> {
  const rows = await query<PublicSummaryRow>(
    `SELECT p.id, p.slug, p.name, p.description, p.visibility, p.updated_at, p.nodes, p.edges, p.blocks, p.scopes, p.tags, u.username AS owner_username
     FROM projects p
     JOIN "User" u ON u.id = p.owner_id
     WHERE p.visibility = 'PUBLIC'
     ORDER BY p.updated_at DESC
     LIMIT $1`,
    [PUBLIC_LISTING_LIMIT],
  );
  return rows.map((row) => ({
    ...toSummary(row),
    ownerUsername: row.owner_username,
    nodes: row.nodes ?? [],
    edges: row.edges ?? [],
    blocks: row.blocks ?? [],
    scopes: row.scopes ?? [],
    tags: row.tags ?? [],
  }));
}

export async function getProjectBySlug(slug: string): Promise<ProjectRecord | null> {
  const rows = await query<ProjectRow>(`${RECORD_SELECT} WHERE p.slug = $1 LIMIT 1`, [slug]);
  return rows[0] ? toRecord(rows[0]) : null;
}

export async function getProjectById(id: string): Promise<ProjectRecord | null> {
  const rows = await query<ProjectRow>(`${RECORD_SELECT} WHERE p.id = $1 LIMIT 1`, [id]);
  return rows[0] ? toRecord(rows[0]) : null;
}

export interface CreateProjectInput {
  name: string;
  description?: string | null;
  nodes: EditorNode[];
  edges: EditorEdge[];
  /** Defaults to [] - a project created before tabs, or from a single flat
   *  circuit, has no tabs of its own yet. */
  scopes?: CircuitScope[];
  /** Defaults to [] - callers that never call resolveBlockClosure() (or
   *  whose graph has no subcircuits) just get an empty snapshot. */
  blocks?: SubcircuitBlockDefinition[];
  tags?: string[];
  visibility?: ProjectVisibility;
  /** Seed-only: a fixed slug instead of a name-derived random one. A
   *  tutorial's circuit-embed block links a specific projectSlug, so that
   *  slug has to be predictable across re-seeds rather than freshly
   *  randomized each time (see POST /api/projects's seed-auth branch,
   *  which is the only caller that ever sets this). */
  slug?: string;
}

// Slugs are name-derived and only collide when two projects share a name AND
// draw the same random suffix,  astronomically unlikely, but retry a couple
// of times rather than let a freak collision surface as a 500.
const SLUG_COLLISION_RETRIES = 3;

export async function createProject(ownerId: string, input: CreateProjectInput): Promise<ProjectRecord> {
  const name = input.name.trim() || "Untitled circuit";
  const description = input.description?.trim() || null;
  const visibility = input.visibility ?? "PRIVATE";
  const scopes = input.scopes ?? [];
  const blocks = input.blocks ?? [];
  const tags = input.tags ?? [];

  // A caller-supplied slug is used as-is (and any collision surfaces
  // directly rather than silently retrying under a different slug, which
  // would break the very predictability it exists for).
  const attempts = input.slug ? 1 : SLUG_COLLISION_RETRIES + 1;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const slug = input.slug ?? generateProjectSlug(name);
    try {
      const rows = await query<{ id: string }>(
        `INSERT INTO projects (id, slug, name, description, nodes, edges, scopes, blocks, tags, visibility, owner_id, updated_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9, $10, $11, now())
         RETURNING id`,
        [
          randomUUID(),
          slug,
          name,
          description,
          JSON.stringify(input.nodes),
          JSON.stringify(input.edges),
          JSON.stringify(scopes),
          JSON.stringify(blocks),
          tags,
          visibility,
          ownerId,
        ],
      );
      const created = await getProjectById(rows[0].id);
      if (!created) throw new Error("Project vanished immediately after insert");
      return created;
    } catch (error) {
      if (isUniqueViolation(error) && attempt < attempts - 1) continue;
      throw error;
    }
  }
  throw new Error("Could not allocate a unique project slug");
}

export interface UpdateProjectInput {
  name?: string;
  /** `null` clears the description; `undefined` leaves it untouched. */
  description?: string | null;
  nodes?: EditorNode[];
  edges?: EditorEdge[];
  /** Only ever sent alongside `nodes`/`edges` (see share-dialog.tsx) -
   *  `undefined` leaves whatever's already stored untouched. */
  scopes?: CircuitScope[];
  /** Only ever sent alongside `nodes`/`edges` (see share-dialog.tsx) -
   *  `undefined` leaves whatever snapshot is already stored untouched. */
  blocks?: SubcircuitBlockDefinition[];
  tags?: string[];
  visibility?: ProjectVisibility;
}

export async function updateProject(id: string, input: UpdateProjectInput): Promise<ProjectRecord | null> {
  const nodesJson = input.nodes !== undefined ? JSON.stringify(input.nodes) : null;
  const edgesJson = input.edges !== undefined ? JSON.stringify(input.edges) : null;
  const scopesJson = input.scopes !== undefined ? JSON.stringify(input.scopes) : null;
  const blocksJson = input.blocks !== undefined ? JSON.stringify(input.blocks) : null;
  const name = input.name !== undefined ? input.name.trim() || "Untitled circuit" : null;
  // description needs to distinguish "leave alone" from "clear it", which a
  // plain COALESCE(new, old) can't do (COALESCE(NULL, old) would keep old,
  // not clear it) - only touch the column when the caller actually sent one.
  const touchDescription = input.description !== undefined;
  const description = touchDescription ? input.description?.trim() || null : null;

  const rows = await query<{ id: string }>(
    `UPDATE projects SET
       name = COALESCE($2, name),
       description = CASE WHEN $3 THEN $4 ELSE description END,
       nodes = COALESCE($5::jsonb, nodes),
       edges = COALESCE($6::jsonb, edges),
       scopes = COALESCE($7::jsonb, scopes),
       blocks = COALESCE($8::jsonb, blocks),
       visibility = COALESCE($9, visibility),
       tags = COALESCE($10, tags),
       updated_at = now()
     WHERE id = $1
     RETURNING id`,
    [
      id,
      name,
      touchDescription,
      description,
      nodesJson,
      edgesJson,
      scopesJson,
      blocksJson,
      input.visibility ?? null,
      input.tags ?? null,
    ],
  );
  if (!rows[0]) return null;
  return getProjectById(rows[0].id);
}

export async function deleteProject(id: string): Promise<boolean> {
  const rows = await query<{ id: string }>(`DELETE FROM projects WHERE id = $1 RETURNING id`, [id]);
  return rows.length > 0;
}

export async function forkProject(source: ProjectRecord, newOwnerId: string): Promise<ProjectRecord> {
  const name = `${source.name} (fork)`;

  for (let attempt = 0; attempt <= SLUG_COLLISION_RETRIES; attempt++) {
    const slug = generateProjectSlug(name);
    try {
      const rows = await query<{ id: string }>(
        `INSERT INTO projects (id, slug, name, description, nodes, edges, scopes, blocks, visibility, owner_id, forked_from_id, updated_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, 'PRIVATE', $9, $10, now())
         RETURNING id`,
        [
          randomUUID(),
          slug,
          name,
          source.description,
          JSON.stringify(source.nodes),
          JSON.stringify(source.edges),
          JSON.stringify(source.scopes),
          JSON.stringify(source.blocks),
          newOwnerId,
          source.id,
        ],
      );
      const created = await getProjectById(rows[0].id);
      if (!created) throw new Error("Forked project vanished immediately after insert");
      return created;
    } catch (error) {
      if (isUniqueViolation(error) && attempt < SLUG_COLLISION_RETRIES) continue;
      throw error;
    }
  }
  throw new Error("Could not allocate a unique project slug for fork");
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "23505";
}
