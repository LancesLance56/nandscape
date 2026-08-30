import { NextRequest, NextResponse } from "next/server";
import { siteUrl } from "@/lib/site-url";
import {
  buildEmbedSnippet,
  embedTargetForPath,
  parseEmbedOptions,
  DEFAULT_EMBED_OPTIONS,
} from "@/lib/embeds/embeddable";
import { resolveEmbed } from "@/lib/embeds/resolve";

/**
 * oEmbed provider endpoint.
 *
 * This is what lets a Nandscape link pasted into WordPress, Notion, Ghost,
 * Discourse or Confluence become the running tool. Those consumers do not read
 * our HTML: they take the URL a person pasted, find the provider's endpoint
 * from the discovery <link> tag that tool and project pages emit, call it, and
 * paste back whatever `html` it returns. For any platform that will not accept
 * a hand-written iframe, this endpoint is the only way in.
 *
 * Spec: https://oembed.com. The response is the `rich` type, which is the one
 * that carries arbitrary HTML.
 */

const MAX_WIDTH = 1200;
const MIN_WIDTH = 240;
const DEFAULT_WIDTH = 640;

function clampWidth(raw: string | null): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_WIDTH;
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(parsed)));
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const url = params.get("url");
  const format = params.get("format") ?? "json";

  if (!url) {
    return NextResponse.json({ error: "`url` is required" }, { status: 400 });
  }

  // The spec allows a provider to support JSON only, and requires a 501 for
  // formats it does not implement. Nothing here needs XML.
  if (format !== "json") {
    return NextResponse.json({ error: "Only format=json is supported" }, { status: 501 });
  }

  let pathname: string;
  let requestOrigin: string;
  try {
    const parsed = new URL(url);
    pathname = parsed.pathname;
    requestOrigin = parsed.origin;
  } catch {
    return NextResponse.json({ error: "`url` is not a valid URL" }, { status: 400 });
  }

  // Only ever describe our own pages. Without this check the endpoint would
  // mint an iframe for any URL handed to it, which is an open redirect.
  const origin = siteUrl();
  if (!sameHost(requestOrigin, origin)) {
    return NextResponse.json({ error: "Not an embeddable Nandscape URL" }, { status: 404 });
  }

  const target = embedTargetForPath(pathname);
  if (!target) {
    return NextResponse.json({ error: "Not an embeddable Nandscape URL" }, { status: 404 });
  }

  const resolved = await resolveEmbed(target);
  if (!resolved) {
    return NextResponse.json({ error: "Not an embeddable Nandscape URL" }, { status: 404 });
  }

  const width = clampWidth(params.get("maxwidth"));
  const maxHeight = Number(params.get("maxheight"));
  const height = Number.isFinite(maxHeight) && maxHeight > 0 ? Math.min(resolved.height, maxHeight) : resolved.height;

  const options = parseEmbedOptions(Object.fromEntries(params));
  const html = buildEmbedSnippet({
    origin,
    target,
    title: resolved.title,
    width,
    height,
    options: { ...DEFAULT_EMBED_OPTIONS, ...options },
  });

  return NextResponse.json(
    {
      version: "1.0",
      type: "rich",
      provider_name: "Nandscape",
      provider_url: origin,
      title: resolved.title,
      html,
      width,
      height,
      credit_url: `${origin}${resolved.sourceHref}`,
    },
    {
      headers: {
        // Consumers fetch this from their own servers; CORS lets a browser-
        // side editor preview do it too.
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300, s-maxage=3600",
      },
    },
  );
}

/** Host comparison, ignoring scheme: the site is reachable over both during
 *  local development, and a consumer may well send us the http:// form. */
function sameHost(a: string, b: string): boolean {
  try {
    return new URL(a).host === new URL(b).host;
  } catch {
    return false;
  }
}
