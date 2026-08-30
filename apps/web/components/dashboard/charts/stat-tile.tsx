import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { compact, percentChange } from "./format";
import { cn } from "@/lib/cn";

/**
 * A single number, with optional change against the period before it.
 *
 * This is the right form for most of what a dashboard leads with. A one-bar bar
 * chart says nothing a number does not, and the KPI row is a row of these
 * rather than a grouped bar chart for the same reason.
 *
 * The card shape - a bordered rounded tile with its icon in a filled square -
 * is the one Watermelon's dashboard uses for its metric row.
 */

export interface StatTileProps {
  label: string;
  value: number;
  /** Static context under the value, e.g. "of 51 published". Mutually
   *  exclusive with a delta - the tile has room for one or the other. */
  detail?: string;
  /** Previous-period value. Supply it and the tile computes and renders the
   *  change; leave it out and there is simply no delta, rather than a zero. */
  previous?: number;
  /** Name of the comparison window, e.g. "prev 30 days". */
  previousLabel?: string;
  /** Whether an increase is good news. Sign-ups up is good; nothing here is
   *  currently inverted, but a "reported circuits" tile would be. */
  upIsGood?: boolean;
  icon?: LucideIcon;
  href?: string;
}

export function StatTile({
  label,
  value,
  detail,
  previous,
  previousLabel = "prev period",
  upIsGood = true,
  icon: Icon,
  href,
}: StatTileProps) {
  const change = previous === undefined ? null : percentChange(value, previous);
  const rising = change !== null && change > 0;
  const falling = change !== null && change < 0;
  const good = rising === upIsGood;

  const body = (
    <>
      {Icon && (
        <span className="flex size-9 items-center justify-center rounded-lg bg-copper-bg text-copper-dark">
          <Icon className="size-4.5" />
        </span>
      )}

      <span className="flex flex-col gap-0.5">
        {/* Proportional figures on purpose: tabular-nums gives every digit the
            width of a zero, which makes a value like 121 look loose at this
            size. Tabular is for columns that align, not for headline numbers. */}
        <span className="font-display text-2xl font-bold text-ink">{compact(value)}</span>
        <span className="text-xs text-ink-soft">{label}</span>

        {change !== null ? (
          <span
            className={cn(
              "mt-1 flex items-center gap-1 text-xxs font-medium",
              change === 0 && "text-slate",
              change !== 0 && good && "text-signal-green-strong",
              change !== 0 && !good && "text-signal-coral-strong",
            )}
          >
            {rising && <ArrowUpRight className="size-3" aria-hidden />}
            {falling && <ArrowDownRight className="size-3" aria-hidden />}
            {change > 0 ? "+" : ""}
            {change}% <span className="font-normal text-slate">vs {previousLabel}</span>
          </span>
        ) : previous !== undefined ? (
          // previous was zero, so a percentage would be a division by zero
          // dressed up as growth.
          <span className="mt-1 text-xxs text-slate">
            {value === 0 ? `None in the ${previousLabel} either` : `First in the ${previousLabel}`}
          </span>
        ) : detail ? (
          <span className="mt-1 text-xxs text-slate">{detail}</span>
        ) : null}
      </span>
    </>
  );

  const className =
    "flex flex-col gap-3 rounded-2xl border border-border bg-surface-card p-4 transition-colors";

  if (href) {
    return (
      <Link href={href} className={cn(className, "hover:border-border-strong hover:bg-(--card-hover)")}>
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}
