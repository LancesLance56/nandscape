import { prisma, type Role } from "@repo/db";

export type { Role };
import { hashPassword, needsRehash, verifyPassword } from "./password";
import { EmailAlreadyExistsError, InvalidCredentialsError, UsernameAlreadyExistsError } from "./errors";
import type { SessionUser } from "./session";

export interface CreateUserInput {
  email: string;
  username: string;
  password: string;
  name?: string;
}

function isUniqueConstraintViolation(
  error: unknown,
): error is { code: "P2002"; meta?: { target?: string[] } } {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002";
}

export async function createUser(input: CreateUserInput): Promise<SessionUser> {
  const passwordHash = await hashPassword(input.password);
  const email = input.email.toLowerCase();

  try {
    const user = await prisma.user.create({
      data: { email, username: input.username, passwordHash, name: input.name },
    });
    return toSessionUser(user);
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      const target = error.meta?.target ?? [];
      if (target.includes("email")) throw new EmailAlreadyExistsError();
      if (target.includes("username")) throw new UsernameAlreadyExistsError();
    }
    throw error;
  }
}

export interface GoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  avatarUrl?: string;
}

function usernameBaseFromEmail(email: string): string {
  const local = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 15);
  return local.length >= 3 ? local : `user${local}`;
}

async function generateUniqueUsername(email: string): Promise<string> {
  const base = usernameBaseFromEmail(email);
  let candidate = base;
  let suffix = 0;

  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    suffix += 1;
    candidate = `${base}${suffix}`;
  }

  return candidate;
}

export async function findOrCreateGoogleUser(profile: GoogleProfile): Promise<SessionUser> {
  const email = profile.email.toLowerCase();

  const byGoogleId = await prisma.user.findUnique({ where: { googleId: profile.googleId } });
  if (byGoogleId) return toSessionUser(byGoogleId);

  if (profile.emailVerified) {
    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      const linked = await prisma.user.update({
        where: { id: byEmail.id },
        data: { googleId: profile.googleId, emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date() },
      });
      return toSessionUser(linked);
    }
  }

  const username = await generateUniqueUsername(email);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        username,
        googleId: profile.googleId,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
        // Google already confirmed this address, so there's nothing for our
        // own verification email to add - skip straight to verified.
        emailVerifiedAt: profile.emailVerified ? new Date() : null,
      },
    });
    return toSessionUser(user);
  } catch (error) {
    // Someone else's request won a race for this googleId/email/username
    // between the checks above and this insert - re-resolve rather than
    // failing outright, since an existing account is what the caller wants
    // either way.
    if (isUniqueConstraintViolation(error)) {
      return findOrCreateGoogleUser(profile);
    }
    throw error;
  }
}

export async function authenticateUser(email: string, password: string): Promise<SessionUser> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  if (!user || user.passwordHash === null) {
    // Same dummy hash in both branches (unknown email, and a Google-only
    // account with no password set) so the response time can't be used to
    // tell the two cases apart.
    await hashPassword(password);
    throw new InvalidCredentialsError();
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw new InvalidCredentialsError();

  if (needsRehash(user.passwordHash)) {
    const passwordHash = await hashPassword(password);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } }).catch(() => {
    });
  }

  return toSessionUser(user);
}

function toSessionUser(user: {
  id: string;
  email: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  role: SessionUser["role"];
  emailVerifiedAt: Date | null;
}): SessionUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    emailVerified: user.emailVerifiedAt !== null,
  };
}

export interface UpdateProfileInput {
  name?: string | null;
  username?: string;
  email?: string;
  avatarUrl?: string | null;
}

export async function updateUserProfile(userId: string, input: UpdateProfileInput): Promise<SessionUser> {
  const data: {
    name?: string | null;
    username?: string;
    email?: string;
    avatarUrl?: string | null;
    emailVerifiedAt?: Date | null;
  } = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.username !== undefined) data.username = input.username;
  if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl;

  if (input.email !== undefined) {
    const nextEmail = input.email.toLowerCase();
    data.email = nextEmail;
    // Changing the address unverifies it - the old address's verification
    // says nothing about who controls the new one, so carrying it forward
    // would let someone claim an unowned inbox as "verified" for free.
    const current = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (current && current.email !== nextEmail) data.emailVerifiedAt = null;
  }

  try {
    const user = await prisma.user.update({ where: { id: userId }, data });
    return toSessionUser(user);
  } catch (error) {
    // Same race-safe pattern as createUser: let the DB's unique constraint
    // catch the collision rather than checking first.
    if (isUniqueConstraintViolation(error)) {
      const target = error.meta?.target ?? [];
      if (target.includes("email")) throw new EmailAlreadyExistsError();
      if (target.includes("username")) throw new UsernameAlreadyExistsError();
    }
    throw error;
  }
}

export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  // No separate "user not found" error here - getCurrentUser() is what
  // resolved userId in the first place, so a miss means the account was
  // deleted mid-session. Reporting it as bad credentials rather than a
  // distinct case is fine; either way the request can't proceed.
  //
  // A null passwordHash means this account was created via Google sign-in
  // and has never had a password to change - same "invalid credentials"
  // response, since there's no current password for the caller to have
  // provided correctly. Setting an initial password for a Google-only
  // account would be a different flow (no current password to verify)
  // that doesn't exist yet.
  if (!user || user.passwordHash === null) throw new InvalidCredentialsError();

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) throw new InvalidCredentialsError();

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

export interface UserSummary {
  id: string;
  email: string;
  username: string;
  name: string | null;
  role: Role;
  createdAt: Date;
}

export async function listUsers(): Promise<UserSummary[]> {
  return prisma.user.findMany({
    select: { id: true, email: true, username: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateUserRole(userId: string, role: Role): Promise<SessionUser> {
  const user = await prisma.user.update({ where: { id: userId }, data: { role } });
  return toSessionUser(user);
}