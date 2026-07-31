import type { PuzzleSpec } from "@/types/puzzle";
import { listPuzzleRecords, getPuzzleRecordBySlug } from "./puzzle-records";

export async function listPuzzles(): Promise<PuzzleSpec[]> {
  const records = await listPuzzleRecords();
  return records.map((r) => r.spec);
}

export async function getPuzzleBySlug(slug: string): Promise<PuzzleSpec | null> {
  const record = await getPuzzleRecordBySlug(slug);
  return record ? record.spec : null;
}