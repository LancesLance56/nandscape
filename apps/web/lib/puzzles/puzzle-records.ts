import { randomUUID } from "node:crypto";
import { query } from "@/lib/db/client";
import { difficultyFromPrisma, difficultyToPrisma } from "@/types/puzzle";
import type { PrismaDifficulty, PuzzleDifficulty, PuzzleSpec, InputDisplayGroup, OutputDisplayGroup } from "@/types/puzzle";

export interface PuzzleRecord {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  difficulty: PuzzleDifficulty;
  spec: PuzzleSpec;
  createdAt: string;
  updatedAt: string;
}

interface PuzzleData {
  tags: string[];
  gateBudget: number | null;
  allowedGateTypes: number[] | null;
  disallowedGateTypes: number[] | null;
  gateRestrictionDisplay: string | null;
  inputs: PuzzleSpec["inputs"];
  outputs: PuzzleSpec["outputs"];
  inputDisplay?: InputDisplayGroup[] | null;
  outputDisplay?: OutputDisplayGroup[] | null;
}

interface PuzzleSolution {
  testCases: PuzzleSpec["testCases"];
}

interface PuzzleRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  difficulty: PrismaDifficulty;
  data: PuzzleData;
  solution: PuzzleSolution;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

function toSpec(row: PuzzleRow): PuzzleSpec {
  return {
    slug: row.slug,
    title: row.title,
    description: row.description ?? "",
    difficulty: difficultyFromPrisma(row.difficulty),
    tags: row.data.tags ?? [],
    gateBudget: row.data.gateBudget ?? null,
    allowedGateTypes: (row.data.allowedGateTypes ?? null) as PuzzleSpec["allowedGateTypes"],
    disallowedGateTypes: (row.data.disallowedGateTypes ?? null) as PuzzleSpec["disallowedGateTypes"],
    gateRestrictionDisplay: (row.data.gateRestrictionDisplay ?? undefined) as PuzzleSpec["gateRestrictionDisplay"],
    inputs: row.data.inputs,
    outputs: row.data.outputs,
    inputDisplay: (row.data.inputDisplay ?? undefined) as PuzzleSpec["inputDisplay"],
    outputDisplay: (row.data.outputDisplay ?? undefined) as PuzzleSpec["outputDisplay"],
    testCases: row.solution.testCases,
  };
}

function toRecord(row: PuzzleRow): PuzzleRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    difficulty: difficultyFromPrisma(row.difficulty),
    spec: toSpec(row),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const SELECT_COLUMNS = `
  id, slug, title, description, difficulty, data, solution,
  "createdAt", "updatedAt"
`;

export async function listPuzzleRecords(): Promise<PuzzleRecord[]> {
  const rows = await query<PuzzleRow>(
    `SELECT ${SELECT_COLUMNS} FROM "Puzzle" ORDER BY "createdAt" ASC`,
  );
  return rows.map(toRecord);
}

export async function getPuzzleRecordBySlug(slug: string): Promise<PuzzleRecord | null> {
  const rows = await query<PuzzleRow>(
    `SELECT ${SELECT_COLUMNS} FROM "Puzzle" WHERE slug = $1 LIMIT 1`,
    [slug],
  );
  return rows[0] ? toRecord(rows[0]) : null;
}

export interface PuzzleSeedInput {
  slug: string;
  title: string;
  description?: string;
  difficulty: PuzzleDifficulty;
  tags?: string[];
  gateBudget?: number | null;
  allowedGateTypes?: number[] | null;
  disallowedGateTypes?: number[] | null;
  gateRestrictionDisplay?: "hide" | "disable";
  inputs: PuzzleSpec["inputs"];
  outputs: PuzzleSpec["outputs"];
  inputDisplay?: InputDisplayGroup[] | null;
  outputDisplay?: OutputDisplayGroup[] | null;
  testCases: PuzzleSpec["testCases"];
}

function buildData(input: PuzzleSeedInput): PuzzleData {
  return {
    tags: input.tags ?? [],
    gateBudget: input.gateBudget ?? null,
    allowedGateTypes: input.allowedGateTypes ?? null,
    disallowedGateTypes: input.disallowedGateTypes ?? null,
    gateRestrictionDisplay: input.gateRestrictionDisplay ?? null,
    inputs: input.inputs,
    outputs: input.outputs,
    inputDisplay: input.inputDisplay ?? null,
    outputDisplay: input.outputDisplay ?? null,
  };
}

export async function createPuzzleRecord(input: PuzzleSeedInput): Promise<PuzzleRecord> {
  const id = randomUUID();
  const data = buildData(input);
  const solution: PuzzleSolution = { testCases: input.testCases };

  // Seeded puzzles (the only caller of this route today - see seed/seed.mjs)
  // have no human author, and creatorId is nullable specifically for that
  // case (see onDelete: SetNull on Puzzle.creator in schema.prisma).
  const rows = await query<PuzzleRow>(
    `INSERT INTO "Puzzle" (id, slug, title, description, difficulty, data, solution, "creatorId", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5::"Difficulty", $6::jsonb, $7::jsonb, $8, now(), now())
     RETURNING *`,
    [
      id,
      input.slug,
      input.title,
      input.description ?? null,
      difficultyToPrisma(input.difficulty),
      JSON.stringify(data),
      JSON.stringify(solution),
      null,
    ],
  );
  return toRecord(rows[0]);
}

export async function updatePuzzleRecord(
  slug: string,
  patch: Partial<PuzzleSeedInput>,
): Promise<PuzzleRecord | null> {
  const existing = await getPuzzleRecordBySlug(slug);
  if (!existing) return null;

  const merged: PuzzleSeedInput = {
    slug: existing.spec.slug,
    title: patch.title ?? existing.spec.title,
    description: patch.description ?? existing.spec.description,
    difficulty: patch.difficulty ?? existing.spec.difficulty,
    tags: patch.tags ?? existing.spec.tags,
    gateBudget: patch.gateBudget !== undefined ? patch.gateBudget : existing.spec.gateBudget,
    allowedGateTypes:
      patch.allowedGateTypes !== undefined
        ? patch.allowedGateTypes
        : (existing.spec.allowedGateTypes as number[] | null | undefined) ?? null,
    disallowedGateTypes:
      patch.disallowedGateTypes !== undefined
        ? patch.disallowedGateTypes
        : (existing.spec.disallowedGateTypes as number[] | null | undefined) ?? null,
    gateRestrictionDisplay: patch.gateRestrictionDisplay ?? existing.spec.gateRestrictionDisplay,
    inputs: patch.inputs ?? existing.spec.inputs,
    outputs: patch.outputs ?? existing.spec.outputs,
    inputDisplay:
      patch.inputDisplay !== undefined
        ? patch.inputDisplay
        : (existing.spec.inputDisplay as InputDisplayGroup[] | null | undefined) ?? null,
    outputDisplay:
      patch.outputDisplay !== undefined
        ? patch.outputDisplay
        : (existing.spec.outputDisplay as OutputDisplayGroup[] | null | undefined) ?? null,
    testCases: patch.testCases ?? existing.spec.testCases,
  };

  const data = buildData(merged);
  const solution: PuzzleSolution = { testCases: merged.testCases };

  const rows = await query<PuzzleRow>(
    `UPDATE "Puzzle" SET
       title = $2,
       description = $3,
       difficulty = $4::"Difficulty",
       data = $5::jsonb,
       solution = $6::jsonb,
       "updatedAt" = now()
     WHERE slug = $1
     RETURNING ${SELECT_COLUMNS}`,
    [
      slug,
      merged.title,
      merged.description ?? null,
      difficultyToPrisma(merged.difficulty),
      JSON.stringify(data),
      JSON.stringify(solution),
    ],
  );
  return rows[0] ? toRecord(rows[0]) : null;
}
