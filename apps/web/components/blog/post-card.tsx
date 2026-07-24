import Link from "next/link";
import type { PostSummary } from "@/types/blog";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function PostCard({ post }: { post: PostSummary }) {
  const date = formatDate(post.publishedAt);

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"
    >
      {post.coverImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.coverImage} alt="" className="h-60 w-full object-cover" loading="lazy" />
      )}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-wider text-slate">
          {date && <span>{date}</span>}
          {post.authorName && (
            <>
              <span className="text-border-strong">·</span>
              <span>{post.authorName}</span>
            </>
          )}
        </div>

        <h2 className="font-display text-lg font-bold leading-snug text-ink group-hover:text-copper-dark">
          {post.title}
        </h2>

        {post.excerpt && <p className="line-clamp-3 text-sm leading-relaxed text-ink-soft">{post.excerpt}</p>}

        {post.tags.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[10px] font-semibold text-ink-soft"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
