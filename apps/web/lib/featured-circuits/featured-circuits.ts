import { randomUUID } from "node:crypto";
import { query } from "@/lib/db/client";
import type { EditorNode, EditorEdge } from "@/types/editor";
import type { SubcircuitBlockDefinition } from "@/types/subcircuit-block";
import type { CircuitScope } from "@/types/scope";

export type FeaturedPlacement = "HOMEPAGE_DEMO" | "COMMUNITY_WEEKLY";

export interface FeaturedCircuitRecord {
  id: string;
  projectId: string;
  projectSlug: string;
  projectName: string;
  placement: FeaturedPlacement;
  active: boolean;
  createdAt: string;
}

interface FeaturedRow {
  id: string;
  project_id: string;
  project_slug: string;
  project_name: string;
  placement: FeaturedPlacement;
  active: boolean;
  created_at: string;
  [key: string]: unknown;
}

const LIST_SELECT = `
  SELECT f.id, f.project_id, p.slug AS project_slug, p.name AS project_name, f.placement, f.active, f.created_at
  FROM featured_circuits f
  JOIN projects p ON p.id = f.project_id
`;

function toRecord(row: FeaturedRow): FeaturedCircuitRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    projectSlug: row.project_slug,
    projectName: row.project_name,
    placement: row.placement,
    active: row.active,
    createdAt: row.created_at,
  };
}

export async function listFeaturedCircuits(placement: FeaturedPlacement): Promise<FeaturedCircuitRecord[]> {
  const rows = await query<FeaturedRow>(
    `${LIST_SELECT} WHERE f.placement = $1::"FeaturedPlacement" ORDER BY f.created_at DESC`,
    [placement],
  );
  return rows.map(toRecord);
}

export async function addFeaturedCircuit(
  projectId: string,
  placement: FeaturedPlacement,
): Promise<FeaturedCircuitRecord> {
  const id = randomUUID();
  await query(
    `INSERT INTO featured_circuits (id, project_id, placement, active, updated_at)
     VALUES ($1, $2, $3::"FeaturedPlacement", false, now())`,
    [id, projectId, placement],
  );
  const rows = await query<FeaturedRow>(`${LIST_SELECT} WHERE f.id = $1`, [id]);
  return toRecord(rows[0]);
}

/**
 * Activates exactly this row and deactivates every other row in the SAME
 * placement, in one atomic UPDATE. Scoping by placement is what lets the
 * homepage demo and the community weekly pick be set independently -
 * activating this week's community circuit has to leave whichever project
 * is live on the homepage untouched, and vice versa.
 */
export async function setActiveFeaturedCircuit(id: string, placement: FeaturedPlacement): Promise<void> {
  await query(
    `UPDATE featured_circuits SET active = (id = $1), updated_at = now() WHERE placement = $2::"FeaturedPlacement"`,
    [id, placement],
  );
}

export async function removeFeaturedCircuit(id: string): Promise<boolean> {
  const rows = await query<{ id: string }>(`DELETE FROM featured_circuits WHERE id = $1 RETURNING id`, [id]);
  return rows.length > 0;
}

export interface ActiveFeaturedProject {
  slug: string;
  name: string;
  description: string | null;
  ownerUsername: string;
  nodes: EditorNode[];
  edges: EditorEdge[];
  scopes: CircuitScope[];
  blocks: SubcircuitBlockDefinition[];
  tags: string[];
}

interface ActiveProjectRow {
  slug: string;
  name: string;
  description: string | null;
  owner_username: string;
  nodes: EditorNode[];
  edges: EditorEdge[];
  scopes: CircuitScope[];
  blocks: SubcircuitBlockDefinition[];
  tags: string[];
  [key: string]: unknown;
}

/** Read by whichever page renders this placement (the homepage's live-demo
 *  for HOMEPAGE_DEMO, the community page's hero card for COMMUNITY_WEEKLY)
 *  - null when no admin has activated one yet, in which case the caller
 *  falls back to its own default. */
export async function getActiveFeaturedProject(placement: FeaturedPlacement): Promise<ActiveFeaturedProject | null> {
  const rows = await query<ActiveProjectRow>(
    `SELECT p.slug, p.name, p.description, u.username AS owner_username,
            p.nodes, p.edges, p.scopes, p.blocks, p.tags
     FROM featured_circuits f
     JOIN projects p ON p.id = f.project_id
     JOIN "User" u ON u.id = p.owner_id
     WHERE f.active = true AND f.placement = $1::"FeaturedPlacement"
     LIMIT 1`,
    [placement],
  );
  if (!rows[0]) return null;
  const row = rows[0];
  return {
    slug: row.slug,
    name: row.name,
    description: row.description,
    ownerUsername: row.owner_username,
    nodes: row.nodes ?? [],
    edges: row.edges ?? [],
    scopes: row.scopes ?? [],
    blocks: row.blocks ?? [],
    tags: row.tags ?? [],
  };
}
