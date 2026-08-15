import { getCurrentUser } from "./current-user";

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

  const seedSecret = process.env.SEED_SECRET;
  if (!seedSecret) return false;
  return request.headers.get("x-seed-secret") === seedSecret;
}
