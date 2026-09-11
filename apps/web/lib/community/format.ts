/**
 * Small display helpers the community surfaces share.
 *
 * Kept apart from the query modules so a client component can import them
 * without dragging the `pg` pool into the browser bundle.
 */

/**
 * Two letters for the copper disc that stands in for an avatar.
 *
 * Taken from the handle, skipping any leading separator so `_kite` reads as
 * "ki" rather than "_k". Lowercase throughout, because the disc sets them in
 * JetBrains Mono where uppercase reads as an acronym.
 */
export function initialsFor(username: string): string {
  const letters = username.replace(/[^a-zA-Z0-9]/g, "");
  return (letters || username).slice(0, 2).toLowerCase();
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * "12m", "3h", "5d", then a month once it stops being worth counting.
 *
 * For dense rails where the timestamp is the least important thing in the row
 * and has a fixed narrow column to sit in.
 */
export function shortAgo(value: Date | string): string {
  const then = typeof value === "string" ? new Date(value) : value;
  const delta = Date.now() - then.getTime();

  if (delta < MINUTE) return "now";
  if (delta < HOUR) return `${Math.floor(delta / MINUTE)}m`;
  if (delta < DAY) return `${Math.floor(delta / HOUR)}h`;
  if (delta < 7 * DAY) return `${Math.floor(delta / DAY)}d`;
  return then.toLocaleDateString("en-US", { month: "short" });
}

/**
 * "6 hours ago", "yesterday", "2 days ago", then a date.
 *
 * For a discussion, where the age of a post is part of reading it.
 */
export function longAgo(value: Date | string): string {
  const then = typeof value === "string" ? new Date(value) : value;
  const delta = Date.now() - then.getTime();

  if (delta < MINUTE) return "just now";
  if (delta < HOUR) {
    const n = Math.floor(delta / MINUTE);
    return n === 1 ? "1 minute ago" : `${n} minutes ago`;
  }
  if (delta < DAY) {
    const n = Math.floor(delta / HOUR);
    return n === 1 ? "1 hour ago" : `${n} hours ago`;
  }
  if (delta < 2 * DAY) return "yesterday";
  if (delta < 30 * DAY) return `${Math.floor(delta / DAY)} days ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function joinedLabel(value: Date | string): string {
  const then = typeof value === "string" ? new Date(value) : value;
  return `Joined ${then.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
}

/** "2 replies" / "1 reply" - the singular is worth the three lines. */
export function pluralize(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}
