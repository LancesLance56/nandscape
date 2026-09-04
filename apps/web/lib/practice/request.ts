import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import type { PracticeLanguage } from "@/types/practice";
import { isSupportedLanguage } from "./languages";
import { MAX_CODE_BYTES } from "./limits";
import { consume } from "./rate-limit";

/** Shared request handling for the two routes that reach the execution engine. */

export interface SubmissionBody {
  language: PracticeLanguage;
  code: string;
}

export type ParsedBody =
  | { ok: true; body: SubmissionBody }
  | { ok: false; response: NextResponse };

export async function parseSubmissionBody(request: Request): Promise<ParsedBody> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }) };
  }

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Request body must be an object" }, { status: 400 }),
    };
  }

  const { language, code } = raw as { language?: unknown; code?: unknown };

  if (!isSupportedLanguage(language)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unsupported language" }, { status: 422 }),
    };
  }

  if (typeof code !== "string") {
    return {
      ok: false,
      response: NextResponse.json({ error: "`code` must be a string" }, { status: 422 }),
    };
  }

  // Checked before anything is built or dispatched, so an oversized payload
  // costs a JSON parse rather than an engine slot.
  if (Buffer.byteLength(code, "utf8") > MAX_CODE_BYTES) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Solutions are limited to ${Math.floor(MAX_CODE_BYTES / 1024)} KB` },
        { status: 413 },
      ),
    };
  }

  return { ok: true, body: { language, code } };
}

/**
 * The identity a rate-limit bucket is keyed on.
 *
 * A signed-in user is keyed by id, which survives their address changing. An
 * anonymous visitor - who can Run but not Submit - is keyed by a hash of the
 * forwarded address, hashed rather than stored raw because this is an
 * in-memory structure whose whole contents would otherwise be a list of
 * visitor IP addresses for no benefit; the limiter only ever needs to know
 * whether two requests came from the same place.
 */
export function rateLimitKey(request: Request, userId: string | null, scope: string): string {
  if (userId) return `${scope}:user:${userId}`;

  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const address = forwarded.split(",")[0]?.trim() || "unknown";
  const digest = createHash("sha256").update(address).digest("hex").slice(0, 16);
  return `${scope}:anon:${digest}`;
}

export function enforceRateLimit(key: string, limit: number): NextResponse | null {
  const result = consume(key, limit);
  if (result.allowed) return null;

  return NextResponse.json(
    {
      error: "You are running code faster than the judge will accept. Give it a moment.",
      retryAfter: result.retryAfter,
    },
    { status: 429, headers: { "retry-after": String(result.retryAfter) } },
  );
}
