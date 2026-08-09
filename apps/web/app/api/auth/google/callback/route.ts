import { NextRequest, NextResponse } from "next/server";
import { findOrCreateGoogleUser, createSession } from "@repo/auth";
import { exchangeGoogleAuthorizationCode, siteUrl } from "@/lib/auth/google-oauth";
import { clearGoogleOAuthCookies, readGoogleOAuthCookies, setSessionCookie } from "@/lib/auth/cookies";

// Redirects here must be built from SITE_URL, not request.url: behind the
// reverse proxy the app sees its own bind address as the request origin,
// which would send the user's browser to an unreachable internal address.
function failure(message: string): NextResponse {
  const url = new URL("/login", siteUrl());
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { codeVerifier, nonce } = await readGoogleOAuthCookies();
  await clearGoogleOAuthCookies();

  if (!codeVerifier || !nonce) {
    return failure("Google sign-in request was invalid or expired. Please try again.");
  }

  try {
    const claims = await exchangeGoogleAuthorizationCode(request.nextUrl, codeVerifier, nonce);
    if (!claims || !claims.email) {
      return failure("Google did not return the expected account details.");
    }

    const user = await findOrCreateGoogleUser({
      googleId: claims.sub,
      email: claims.email,
      emailVerified: claims.emailVerified,
      name: claims.name,
      avatarUrl: claims.picture,
    });

    const session = await createSession(user.id);
    await setSessionCookie(session.token, session.expiresAt);

    return NextResponse.redirect(new URL("/puzzles", siteUrl()));
  } catch (error) {
    console.error("[auth] google sign-in failed", error);
    return failure("Google sign-in failed. Please try again.");
  }
}
