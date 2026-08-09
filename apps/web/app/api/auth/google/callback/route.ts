import { NextRequest, NextResponse } from "next/server";
import { findOrCreateGoogleUser, createSession } from "@repo/auth";
import { exchangeGoogleAuthorizationCode } from "@/lib/auth/google-oauth";
import { clearGoogleOAuthCookies, readGoogleOAuthCookies, setSessionCookie } from "@/lib/auth/cookies";

function failure(request: NextRequest, message: string): NextResponse {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { codeVerifier, nonce } = await readGoogleOAuthCookies();
  await clearGoogleOAuthCookies();

  if (!codeVerifier || !nonce) {
    return failure(request, "Google sign-in request was invalid or expired. Please try again.");
  }

  try {
    const claims = await exchangeGoogleAuthorizationCode(request.nextUrl, codeVerifier, nonce);
    if (!claims || !claims.email) {
      return failure(request, "Google did not return the expected account details.");
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

    return NextResponse.redirect(new URL("/puzzles", request.url));
  } catch (error) {
    console.error("[auth] google sign-in failed", error);
    return failure(request, "Google sign-in failed. Please try again.");
  }
}
