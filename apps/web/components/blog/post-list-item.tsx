import Link from "next/link";
import type { PostSummary } from "@/types/blog";

export function PostListItem({ post }: { post: PostSummary }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group flex gap-5">
      {post.coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImage}
          alt=""
          className="aspect-[4/3] w-36 shrink-0 rounded-xl object-cover sm:w-44"
          loading="lazy"
        />
      ) : (
        <div className="aspect-[4/3] w-36 shrink-0 rounded-xl bg-surface-2/60 sm:w-44" />
      )}

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
        <h3 className="font-display text-lg font-bold leading-snug text-ink transition-colors group-hover:text-copper-dark sm:text-xl">
          {post.title}
        </h3>

        {post.excerpt && (
          <p className="line-clamp-2 text-sm leading-relaxed text-ink-soft sm:line-clamp-3">{post.excerpt}</p>
        )}

        <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-copper-dark">
          Read More
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 8h9M8 3.5 12.5 8 8 12.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </Link>
  );
}
