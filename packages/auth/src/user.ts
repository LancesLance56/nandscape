import { prisma } from "@repo/db";
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
  role: SessionUser["role"];
}): SessionUser {
  return { id: user.id, email: user.email, username: user.username, name: user.name, role: user.role };
}