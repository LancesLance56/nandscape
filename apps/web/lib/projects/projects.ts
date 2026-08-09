import { randomUUID } from "node:crypto";
import { query } from "@/lib/db/client";
import { generateProjectSlug } from "./slug";
import type { EditorNode, EditorEdge } from "@/types/editor";

export type ProjectVisibility = "PRIVATE" | "UNLISTED" | "PUBLIC";

export interface ProjectRecord {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  nodes: EditorNode[];
  edges: EditorEdge[];
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
  SELECT p.id, p.slug, p.name, p.description, p.nodes, p.edges, p.visibility,
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
}

interface PublicSummaryRow extends SummaryRow {
  owner_username: string;
  nodes: EditorNode[];
  edges: EditorEdge[];
}

// Reasonable upper bound so the community page never has to render an
// unbounded list,  revisit with real pagination if it's ever hit in practice.
const PUBLIC_LISTING_LIMIT = 200;

export async function listPublicProjects(): Promise<PublicProjectSummary[]> {
  const rows = await query<PublicSummaryRow>(
    `SELECT p.id, p.slug, p.name, p.description, p.visibility, p.updated_at, p.nodes, p.edges, u.username AS owner_username
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
  visibility?: ProjectVisibility;
}

// Slugs are name-derived and only collide when two projects share a name AND
// draw the same random suffix,  astronomically unlikely, but retry a couple
// of times rather than let a freak collision surface as a 500.
const SLUG_COLLISION_RETRIES = 3;

export async function createProject(ownerId: string, input: CreateProjectInput): Promise<ProjectRecord> {
  const name = input.name.trim() || "Untitled circuit";
  const description = input.description?.trim() || null;
  const visibility = input.visibility ?? "PRIVATE";

  for (let attempt = 0; attempt <= SLUG_COLLISION_RETRIES; attempt++) {
    const slug = generateProjectSlug(name);
    try {
      const rows = await query<{ id: string }>(
        `INSERT INTO projects (id, slug, name, description, nodes, edges, visibility, owner_id, updated_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, now())
         RETURNING id`,
        [randomUUID(), slug, name, description, JSON.stringify(input.nodes), JSON.stringify(input.edges), visibility, ownerId],
      );
      const created = await getProjectById(rows[0].id);
      if (!created) throw new Error("Project vanished immediately after insert");
      return created;
    } catch (error) {
      if (isUniqueViolation(error) && attempt < SLUG_COLLISION_RETRIES) continue;
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
  visibility?: ProjectVisibility;
}

export async function updateProject(id: string, input: UpdateProjectInput): Promise<ProjectRecord | null> {
  const nodesJson = input.nodes !== undefined ? JSON.stringify(input.nodes) : null;
  const edgesJson = input.edges !== undefined ? JSON.stringify(input.edges) : null;
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
       visibility = COALESCE($7, visibility),
       updated_at = now()
     WHERE id = $1
     RETURNING id`,
    [id, name, touchDescription, description, nodesJson, edgesJson, input.visibility ?? null],
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
        `INSERT INTO projects (id, slug, name, description, nodes, edges, visibility, owner_id, forked_from_id, updated_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, 'PRIVATE', $7, $8, now())
         RETURNING id`,
        [
          randomUUID(),
          slug,
          name,
          source.description,
          JSON.stringify(source.nodes),
          JSON.stringify(source.edges),
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
