import { NextResponse, type NextRequest } from "next/server";

/**
 * Force HTTPS, which the SEO audit flagged. Serving the same page on both
 * schemes splits link equity across two URLs a crawler treats as separate,
 * and browsers flag the http:// one as insecure.
 *
 * The decision is made from `x-forwarded-proto`, not `request.url`: this app
 * runs behind a reverse proxy (see the note on lib/site-url.ts), where TLS
 * terminates at the proxy and the request reaching Next is plain http on an
 * internal address. The proxy's header is the only honest signal of what the
 * *client* actually used. A 308 (not 302) preserves the method and tells
 * crawlers the move is permanent, which is what transfers ranking.
 */
export function middleware(request: NextRequest) {
  const proto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("host") ?? "";

  // No header at all means nothing is proxying us - local dev, or a direct
  // container hit. Redirecting there would break `pnpm dev` outright.
  if (!proto || proto === "https") return NextResponse.next();

  // Belt and braces: localhost has no certificate to redirect to.
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.protocol = "https:";
  url.host = host;
  return NextResponse.redirect(url, 308);
}

export const config = {
  // Skip Next's own internals and anything with a file extension - static
  // assets are served straight through and never need the scheme check.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
