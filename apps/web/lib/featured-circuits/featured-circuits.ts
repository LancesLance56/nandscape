import { randomUUID } from "node:crypto";
import { query } from "@/lib/db/client";
import type { EditorNode, EditorEdge } from "@/types/editor";
import type { SubcircuitBlockDefinition } from "@/types/subcircuit-block";

export interface FeaturedCircuitRecord {
  id: string;
  projectId: string;
  projectSlug: string;
  projectName: string;
  active: boolean;
  createdAt: string;
}

interface FeaturedRow {
  id: string;
  project_id: string;
  project_slug: string;
  project_name: string;
  active: boolean;
  created_at: string;
  [key: string]: unknown;
}

const LIST_SELECT = `
  SELECT f.id, f.project_id, p.slug AS project_slug, p.name AS project_name, f.active, f.created_at
  FROM featured_circuits f
  JOIN projects p ON p.id = f.project_id
`;

function toRecord(row: FeaturedRow): FeaturedCircuitRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    projectSlug: row.project_slug,
    projectName: row.project_name,
    active: row.active,
    createdAt: row.created_at,
  };
}

export async function listFeaturedCircuits(): Promise<FeaturedCircuitRecord[]> {
  const rows = await query<FeaturedRow>(`${LIST_SELECT} ORDER BY f.created_at DESC`);
  return rows.map(toRecord);
}

export async function addFeaturedCircuit(projectId: string): Promise<FeaturedCircuitRecord> {
  const id = randomUUID();
  await query(
    `INSERT INTO featured_circuits (id, project_id, active, updated_at) VALUES ($1, $2, false, now())`,
    [id, projectId],
  );
  const rows = await query<FeaturedRow>(`${LIST_SELECT} WHERE f.id = $1`, [id]);
  return toRecord(rows[0]);
}

/** Activates exactly this row and deactivates every other one, in a single
 *  atomic UPDATE - no separate transaction needed since one statement
 *  touches the whole table at once. */
export async function setActiveFeaturedCircuit(id: string): Promise<void> {
  await query(`UPDATE featured_circuits SET active = (id = $1), updated_at = now()`, [id]);
}

export async function removeFeaturedCircuit(id: string): Promise<boolean> {
  const rows = await query<{ id: string }>(`DELETE FROM featured_circuits WHERE id = $1 RETURNING id`, [id]);
  return rows.length > 0;
}

export interface ActiveFeaturedProject {
  name: string;
  nodes: EditorNode[];
  edges: EditorEdge[];
  blocks: SubcircuitBlockDefinition[];
}

interface ActiveProjectRow {
  name: string;
  nodes: EditorNode[];
  edges: EditorEdge[];
  blocks: SubcircuitBlockDefinition[];
  [key: string]: unknown;
}

/** Read by the homepage (see apps/web/app/page.tsx) to pick what
 *  live-demo.tsx renders - null when no admin has activated one yet, in
 *  which case the homepage falls back to its own hardcoded default circuit. */
export async function getActiveFeaturedProject(): Promise<ActiveFeaturedProject | null> {
  const rows = await query<ActiveProjectRow>(
    `SELECT p.name, p.nodes, p.edges, p.blocks
     FROM featured_circuits f
     JOIN projects p ON p.id = f.project_id
     WHERE f.active = true
     LIMIT 1`,
  );
  if (!rows[0]) return null;
  return { name: rows[0].name, nodes: rows[0].nodes ?? [], edges: rows[0].edges ?? [], blocks: rows[0].blocks ?? [] };
}
