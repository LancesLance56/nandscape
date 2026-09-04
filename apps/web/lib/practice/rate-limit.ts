/**
 * Per-user request throttling for the two routes that reach the execution
 * engine.
 *
 * This is the second of three layers, and each covers what the others cannot:
 * the engine has no public port, so nothing outside the compose network can
 * reach it at all; the concurrency gate in piston.ts bounds how much work the
 * host does at any instant; and this bounds how much any one account can ask
 * for over time. Without it, a single logged-in user can hold every execution
 * slot indefinitely and the judge is unusable for everyone else without a
 * single request ever looking abusive.
 *
 * Deliberately in-process. A fixed-window counter in memory is the right
 * weight for a single-instance deployment, which is what docker-compose.yml
 * describes. If the web service is ever scaled to more than one replica this
 * becomes per-replica and needs moving behind Postgres or Redis - the call
 * sites would not change, only the body of `consume`.
 */

interface Window {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60_000;
const buckets = new Map<string, Window>();

/**
 * Bounded so an attacker cannot grow the map without limit by rotating keys.
 * Well above any plausible number of concurrently active users on this site,
 * and the sweep below keeps it far under this in practice.
 */
const MAX_BUCKETS = 10_000;

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the window resets. Sent as Retry-After when blocked. */
  retryAfter: number;
  remaining: number;
}

export function consume(key: string, limit: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfter: 0, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      remaining: 0,
    };
  }

  existing.count += 1;
  return { allowed: true, retryAfter: 0, remaining: limit - existing.count };
}

let lastSweep = 0;

function sweep(now: number): void {
  // Once a window at most, unless the map is over its cap - walking every
  // bucket on every request would make the limiter its own bottleneck.
  if (now - lastSweep < WINDOW_MS && buckets.size < MAX_BUCKETS) return;
  lastSweep = now;
  for (const [key, window] of buckets) {
    if (window.resetAt <= now) buckets.delete(key);
  }
}
