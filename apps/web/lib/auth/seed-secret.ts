import { listUsers } from "@repo/auth";
import { getCurrentUser } from "./current-user";

export function hasValidSeedSecret(request: Request): boolean {
  const seedSecret = process.env.SEED_SECRET;
  if (!seedSecret) return false;
  return request.headers.get("x-seed-secret") === seedSecret;
}

/**
 * True for an authenticated ADMIN session, or a request carrying the
 * SEED_SECRET header - a separate credential seed/seed.mjs uses so the
 * one-shot content seeding flow doesn't need to know any particular admin's
 * real login password (which it has no way to obtain safely). Unset
 * SEED_SECRET disables the header path entirely rather than falling back to
 * some default, the same way DATABASE_URL and other secrets here have no
 * hardcoded fallback.
 */
export async function isAuthorizedAdminRequest(request: Request): Promise<boolean> {
  const currentUser = await getCurrentUser();
  if (currentUser?.role === "ADMIN") return true;
  return hasValidSeedSecret(request);
}

/**
 * The user id to record as `owner_id` for a request the seed script makes.
 * Unlike posts/tutorials (no owner column at all), a Project always needs
 * one - seeded circuits are attributed to whichever admin account was
 * created first, so `by <username>` on the community page reads as a real
 * person rather than a synthetic "system" account nobody can look up.
 * Returns null when there is no admin account yet to attribute to (a fresh
 * DB seeded before `seedAdmin()` runs), which the caller should treat as a
 * hard failure rather than silently picking some other owner.
 */
export async function resolveSeedOwnerId(request: Request): Promise<string | null> {
  const currentUser = await getCurrentUser();
  if (currentUser) return currentUser.id;
  if (!hasValidSeedSecret(request)) return null;

  const admins = (await listUsers()).filter((u) => u.role === "ADMIN");
  if (admins.length === 0) return null;
  admins.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return admins[0].id;
}
