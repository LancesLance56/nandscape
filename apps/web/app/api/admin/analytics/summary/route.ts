import { NextRequest, NextResponse } from "next/server";
import { hasValidAnalyticsToken, isAnalyticsTokenConfigured } from "@/lib/auth/analytics-token";
import { getUsageSummary, resolveRange } from "@/lib/analytics/usage-summary";

/**
 * Aggregate usage stats for the owner's personal dashboard (nandscape.dev),
 * which calls this server-side with `Authorization: Bearer $ANALYTICS_TOKEN`.
 * Read-only, counts and per-day series only - see lib/analytics/usage-summary.ts
 * for exactly what each number means.
 *
 * Token-only rather than also accepting an ADMIN session: the admin pages read
 * lib/analytics directly, and keeping one credential here keeps the surface
 * this route exposes to the outside world to exactly one secret.
 */
export async function GET(request: NextRequest) {
  if (!isAnalyticsTokenConfigured()) {
    return NextResponse.json({ error: "Analytics endpoint is not configured" }, { status: 503 });
  }
  if (!hasValidAnalyticsToken(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
    );
  }

  const params = request.nextUrl.searchParams;
  const resolved = resolveRange(params.get("from"), params.get("to"));
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: 422 });
  }

  const summary = await getUsageSummary(resolved.range);
  return NextResponse.json(summary, { headers: { "Cache-Control": "no-store" } });
}
