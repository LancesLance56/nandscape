import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { hasValidSeedSecret, resolveSeedOwnerId } from "@/lib/auth/seed-secret";
import { query } from "@/lib/db/client";
import { createPost, createThread } from "@/lib/community/discussions";
import { MAX_BODY_LENGTH, MAX_TITLE_LENGTH, MIN_TITLE_LENGTH } from "@/lib/community/limits";

/**
 * Open a standalone discussion thread.
 *
 * Separate from `/api/community/discussions`, which adds a post to a
 * discussion that already has an address. This one *allocates* the address,
 * which is a different operation with a different input (a title rather than a
 * target) and a different result (a slug to redirect to).
 *
 * Also the seeding entry point. Like every other content route, it accepts the
 * seed secret and attributes the write to a named author, so `seed/discussions`
 * can be re-applied without anyone logging in.
 */
export async function POST(request: NextRequest) {
  let body: {
    title?: unknown;
    body?: unknown;
    author?: unknown;
    createdAt?: unknown;
    replies?: unknown;
    /** Seed files only: pins the slug so a re-run replaces rather than duplicates. */
    slug?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const seeded = hasValidSeedSecret(request);
  const user = seeded ? null : await getCurrentUser().catch(() => null);

  if (!seeded) {
    if (!user) return NextResponse.json({ error: "Sign in to post" }, { status: 401 });
    if (!user.emailVerified) {
      return NextResponse.json({ error: "Verify your email address to post" }, { status: 403 });
    }
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const text = typeof body.body === "string" ? body.body.trim() : "";

  if (title.length < MIN_TITLE_LENGTH || title.length > MAX_TITLE_LENGTH) {
    return NextResponse.json(
      { error: `Title must be between ${MIN_TITLE_LENGTH} and ${MAX_TITLE_LENGTH} characters` },
      { status: 422 },
    );
  }
  if (!text) return NextResponse.json({ error: "A discussion needs a body" }, { status: 422 });
  if (text.length > MAX_BODY_LENGTH) {
    return NextResponse.json({ error: "Body is too long" }, { status: 422 });
  }

  // A seeded thread names its author by handle; a real one is written by
  // whoever is signed in and cannot claim to be anybody else.
  const authorId = seeded
    ? await userIdForHandle(request, body.author)
    : user!.id;
  if (!authorId) {
    return NextResponse.json({ error: "Unknown author" }, { status: 422 });
  }

  const createdAt = typeof body.createdAt === "string" ? new Date(body.createdAt) : undefined;
  const when = createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt : undefined;

  let slug: string;

  if (seeded && typeof body.slug === "string" && body.slug.trim()) {
    // A seed file pins its own slug, which is what makes re-seeding idempotent:
    // the random slug a person gets would produce a second copy of the same
    // thread on every run. Replacing rather than skipping means an edited file
    // actually takes effect.
    slug = body.slug.trim();
    await query(
      `DELETE FROM discussion_posts WHERE "targetKind" = 'GENERAL' AND target_slug = $1`,
      [slug],
    );
    await createPost({ kind: "GENERAL", slug, authorId, title, body: text, createdAt: when });
  } else {
    slug = await createThread({ authorId, title, body: text, createdAt: when });
  }

  // Seeded threads may carry their replies inline, so one file is one whole
  // conversation rather than a thread plus a pile of loose follow-ups that
  // have to be ordered by hand.
  if (seeded && Array.isArray(body.replies)) {
    const [opening] = await query<{ id: string }>(
      `SELECT id FROM discussion_posts
        WHERE "targetKind" = 'GENERAL' AND target_slug = $1 AND parent_id IS NULL`,
      [slug],
    );

    for (const entry of body.replies) {
      if (!entry || typeof entry !== "object") continue;
      const reply = entry as { author?: unknown; body?: unknown; createdAt?: unknown };
      const replyAuthor = await userIdForHandle(request, reply.author);
      if (!replyAuthor || typeof reply.body !== "string" || !reply.body.trim()) continue;

      const at = typeof reply.createdAt === "string" ? new Date(reply.createdAt) : undefined;
      await createPost({
        kind: "GENERAL",
        slug,
        authorId: replyAuthor,
        body: reply.body,
        parentId: opening?.id ?? null,
        createdAt: at && !Number.isNaN(at.getTime()) ? at : undefined,
      });
    }
  }

  return NextResponse.json({ slug }, { status: 201 });
}

/**
 * A seed file names people by handle, never by id: ids are generated at insert
 * time and would change on every reset, which would make the files unusable a
 * second time.
 */
async function userIdForHandle(request: NextRequest, handle: unknown): Promise<string | null> {
  if (typeof handle === "string" && handle.trim()) {
    const rows = await query<{ id: string }>(
      `SELECT id FROM "User" WHERE lower(username) = lower($1)`,
      [handle.trim()],
    );
    if (rows[0]) return rows[0].id;
    return null;
  }
  // No handle given: fall back to the admin the other seed routes attribute to.
  return resolveSeedOwnerId(request);
}
