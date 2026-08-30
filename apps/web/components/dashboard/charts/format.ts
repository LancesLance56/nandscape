/**
 * Number and date formatting shared by every dashboard figure, so a count
 * rendered in a stat tile and the same count in a table read identically.
 */

/** 1,284 / 12.9K / 4.2M. Compact only where it buys space - below ten thousand
 *  the full number is both shorter to read and more precise. */
export function compact(value: number): string {
  if (Math.abs(value) < 10_000) return value.toLocaleString("en-US");
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(
    value,
  );
}

/**
 * Percentage change between two periods.
 *
 * Null rather than Infinity when the earlier period was zero: "up ∞%" is not a
 * fact about the site, it is a division by zero wearing a hat, and a tile that
 * prints it has stopped being honest. The caller renders "no prior activity"
 * instead.
 */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** `YYYY-MM-DD` -> `Aug 30`. The keys come from Postgres as plain date strings;
 *  `new Date("2026-08-30")` parses as UTC midnight, so the parts are split by
 *  hand rather than letting a timezone shift the label back a day. */
export function formatDayKey(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  if (!year || !month || !day) return key;
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Axis ticks at round numbers.
 *
 * Rounds the top of the scale up to a 1/2/5 × 10^n step so ticks land on values
 * a reader recognises (0, 5, 10 - never 0, 3.33, 6.67), and returns the ceiling
 * alongside them so the bars can be scaled against the same number the axis
 * shows.
 */
export function niceScale(max: number, ticks = 3): { max: number; ticks: number[] } {
  if (max <= 0) return { max: 1, ticks: [0, 1] };

  const rough = max / ticks;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? 10 * magnitude;
  const top = Math.ceil(max / step) * step;

  const out: number[] = [];
  for (let value = 0; value <= top + 1e-9; value += step) out.push(Math.round(value * 100) / 100);
  return { max: top, ticks: out };
}
