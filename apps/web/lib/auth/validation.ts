export interface SignupData {
  email: string;
  username: string;
  password: string;
  name?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

type ValidationResult<T> = { ok: true; data: T } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // filters for emails in form a@b.c
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/; // any letters, numbers, underscore only
const MIN_PASSWORD_LENGTH = 8;

export function validateSignupInput(body: unknown): ValidationResult<SignupData> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Request body must be an object" };
  }
  const { email, username, password, name } = body as Record<string, unknown>;

  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return { ok: false, error: "A valid email is required" };
  }
  if (typeof username !== "string" || !USERNAME_RE.test(username)) {
    return {
      ok: false,
      error: "Username must be 3-20 characters (letters, numbers, underscore only)",
    };
  }
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }
  if (name !== undefined && typeof name !== "string") {
    return { ok: false, error: "Name must be a string" };
  }

  return { ok: true, data: { email, username, password, name: name as string | undefined } };
}

export function validateLoginInput(body: unknown): ValidationResult<LoginData> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Request body must be an object" };
  }
  const { email, password } = body as Record<string, unknown>;

  if (typeof email !== "string" || email.length === 0) {
    return { ok: false, error: "Email is required" };
  }
  if (typeof password !== "string" || password.length === 0) {
    return { ok: false, error: "Password is required" };
  }

  return { ok: true, data: { email, password } };
}

export interface UpdateProfileData {
  name?: string | null;
  username?: string;
  email?: string;
  avatarUrl?: string | null;
}

export function validateUpdateProfileInput(body: unknown): ValidationResult<UpdateProfileData> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Request body must be an object" };
  }
  const { name, username, email, avatarUrl } = body as Record<string, unknown>;
  const data: UpdateProfileData = {};

  if (email !== undefined) {
    if (typeof email !== "string" || !EMAIL_RE.test(email)) {
      return { ok: false, error: "A valid email is required" };
    }
    data.email = email;
  }
  if (username !== undefined) {
    if (typeof username !== "string" || !USERNAME_RE.test(username)) {
      return {
        ok: false,
        error: "Username must be 3-20 characters (letters, numbers, underscore only)",
      };
    }
    data.username = username;
  }
  if (name !== undefined) {
    if (name !== null && typeof name !== "string") {
      return { ok: false, error: "Name must be a string or null" };
    }
    data.name = name as string | null;
  }
  if (avatarUrl !== undefined) {
    if (avatarUrl !== null && typeof avatarUrl !== "string") {
      return { ok: false, error: "Avatar URL must be a string or null" };
    }
    data.avatarUrl = avatarUrl as string | null;
  }

  return { ok: true, data };
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export function validateChangePasswordInput(body: unknown): ValidationResult<ChangePasswordData> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Request body must be an object" };
  }
  const { currentPassword, newPassword } = body as Record<string, unknown>;

  if (typeof currentPassword !== "string" || currentPassword.length === 0) {
    return { ok: false, error: "Current password is required" };
  }
  if (typeof newPassword !== "string" || newPassword.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }

  return { ok: true, data: { currentPassword, newPassword } };
}