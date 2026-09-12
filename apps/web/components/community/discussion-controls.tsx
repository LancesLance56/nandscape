"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/content/rich-text-editor";
import { pluralize } from "@/lib/community/format";
import type { DiscussionKind } from "@/lib/community/discussions";
import { cn } from "@/lib/cn";

/**
 * The interactive parts of a discussion.
 *
 * The post bodies themselves are server-rendered Markdown (see
 * `discussion-thread.tsx`) and arrive here as children. That split is what
 * lets a post keep server-side syntax highlighting while its vote button and
 * spoiler toggle still run in the browser.
 */

export function VoteButton({
  postId,
  initialScore,
  initialVoted,
}: {
  postId: string;
  initialScore: number;
  initialVoted: boolean;
}) {
  const [voted, setVoted] = useState(initialVoted);
  const [score, setScore] = useState(initialScore);

  async function vote() {
    const next = !voted;
    setVoted(next);
    setScore((n) => n + (next ? 1 : -1));

    const response = await fetch(`/api/community/discussions/${postId}/vote`, {
      method: "POST",
    }).catch(() => null);

    if (!response?.ok) {
      // 401 included: a signed-out reader gets the click back rather than a
      // number that silently disagrees with the server.
      setVoted(!next);
      setScore((n) => n + (next ? -1 : 1));
      return;
    }

    const data = (await response.json().catch(() => null)) as
      | { voted?: boolean; score?: number }
      | null;
    if (typeof data?.voted === "boolean") setVoted(data.voted);
    if (typeof data?.score === "number") setScore(data.score);
  }

  return (
    <div className="flex w-9 shrink-0 flex-col items-center gap-1">
      <button
        type="button"
        onClick={vote}
        aria-pressed={voted}
        aria-label={voted ? "Remove upvote" : "Upvote"}
        className={cn(
          "flex h-6 w-7 items-center justify-center rounded-sm border transition-colors",
          voted
            ? "border-copper bg-copper-bg text-copper-dark"
            : "border-border bg-surface-card text-slate hover:border-copper hover:text-copper-dark",
        )}
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
      <span className="font-mono text-xs font-semibold tabular-nums text-ink-soft">{score}</span>
    </div>
  );
}

/**
 * A post whose answer is hidden until asked for.
 *
 * The rendered Markdown comes in as `children` already built on the server,
 * so revealing it is a state flip rather than a fetch - the reader is not made
 * to wait for something the page already has.
 */
export function SpoilerReveal({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState(false);

  if (shown) return <div className="mt-3.5">{children}</div>;

  return (
    <button
      type="button"
      onClick={() => setShown(true)}
      className="mt-3.5 block w-full rounded-md border border-dashed border-border-strong bg-surface-2 px-4 py-5 text-center text-[13px] font-medium text-ink-soft transition-colors hover:border-copper hover:text-copper-dark"
    >
      Solution hidden &mdash; reveal
    </button>
  );
}

export function ReplyBox({
  kind,
  slug,
  parentId,
  replyCount,
  canPost,
}: {
  kind: DiscussionKind;
  slug: string;
  parentId: string;
  replyCount: number;
  canPost: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="mt-3 flex items-center gap-4">
        {canPost && (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="text-xs font-medium text-ink-soft transition-colors hover:text-copper-dark"
          >
            {open ? "Cancel" : "Reply"}
          </button>
        )}
        <span className="text-xs text-slate">{pluralize(replyCount, "reply", "replies")}</span>
      </div>

      {open && (
        <div className="mt-3">
          <PostForm
            kind={kind}
            slug={slug}
            parentId={parentId}
            submitLabel="Reply"
            placeholder="Reply..."
            rows={4}
            onDone={() => {
              setOpen(false);
              router.refresh();
            }}
          />
        </div>
      )}
    </>
  );
}

/**
 * The composer, used for a new top-level post and for a reply.
 *
 * `spoiler` is offered only on a top-level post. A reply is a conversation
 * turn, and hiding one behind a click would make the thread unreadable.
 */
export function PostForm({
  kind,
  slug,
  parentId,
  submitLabel,
  placeholder,
  rows = 6,
  allowSpoiler = false,
  onDone,
}: {
  kind: DiscussionKind;
  slug: string;
  parentId?: string;
  submitLabel: string;
  placeholder?: string;
  rows?: number;
  allowSpoiler?: boolean;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [spoiler, setSpoiler] = useState("");
  const [showSpoiler, setShowSpoiler] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function submit() {
    const text = body.trim();
    if (!text) return;
    setError(null);

    const response = await fetch("/api/community/discussions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        slug,
        body: text,
        code: allowSpoiler && showSpoiler ? spoiler.trim() || null : null,
        parentId: parentId ?? null,
      }),
    }).catch(() => null);

    if (!response?.ok) {
      const data = (await response?.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Could not post that. Try again.");
      return;
    }

    setBody("");
    setSpoiler("");
    setShowSpoiler(false);
    onDone?.();
    startTransition(() => router.refresh());
  }

  return (
    <div>
      <RichTextEditor value={body} onChange={setBody} placeholder={placeholder} rows={rows} />

      {allowSpoiler && showSpoiler && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs text-slate">
            Hidden until a reader asks for it. Put the actual answer here.
          </p>
          <RichTextEditor
            value={spoiler}
            onChange={setSpoiler}
            placeholder="The solution, in whatever language you wrote it in."
            rows={5}
          />
        </div>
      )}

      {error && <p className="mt-2 text-xs text-signal-coral">{error}</p>}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {allowSpoiler ? (
          <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-soft">
            <input
              type="checkbox"
              checked={showSpoiler}
              onChange={(event) => setShowSpoiler(event.target.checked)}
              className="h-3.5 w-3.5 accent-copper"
            />
            Add a solution, hidden behind a click
          </label>
        ) : (
          <span />
        )}
        <Button size="sm" onClick={submit} disabled={pending || !body.trim()}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

/** Shown in place of the composer when the reader cannot post. */
export function ComposerNotice({ signedIn }: { signedIn: boolean }) {
  return (
    <p className="mb-7 rounded-xl border border-border bg-surface-card px-4 py-3 text-sm text-ink-soft">
      {signedIn ? (
        "Verify your email address to post here."
      ) : (
        <>
          <Link href="/login" className="font-medium text-copper-dark hover:underline">
            Sign in
          </Link>{" "}
          to join this discussion.
        </>
      )}
    </p>
  );
}
