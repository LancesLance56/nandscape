import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "nandscape_session";

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

export async function readSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value ?? null;
}

const GOOGLE_NONCE_COOKIE = "nandscape_google_oauth_nonce";
const GOOGLE_VERIFIER_COOKIE = "nandscape_google_oauth_verifier";
const OAUTH_COOKIE_MAX_AGE_SECONDS = 60 * 10;

export async function setGoogleOAuthCookies(codeVerifier: string, nonce: string): Promise<void> {
  const store = await cookies();
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
  };
  store.set(GOOGLE_NONCE_COOKIE, nonce, options);
  store.set(GOOGLE_VERIFIER_COOKIE, codeVerifier, options);
}

export async function readGoogleOAuthCookies(): Promise<{ codeVerifier: string | null; nonce: string | null }> {
  const store = await cookies();
  return {
    codeVerifier: store.get(GOOGLE_VERIFIER_COOKIE)?.value ?? null,
    nonce: store.get(GOOGLE_NONCE_COOKIE)?.value ?? null,
  };
}

export async function clearGoogleOAuthCookies(): Promise<void> {
  const store = await cookies();
  store.delete(GOOGLE_NONCE_COOKIE);
  store.delete(GOOGLE_VERIFIER_COOKIE);
}