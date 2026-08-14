import type { PuzzleDifficulty } from "@/types/puzzle";

const COLOR: Record<PuzzleDifficulty, string> = {
  easy: "text-signal-green-strong",
  medium: "text-copper-dark dark:text-copper",
  hard: "text-signal-coral-strong",
  expert: "text-ink",
};

const LABEL: Record<PuzzleDifficulty, string> = {
  easy: "Easy",
  medium: "Med.",
  hard: "Hard",
  expert: "Exp.",
};

export function DifficultyTag({ difficulty }: { difficulty: PuzzleDifficulty }) {
  return <span className={` text-xs font-bold ${COLOR[difficulty]}`}>{LABEL[difficulty]}</span>;
}