import { validateSessionToken, type SessionUser } from "@repo/auth";
import { clearSessionCookie, readSessionToken, setSessionCookie } from "./cookies";

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = await readSessionToken();
  if (!token) return null;

  const result = await validateSessionToken(token);
  if (!result) {
    await clearSessionCookie().catch(() => {});
    return null;
  }

  if (result.renewed) {
    await setSessionCookie(token, result.expiresAt).catch(() => {});
  }

  return result.user;
}