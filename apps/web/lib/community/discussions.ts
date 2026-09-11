import { query } from "@/lib/db/client";
import { MAX_BODY_LENGTH, MAX_CODE_LENGTH, MAX_TITLE_LENGTH } from "./limits";

/**
 * Discussions that hang off a specific piece of content.
 *
 * There is no free-standing thread and no global feed: every post names a
 * `kind` + `slug`, and the page that renders it is the page that content
 * already has. That is the whole reason this is cheap to moderate - a post
 * with nowhere to live cannot be written.
 *
 * A "thread" here is one top-level post plus its direct replies. Replies are
 * one level deep by presentation, not by schema (see DiscussionPost's note).
 */

export const DISCUSSION_KINDS = [
  "BLOG",
  "TUTORIAL",
  "PRACTICE",
  "PROJECT",
  "PUZZLE",
  "GENERAL",
] as const;
export type DiscussionKind = (typeof DISCUSSION_KINDS)[number];

export function isDiscussionKind(value: unknown): value is DiscussionKind {
  return typeof value === "string" && (DISCUSSION_KINDS as readonly string[]).includes(value);
}

/** URL segment -> enum value, so `/discuss/practice/two-s-complement` reads right. */
export function kindFromSlug(segment: string): DiscussionKind | null {
  const upper = segment.toUpperCase();
  return isDiscussionKind(upper) ? upper : null;
}

// Re-exported so server code has one import for the whole module; the values
// live in `limits.ts` because client code needs them too and must not reach
// through a module that opens the database pool.
export { MAX_BODY_LENGTH, MAX_CODE_LENGTH, MAX_TITLE_LENGTH, MIN_TITLE_LENGTH } from "./limits";

export interface DiscussionAuthor {
  username: string;
}

export interface DiscussionReply {
  id: string;
  author: DiscussionAuthor;
  body: string;
  createdAt: string;
}

export interface DiscussionPost {
  id: string;
  author: DiscussionAuthor;
  body: string;
  /** Null when the post carries no code. Non-null means it renders masked. */
  code: string | null;
  score: number;
  /** Whether the signed-in viewer has already upvoted this post. */
  viewerVoted: boolean;
  createdAt: string;
  replies: DiscussionReply[];
}

export type DiscussionSort = "hot" | "new" | "top";

export function isDiscussionSort(value: unknown): value is DiscussionSort {
  return value === "hot" || value === "new" || value === "top";
}

type PostRow = {
  id: string;
  body: string;
  code: string | null;
  created_at: Date;
  username: string;
  score: number;
  viewer_voted: boolean;
  parent_id: string | null;
}

/**
 * Hot is score decayed by age, the standard cheap ranking: a post needs either
 * to be recent or to be good, and an old post with a big score eventually
 * yields to a new one that people are actually reading. The `+2` stops a
 * brand-new zero-score post dividing by something near zero and pinning
 * itself to the top.
 */
const ORDER_BY: Record<DiscussionSort, string> = {
  hot: `(score / power(EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600 + 2, 1.3)) DESC, p.created_at DESC`,
  new: `p.created_at DESC`,
  top: `score DESC, p.created_at DESC`,
};

/**
 * Every post for one target in a single query, parents and replies together.
 *
 * One round trip rather than one per thread: the reply count on a healthy
 * problem page is small, and fetching children separately would be N+1 for no
 * gain. The ordering clause only governs top-level rows; replies are pulled
 * into their parent in TS and always read oldest-first, because a reply chain
 * is a conversation and reversing it makes it nonsense.
 */
export async function listDiscussion(
  kind: DiscussionKind,
  slug: string,
  viewerId: string | null,
  sort: DiscussionSort = "hot",
): Promise<DiscussionPost[]> {
  const rows = await query<PostRow>(
    `WITH scored AS (
       SELECT p.id, p.body, p.code, p.created_at, p.parent_id,
              u.username,
              (SELECT COUNT(*) FROM discussion_votes v WHERE v.post_id = p.id)::int AS score,
              EXISTS (SELECT 1 FROM discussion_votes v
                       WHERE v.post_id = p.id AND v.voter_id = $3) AS viewer_voted
         FROM discussion_posts p
         JOIN "User" u ON u.id = p.author_id
        WHERE p."targetKind" = $1::"ContentKind" AND p.target_slug = $2
     )
     SELECT * FROM scored p
      ORDER BY (p.parent_id IS NOT NULL), ${ORDER_BY[sort]}`,
    [kind, slug, viewerId],
  );

  const parents: DiscussionPost[] = [];
  const byId = new Map<string, DiscussionPost>();

  for (const row of rows) {
    if (row.parent_id) continue;
    const post: DiscussionPost = {
      id: row.id,
      author: { username: row.username },
      body: row.body,
      code: row.code,
      score: row.score,
      viewerVoted: row.viewer_voted,
      createdAt: row.created_at.toISOString(),
      replies: [],
    };
    parents.push(post);
    byId.set(row.id, post);
  }

  const replies = rows.filter((r) => r.parent_id);
  replies.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
  for (const row of replies) {
    // A reply whose parent lives under a different target is not reachable
    // from here; skipping beats inventing a home for it.
    const parent = byId.get(row.parent_id!);
    if (!parent) continue;
    parent.replies.push({
      id: row.id,
      author: { username: row.username },
      body: row.body,
      createdAt: row.created_at.toISOString(),
    });
  }

  return parents;
}

export async function createPost(input: {
  kind: DiscussionKind;
  slug: string;
  authorId: string;
  body: string;
  title?: string | null;
  code?: string | null;
  parentId?: string | null;
  createdAt?: Date;
}): Promise<string> {
  const rows = await query<{ id: string }>(
    `INSERT INTO discussion_posts
       (id, "targetKind", target_slug, author_id, title, body, code, parent_id, created_at, updated_at)
     VALUES (gen_random_uuid()::text, $1::"ContentKind", $2, $3, $4, $5, $6, $7, COALESCE($8, now()), COALESCE($8, now()))
     RETURNING id`,
    [
      input.kind,
      input.slug,
      input.authorId,
      // Only an opening post carries a title; a reply never does, whatever
      // the caller passes.
      input.parentId ? null : (input.title?.trim().slice(0, MAX_TITLE_LENGTH) ?? null),
      input.body.trim().slice(0, MAX_BODY_LENGTH),
      input.code?.trim() ? input.code.trim().slice(0, MAX_CODE_LENGTH) : null,
      input.parentId ?? null,
      input.createdAt ?? null,
    ],
  );
  return rows[0].id;
}

/**
 * A slug for a standalone thread.
 *
 * Title-derived, with a short random tail. Titles repeat - two people will
 * both post "how does carry-lookahead actually work" - and a bare slug
 * collision would either fail the insert or silently merge two threads into
 * one page, which is much worse than an ugly URL.
 */
export function threadSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const tail = Math.random().toString(36).slice(2, 8);
  return `${base || "discussion"}-${tail}`;
}

/**
 * Open a standalone thread. Returns its slug, which is its URL.
 *
 * A retry loop rather than one attempt: `threadSlug` is random enough that a
 * collision is vanishingly unlikely, and cheap enough to just try again if it
 * happens, which beats surfacing a failure the author cannot act on.
 */
export async function createThread(input: {
  authorId: string;
  title: string;
  body: string;
  createdAt?: Date;
}): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = threadSlug(input.title);
    const taken = await query(
      `SELECT 1 FROM discussion_posts WHERE "targetKind" = 'GENERAL' AND target_slug = $1 LIMIT 1`,
      [slug],
    );
    if (taken.length > 0) continue;

    await createPost({
      kind: "GENERAL",
      slug,
      authorId: input.authorId,
      title: input.title,
      body: input.body,
      createdAt: input.createdAt,
    });
    return slug;
  }
  throw new Error("Could not allocate a slug for the thread");
}

/** Returns the resting state, so the caller never has to guess which way it went. */
export async function toggleVote(postId: string, voterId: string): Promise<{ voted: boolean; score: number }> {
  const existing = await query(
    `DELETE FROM discussion_votes WHERE post_id = $1 AND voter_id = $2 RETURNING post_id`,
    [postId, voterId],
  );

  if (existing.length === 0) {
    // ON CONFLICT covers the double-submit race: two in-flight votes from one
    // person settle as one row rather than as a primary-key violation.
    await query(
      `INSERT INTO discussion_votes (post_id, voter_id) VALUES ($1, $2)
       ON CONFLICT (post_id, voter_id) DO NOTHING`,
      [postId, voterId],
    );
  }

  const rows = await query<{ score: number }>(
    `SELECT COUNT(*)::int AS score FROM discussion_votes WHERE post_id = $1`,
    [postId],
  );
  return { voted: existing.length === 0, score: rows[0]?.score ?? 0 };
}

/* ------------------------------------------------------- target resolution */

export interface DiscussionTarget {
  kind: DiscussionKind;
  slug: string;
  title: string;
  /** Where the content itself lives. */
  href: string;
  /** "Coding practice", "Tutorial", ... - the badge beside a thread. */
  label: string;
  /** Path shown above the title on the discussion page. */
  breadcrumb: string;
}

const KIND_LABEL: Record<DiscussionKind, string> = {
  PRACTICE: "problem",
  TUTORIAL: "lesson",
  PROJECT: "circuit",
  PUZZLE: "puzzle",
  BLOG: "article",
  GENERAL: "discussion",
};

export function kindLabel(kind: DiscussionKind): string {
  return KIND_LABEL[kind];
}

/**
 * Resolve a kind + slug to the thing it is about.
 *
 * One query per kind rather than a five-way UNION: the tables share neither
 * their title column (`projects` calls it `name`) nor their URL shape, so a
 * union would need per-branch casts and still leave the href to a switch.
 */
export async function resolveTarget(
  kind: DiscussionKind,
  slug: string,
): Promise<DiscussionTarget | null> {
  const base = { kind, slug, label: KIND_LABEL[kind] };

  if (kind === "GENERAL") {
    // A standalone thread is its own target. Its title lives on the opening
    // post, so "does this exist" and "what is it called" are one lookup.
    const rows = await query<{ title: string | null }>(
      `SELECT title FROM discussion_posts
        WHERE "targetKind" = 'GENERAL' AND target_slug = $1 AND parent_id IS NULL
        ORDER BY created_at ASC LIMIT 1`,
      [slug],
    );
    if (!rows[0]) return null;
    return {
      ...base,
      title: rows[0].title ?? slug.replace(/-/g, " "),
      // There is no content page behind it, so the way "back" is the index.
      href: "/community/discussions",
      breadcrumb: "Discussion",
    };
  }

  if (kind === "PRACTICE") {
    const rows = await query<{ title: string }>(
      `SELECT title FROM "CodingProblem" WHERE slug = $1`,
      [slug],
    );
    if (!rows[0]) return null;
    return { ...base, title: rows[0].title, href: `/practices/${slug}`, breadcrumb: "Coding practice" };
  }

  if (kind === "PUZZLE") {
    const rows = await query<{ title: string }>(`SELECT title FROM "Puzzle" WHERE slug = $1`, [slug]);
    if (!rows[0]) return null;
    return { ...base, title: rows[0].title, href: `/puzzles/${slug}`, breadcrumb: "Logic puzzles" };
  }

  if (kind === "PROJECT") {
    const rows = await query<{ name: string; owner: string }>(
      `SELECT p.name, u.username AS owner FROM projects p
         JOIN "User" u ON u.id = p.owner_id
        WHERE p.slug = $1 AND p.visibility = 'PUBLIC'`,
      [slug],
    );
    if (!rows[0]) return null;
    return {
      ...base,
      title: rows[0].name,
      href: `/projects/${slug}`,
      breadcrumb: `Circuit by @${rows[0].owner}`,
    };
  }

  if (kind === "TUTORIAL") {
    const rows = await query<{ title: string; track_slug: string | null; track_title: string | null }>(
      `SELECT p.title, t.slug AS track_slug, t.title AS track_title
         FROM tutorial_pages p
         LEFT JOIN tutorial_sections s ON s.id = p.section_id
         LEFT JOIN tutorial_tracks t ON t.id = s.track_id
        WHERE p.slug = $1`,
      [slug],
    );
    if (!rows[0]) return null;
    const { title, track_slug, track_title } = rows[0];
    return {
      ...base,
      title,
      // An untracked lesson still renders (trackId is nullable by design), so
      // the flat URL is the honest fallback rather than a broken nested one.
      href: track_slug ? `/tutorials/${track_slug}/${slug}` : `/tutorials/${slug}`,
      breadcrumb: track_title ? `Tutorial / ${track_title}` : "Tutorial",
    };
  }

  const rows = await query<{ title: string }>(`SELECT title FROM blog_posts WHERE slug = $1`, [slug]);
  if (!rows[0]) return null;
  return { ...base, title: rows[0].title, href: `/blog/${slug}`, breadcrumb: "Blog" };
}

/* ------------------------------------------------------------- hub listing */

export interface ThreadSummary {
  /** The thread's own title, or its opening line when it has none. */
  title: string;
  kind: DiscussionKind;
  kindLabel: string;
  /** The content it hangs off. Empty for a standalone thread. */
  scope: string;
  href: string;
  count: number;
  author: string;
  lastActivity: string;
}

/**
 * The busiest recent discussions.
 *
 * Grouped by target rather than by post: this lists conversations, and four
 * posts on one problem is one row, not four. The heading is the *opening*
 * post's title or first line, because that is what the thread is about even
 * once it has moved on.
 */
export async function listActiveThreads(limit = 6): Promise<ThreadSummary[]> {
  const rows = await query<{
    kind: DiscussionKind;
    target_slug: string;
    count: number;
    last_activity: Date;
    title: string;
    author: string;
  }>(
    `WITH opening AS (
       SELECT DISTINCT ON (b."targetKind", b.target_slug)
              b."targetKind" AS kind, b.target_slug,
              COALESCE(b.title, b.body) AS title, u.username AS author
         FROM discussion_posts b
         JOIN "User" u ON u.id = b.author_id
        WHERE b.parent_id IS NULL
        ORDER BY b."targetKind", b.target_slug, b.created_at ASC
     )
     SELECT p."targetKind" AS kind, p.target_slug, COUNT(*)::int AS count,
            MAX(p.created_at) AS last_activity, o.title, o.author
       FROM discussion_posts p
       JOIN opening o ON o.kind = p."targetKind" AND o.target_slug = p.target_slug
      GROUP BY p."targetKind", p.target_slug, o.title, o.author
      ORDER BY last_activity DESC
      LIMIT $1`,
    [limit],
  );

  const resolved = await Promise.all(
    rows.map(async (row) => {
      const target = await resolveTarget(row.kind, row.target_slug);
      if (!target) return null;
      return {
        title: firstLine(row.title),
        kind: row.kind,
        kindLabel: KIND_LABEL[row.kind],
        // A standalone thread is its own subject, so repeating the title as a
        // scope would print it twice in the same row.
        scope: row.kind === "GENERAL" ? "" : target.title,
        href: `/discuss/${row.kind.toLowerCase()}/${row.target_slug}`,
        count: row.count,
        author: row.author,
        lastActivity: row.last_activity.toISOString(),
      };
    }),
  );

  // A target whose content was deleted leaves posts behind. Dropping the row
  // beats rendering a link to a 404.
  return resolved.filter((t): t is ThreadSummary => t !== null);
}

/** How many posts hang off one piece of content, for a "Discuss (12)" link. */
export async function countDiscussion(kind: DiscussionKind, slug: string): Promise<number> {
  const rows = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM discussion_posts
      WHERE "targetKind" = $1::"ContentKind" AND target_slug = $2`,
    [kind, slug],
  );
  return rows[0]?.count ?? 0;
}

/** A thread's display title is its opening line, trimmed to something a rail can hold. */
function firstLine(body: string): string {
  const line = body.split("\n").find((l) => l.trim().length > 0)?.trim() ?? body.trim();
  return line.length > 90 ? `${line.slice(0, 87)}...` : line;
}
