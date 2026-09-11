import Link from "next/link";
import { AvatarDisc } from "@/components/community/avatar-disc";
import { MarkdownProse } from "@/components/content/markdown-prose";
import {
  ComposerNotice,
  PostForm,
  ReplyBox,
  SpoilerReveal,
  VoteButton,
} from "@/components/community/discussion-controls";
import { longAgo } from "@/lib/community/format";
import type { DiscussionKind, DiscussionPost } from "@/lib/community/discussions";

/**
 * A discussion: the composer, the posts, their replies.
 *
 * A Server Component on purpose. Post bodies are Markdown and are highlighted
 * through the Shiki singleton while the tree renders, which only works on the
 * server; the interactive parts are the small client components imported
 * above, and the rendered body is handed to the spoiler toggle as children.
 */
export function DiscussionThread({
  kind,
  slug,
  posts,
  signedIn,
  canPost,
}: {
  kind: DiscussionKind;
  slug: string;
  posts: DiscussionPost[];
  signedIn: boolean;
  /** False for a signed-in reader who has not verified their email yet. */
  canPost: boolean;
}) {
  return (
    <div>
      {canPost ? (
        <div className="mb-7">
          <PostForm
            kind={kind}
            slug={slug}
            submitLabel="Post"
            placeholder="Share an approach, or ask what you are missing..."
            allowSpoiler
          />
        </div>
      ) : (
        <ComposerNotice signedIn={signedIn} />
      )}

      {posts.length === 0 ? (
        <p className="border-t border-border py-10 text-center text-sm text-slate">
          Nothing here yet. The first post on a thread is usually the most useful one.
        </p>
      ) : (
        <div className="flex flex-col">
          {posts.map((post) => (
            <article key={post.id} className="border-t border-border py-5">
              <div className="flex items-start gap-3.5">
                <VoteButton
                  postId={post.id}
                  initialScore={post.score}
                  initialVoted={post.viewerVoted}
                />

                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2.5">
                    <Link
                      href={`/u/${post.author.username}`}
                      className="flex items-center gap-2 text-ink hover:text-copper-dark"
                    >
                      <AvatarDisc username={post.author.username} size="sm" />
                      <span className="text-[13px] font-semibold">{post.author.username}</span>
                    </Link>
                    <span className="font-mono text-[11px] text-slate">
                      {longAgo(post.createdAt)}
                    </span>
                  </div>

                  <MarkdownProse source={post.body} softBreaks />

                  {post.code && (
                    <SpoilerReveal>
                      <MarkdownProse source={post.code} softBreaks />
                    </SpoilerReveal>
                  )}

                  <ReplyBox
                    kind={kind}
                    slug={slug}
                    parentId={post.id}
                    replyCount={post.replies.length}
                    canPost={canPost}
                  />

                  {post.replies.map((reply) => (
                    <div key={reply.id} className="mt-3.5 border-l border-border pl-4">
                      <div className="mb-1.5 flex items-center gap-2.5">
                        <AvatarDisc username={reply.author.username} size="xs" muted />
                        <Link
                          href={`/u/${reply.author.username}`}
                          className="text-[13px] font-semibold text-ink hover:text-copper-dark"
                        >
                          {reply.author.username}
                        </Link>
                        <span className="font-mono text-[11px] text-slate">
                          {longAgo(reply.createdAt)}
                        </span>
                      </div>
                      <MarkdownProse source={reply.body} softBreaks className="text-[13px]" />
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
