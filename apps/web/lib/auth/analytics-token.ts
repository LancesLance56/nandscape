import { createHash, timingSafeEqual } from "node:crypto";

/**
 * The bearer credential for `GET /api/admin/analytics/summary`, which the
 * owner's personal dashboard calls server-side. It is a separate secret from
 * SEED_SECRET on purpose: this one grants read access to aggregates and
 * nothing else, so leaking it cannot be turned into a content write.
 *
 * Unset ANALYTICS_TOKEN means the endpoint is off, the same way an unset
 * SEED_SECRET disables the seed header (see seed-secret.ts) - there is no
 * default token to guess.
 */
export function isAnalyticsTokenConfigured(): boolean {
  return Boolean(process.env.ANALYTICS_TOKEN);
}

/**
 * Constant-time comparison of the request's `Authorization: Bearer <token>`
 * against ANALYTICS_TOKEN. Both sides are hashed first so `timingSafeEqual`
 * always sees two equal-length buffers - it throws on a length mismatch, and
 * an early length check would itself leak the token's length.
 */
export function hasValidAnalyticsToken(request: Request): boolean {
  const expected = process.env.ANALYTICS_TOKEN;
  if (!expected) return false;

  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return false;

  const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();
  return timingSafeEqual(digest(match[1]), digest(expected));
}
