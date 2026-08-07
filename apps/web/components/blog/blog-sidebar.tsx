import Link from "next/link";
import type { PostSummary } from "@/types/blog";

// Cycled per tag, not per post, so the same tag always reads the same color.
const TAG_STYLES = [
  "bg-copper-bg text-copper-dark",
  "bg-signal-green-bg text-signal-green-strong",
  "bg-signal-coral-bg text-signal-coral-strong",
];

export function BlogSidebar({ posts }: { posts: PostSummary[] }) {
  const tags = Array.from(new Set(posts.flatMap((post) => post.tags)));
  const recent = posts.slice(0, 4);

  return (
    <aside className="flex flex-col gap-8">
      {tags.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-sm font-bold text-ink">Categories</h2>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, i) => (
              <span
                key={tag}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${TAG_STYLES[i % TAG_STYLES.length]}`}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-sm font-bold text-ink">Recent Posts</h2>
          <div className="flex flex-col gap-3">
            {recent.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="group flex items-center gap-3">
                {post.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.coverImage}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-12 w-12 shrink-0 rounded-lg bg-surface-2/60" />
                )}
                <span className="line-clamp-2 text-sm font-medium leading-snug text-ink transition-colors group-hover:text-copper-dark">
                  {post.title}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
