import Link from "next/link";
import type { PostSummary } from "@/types/blog";
import { ScrollReveal } from "@/components/scroll-reveal";
import { NodeGrid, NodeTile, NodeTitle } from "@/components/ui/rail";
import { DEFAULT_BLOCK_COLORS, hexToRgba } from "@/lib/editor/block-colors";

// Same hashed-palette pattern as puzzles-showcase's tagColor - keeps a
// post's accent consistent across renders without needing per-post color
// data in the DB.
function tagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) >>> 0;
  return DEFAULT_BLOCK_COLORS[hash % DEFAULT_BLOCK_COLORS.length];
}

export function BlogShowcase({ posts }: { posts: PostSummary[] }) {
  const featured = posts.slice(0, 4);

  return (
    <section className="py-20">
      <ScrollReveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-copper-dark">
            <span className="h-1.75 w-1.75 rounded-full bg-copper" />
            Nandscape Blogs
          </div>
          <h2 className="font-display text-3xl font-semibold text-ink">Read Articles About CS</h2>
        </div>
        <Link
          href="/blog"
          className="rounded-xl border border-border-strong/70 bg-surface-card/80 px-4 py-2 text-sm font-semibold text-ink backdrop-blur-sm transition-all hover:border-ink-soft hover:shadow-md active:scale-[0.97]"
        >
          Read the blog →
        </Link>
      </ScrollReveal>

      {featured.length === 0 ? (
        <p className="text-sm text-ink-soft">Nothing published yet, check back soon.</p>
      ) : (
        <NodeGrid columns={2}>
          {featured.map((post, i) => {
            const color = tagColor(post.tags[0] ?? post.slug);

            return (
              <ScrollReveal key={post.id} delay={i * 60}>
                <NodeTile href={`/blog/${post.slug}`} accent={color}>
                  <div className="flex items-center justify-between">
                    <span
                      style={{ backgroundColor: hexToRgba(color, 0.12), color }}
                      className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                    >
                      {post.tags[0] ?? "Article"}
                    </span>
                    {post.publishedAt && (
                      <span className="text-[11px] text-slate">
                        {new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>

                  <NodeTitle>{post.title}</NodeTitle>
                  {post.excerpt && (
                    <p className="line-clamp-2 text-xs leading-relaxed text-ink-soft">{post.excerpt}</p>
                  )}

                  <span
                    style={{ color }}
                    className="mt-auto inline-flex items-center gap-1 pt-1 text-xs font-semibold opacity-80 transition-opacity group-hover:opacity-100"
                  >
                    Read article →
                  </span>
                </NodeTile>
              </ScrollReveal>
            );
          })}
        </NodeGrid>
      )}
    </section>
  );
}
