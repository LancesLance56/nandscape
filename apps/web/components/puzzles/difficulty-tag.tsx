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

/**
 * The tinted chip form, for the one place a difficulty is a headline rather
 * than a table cell. Lists abbreviate and stay unboxed because a column of
 * pills is noise; a problem page shows one, so it can afford the ground.
 */
const PILL_BG: Record<PuzzleDifficulty, string> = {
  easy: "bg-signal-green-bg",
  medium: "bg-copper-bg",
  hard: "bg-signal-coral-bg",
  expert: "bg-surface-3",
};

const PILL_LABEL: Record<PuzzleDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  expert: "Expert",
};

export function DifficultyTag({
  difficulty,
  pill,
}: {
  difficulty: PuzzleDifficulty;
  pill?: boolean;
}) {
  if (pill) {
    return (
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PILL_BG[difficulty]} ${COLOR[difficulty]}`}
      >
        {PILL_LABEL[difficulty]}
      </span>
    );
  }

  return <span className={` text-xs font-bold ${COLOR[difficulty]}`}>{LABEL[difficulty]}</span>;
}
