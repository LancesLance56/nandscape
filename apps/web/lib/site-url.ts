/**
 * The real public URL people reach this app at - registered as the Google
 * OAuth redirect origin, and now also the base for the sitemap/robots.txt.
 * Deliberately an explicit env var rather than derived from the incoming
 * request: behind a reverse proxy the request's own origin/Host header
 * reflects the container's internal bind address, not the public one.
 */
export function siteUrl(): string {
  return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}
