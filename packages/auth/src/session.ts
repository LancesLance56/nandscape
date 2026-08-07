import { prisma, type Role } from "@repo/db";
import { generateSessionToken, hashSessionToken } from "./tokens";

export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const RENEWAL_THRESHOLD_MS = 1000 * 60 * 60 * 24 * 15; // renew once under 15 days remain

export interface SessionUser {
  id: string;
  email: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  role: Role;
}

export interface CreatedSession {
  token: string;
  expiresAt: Date;
}

export async function createSession(userId: string): Promise<CreatedSession> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: { userId, tokenHash: hashSessionToken(token), expiresAt },
  });

  return { token, expiresAt };
}

export interface ValidatedSession {
  user: SessionUser;
  expiresAt: Date;
  /** True if the caller should re-issue the session cookie with the new expiry. */
  renewed: boolean;
}

export async function validateSessionToken(token: string): Promise<ValidatedSession | null> {
  const tokenHash = hashSessionToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {
      // Already gone (e.g. a concurrent logout),  not an error condition.
    });
    return null;
  }

  let expiresAt = session.expiresAt;
  let renewed = false;
  if (expiresAt.getTime() - Date.now() < RENEWAL_THRESHOLD_MS) {
    expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await prisma.session.update({ where: { id: session.id }, data: { expiresAt } });
    renewed = true;
  }

  const { user } = session;
  return {
    expiresAt,
    renewed,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
    },
  };
}

export async function invalidateSessionToken(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
}

export async function invalidateAllUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}