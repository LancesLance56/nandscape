import * as client from "openid-client";
import { NextResponse } from "next/server";
import { buildGoogleAuthorizationUrl } from "@/lib/auth/google-oauth";
import { setGoogleOAuthCookies } from "@/lib/auth/cookies";

export async function GET() {
  const codeVerifier = client.randomPKCECodeVerifier();
  const nonce = client.randomNonce();
  const url = await buildGoogleAuthorizationUrl(codeVerifier, nonce);

  await setGoogleOAuthCookies(codeVerifier, nonce);
  return NextResponse.redirect(url);
}
