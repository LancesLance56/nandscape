type Difficulty = "easy" | "medium" | "hard";

interface DifficultyBadgeProps {
  level: Difficulty;
}

const styles: Record<Difficulty, string> = {
  easy: "bg-surface-2 text-ink-soft",
  medium: "bg-copper-bg text-copper-dark",
  hard: "bg-ink text-surface",
};

const labels: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export function DifficultyBadge({ level }: DifficultyBadgeProps) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 font-mono text-xs font-semibold ${styles[level]}`}
    >
      {labels[level]}
    </span>
  );
}