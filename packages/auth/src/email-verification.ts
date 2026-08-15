import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@repo/db";
import { InvalidVerificationTokenError, VerificationCooldownError } from "./errors";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
const RESEND_COOLDOWN_MS = 1000 * 60; // 1 minute between issued tokens

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Issues a fresh verification token for the user, invalidating any token
 * issued earlier so a stale copy of an old email can't still be used. Only
 * the hash is stored (same pattern as session tokens, see tokens.ts) - the
 * raw token exists only in the returned value and the emailed link.
 */
export async function createEmailVerificationToken(userId: string): Promise<string> {
  const mostRecent = await prisma.emailVerificationToken.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  if (mostRecent && Date.now() - mostRecent.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    throw new VerificationCooldownError();
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.emailVerificationToken.deleteMany({ where: { userId } });
  await prisma.emailVerificationToken.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });

  return token;
}

export interface ConsumedVerification {
  userId: string;
  email: string;
}

/** Marks the owning user verified and burns every outstanding token for
 *  them (not just the one used - a second unopened email from an earlier
 *  resend shouldn't still work after this one succeeds). */
export async function consumeEmailVerificationToken(token: string): Promise<ConsumedVerification> {
  const tokenHash = hashToken(token);
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!record || record.expiresAt.getTime() <= Date.now()) {
    if (record) await prisma.emailVerificationToken.delete({ where: { id: record.id } }).catch(() => {});
    throw new InvalidVerificationTokenError();
  }

  const user = await prisma.user.update({
    where: { id: record.userId },
    data: { emailVerifiedAt: record.user.emailVerifiedAt ?? new Date() },
  });
  await prisma.emailVerificationToken.deleteMany({ where: { userId: record.userId } });

  return { userId: user.id, email: user.email };
}
