type Difficulty = "easy" | "medium" | "hard";

interface DifficultyBadgeProps {
  level: Difficulty;
}

const styles: Record<Difficulty, string> = {
  easy: "bg-signal-green-bg text-signal-green-strong",
  medium: "bg-copper-bg text-copper-dark",
  hard: "bg-signal-coral-bg text-signal-coral-strong",
};

const labels: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export function DifficultyBadge({level}: DifficultyBadgeProps) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[level]}`}
    >
      {labels[level]}
    </span>
  );
}