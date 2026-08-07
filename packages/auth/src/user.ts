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
    // Handled via the DB's unique constraint rather than a pre-check
    // findUnique + create: a check-then-insert has a race window where two
    // concurrent signups for the same email both pass the check before
    // either commits.
    if (isUniqueConstraintViolation(error)) {
      const target = error.meta?.target ?? [];
      if (target.includes("email")) throw new EmailAlreadyExistsError();
      if (target.includes("username")) throw new UsernameAlreadyExistsError();
    }
    throw error;
  }
}

export async function authenticateUser(email: string, password: string): Promise<SessionUser> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  if (!user) {
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
}): SessionUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
  };
}

export interface UpdateProfileInput {
  name?: string | null;
  username?: string;
  email?: string;
  avatarUrl?: string | null;
}

export async function updateUserProfile(userId: string, input: UpdateProfileInput): Promise<SessionUser> {
  const data: { name?: string | null; username?: string; email?: string; avatarUrl?: string | null } = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.username !== undefined) data.username = input.username;
  if (input.email !== undefined) data.email = input.email.toLowerCase();
  if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl;

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
  if (!user) throw new InvalidCredentialsError();

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