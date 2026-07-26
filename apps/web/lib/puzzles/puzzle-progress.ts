import { randomUUID } from "node:crypto";
import { query } from "@/lib/db/client";
import type { EditorNode, EditorEdge } from "@/types/editor";

export interface PuzzleProgressRecord {
  puzzleSlug: string;
  solved: boolean;
  solvedAt: string | null;
  nodes: EditorNode[];
  edges: EditorEdge[];
  updatedAt: string;
}

interface PuzzleProgressRow {
  puzzle_slug: string;
  solved: boolean;
  solved_at: string | null;
  nodes: EditorNode[];
  edges: EditorEdge[];
  updated_at: string;
}

function toRecord(row: PuzzleProgressRow): PuzzleProgressRecord {
  return {
    puzzleSlug: row.puzzle_slug,
    solved: row.solved,
    solvedAt: row.solved_at,
    nodes: row.nodes ?? [],
    edges: row.edges ?? [],
    updatedAt: row.updated_at,
  };
}

export async function listProgressForUser(userId: string): Promise<PuzzleProgressRecord[]> {
  const rows = await query<PuzzleProgressRow>(
    `SELECT puzzle_slug, solved, solved_at, nodes, edges, updated_at
     FROM puzzle_progress
     WHERE "userId" = $1
     ORDER BY updated_at DESC`,
    [userId],
  );
  return rows.map(toRecord);
}

export async function getProgress(userId: string, puzzleSlug: string): Promise<PuzzleProgressRecord | null> {
  const rows = await query<PuzzleProgressRow>(
    `SELECT puzzle_slug, solved, solved_at, nodes, edges, updated_at
     FROM puzzle_progress
     WHERE "userId" = $1 AND puzzle_slug = $2
     LIMIT 1`,
    [userId, puzzleSlug],
  );
  return rows[0] ? toRecord(rows[0]) : null;
}

export interface SaveProgressInput {
  nodes?: EditorNode[];
  edges?: EditorEdge[];
  solved?: boolean;
}

export async function saveProgress(
  userId: string,
  puzzleSlug: string,
  input: SaveProgressInput,
): Promise<PuzzleProgressRecord> {
  const nodesJson = input.nodes !== undefined ? JSON.stringify(input.nodes) : null;
  const edgesJson = input.edges !== undefined ? JSON.stringify(input.edges) : null;
  const solved = input.solved ?? null;
  const newId = randomUUID();

  const rows = await query<PuzzleProgressRow>(
    `INSERT INTO puzzle_progress (id, "userId", puzzle_slug, nodes, edges, solved, solved_at)
     VALUES (
       $1,
       $2,
       $3,
       COALESCE($4::jsonb, '[]'::jsonb),
       COALESCE($5::jsonb, '[]'::jsonb),
       COALESCE($6, false),
       CASE WHEN $6 = true THEN now() ELSE NULL END
     )
     ON CONFLICT ("userId", puzzle_slug) DO UPDATE SET
       nodes = COALESCE($4::jsonb, puzzle_progress.nodes),
       edges = COALESCE($5::jsonb, puzzle_progress.edges),
       solved = COALESCE($6, puzzle_progress.solved),
       solved_at = CASE
         WHEN $6 = true AND puzzle_progress.solved = false THEN now()
         WHEN $6 = false THEN NULL
         ELSE puzzle_progress.solved_at
       END,
       updated_at = now()
     RETURNING puzzle_slug, solved, solved_at, nodes, edges, updated_at`,
    [newId, userId, puzzleSlug, nodesJson, edgesJson, solved],
  );
  return toRecord(rows[0]);
}

export async function deleteProgress(userId: string, puzzleSlug: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `DELETE FROM puzzle_progress WHERE "userId" = $1 AND puzzle_slug = $2 RETURNING id`,
    [userId, puzzleSlug],
  );
  return rows.length > 0;
}