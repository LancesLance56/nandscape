import * as client from "openid-client";

let configPromise: Promise<client.Configuration> | undefined;

function getConfig(): Promise<client.Configuration> {
  configPromise ??= client.discovery(
    new URL("https://accounts.google.com"),
    process.env.GOOGLE_CLIENT_ID ?? "",
    process.env.GOOGLE_CLIENT_SECRET ?? "",
  );
  return configPromise;
}

export function siteUrl(): string {
  return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

function redirectURI(): string {
  return `${siteUrl()}/api/auth/google/callback`;
}

export async function buildGoogleAuthorizationUrl(codeVerifier: string, nonce: string): Promise<URL> {
  const config = await getConfig();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
  return client.buildAuthorizationUrl(config, {
    redirect_uri: redirectURI(),
    scope: "openid email profile",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    nonce,
  });
}

export interface GoogleClaims {
  sub: string;
  email?: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

export async function exchangeGoogleAuthorizationCode(
  currentUrl: URL,
  codeVerifier: string,
  nonce: string,
): Promise<GoogleClaims | null> {
  const config = await getConfig();
  // authorizationCodeGrant() derives the redirect_uri it sends to Google from
  // currentUrl's origin, not from redirectURI(). Behind a reverse proxy the
  // request's real origin isn't what Google has registered, so we rebuild the
  // callback URL from SITE_URL and keep only the query string (code, etc.)
  // from the incoming request.
  const callbackUrl = new URL(redirectURI());
  callbackUrl.search = currentUrl.search;
  const tokens = await client.authorizationCodeGrant(config, callbackUrl, {
    pkceCodeVerifier: codeVerifier,
    expectedNonce: nonce,
    idTokenExpected: true,
  });
  const claims = tokens.claims();
  if (!claims) return null;

  return {
    sub: claims.sub,
    email: typeof claims.email === "string" ? claims.email : undefined,
    emailVerified: claims.email_verified === true,
    name: typeof claims.name === "string" ? claims.name : undefined,
    picture: typeof claims.picture === "string" ? claims.picture : undefined,
  };
}
