import { cn } from "@/lib/cn";

/**
 * One ratio against a limit.
 *
 * A meter, not a two-slice pie: "18 of 25 lessons" is a single proportion, and
 * a bar reads it far faster than two wedges. The unfilled track is a lighter
 * step of the fill's own ramp rather than a neutral grey, so the whole bar
 * reads as one measurement rather than a mark sitting on unrelated furniture.
 */

export interface MeterProps {
  label: string;
  value: number;
  total: number;
  /** Overrides the "n of m" suffix, e.g. "3 of 5 this week". */
  caption?: string;
  className?: string;
  /** Marks a meter that has reached its limit - a finished track, a met goal. */
  complete?: boolean;
}

export function Meter({ label, value, total, caption, className, complete }: MeterProps) {
  const percent = total <= 0 ? 0 : Math.min(100, Math.round((value / total) * 100));
  const done = complete ?? (total > 0 && value >= total);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-xs text-ink">{label}</span>
        <span className="shrink-0 text-xxs tabular-nums text-slate">
          {caption ?? `${value} of ${total}`}
        </span>
      </div>

      <div
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={Math.max(total, 0)}
        aria-label={label}
        className="h-2 w-full overflow-hidden rounded-full bg-copper-bg"
      >
        <div
          className={cn(
            "h-full rounded-r-[4px] transition-[width]",
            done ? "bg-signal-green-strong" : "bg-(--series-lessons)",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
