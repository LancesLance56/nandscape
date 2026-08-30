import Link from "next/link";
import type { PostSummary } from "@/types/blog";
import { ScrollReveal } from "@/components/scroll-reveal";
import { DEFAULT_BLOCK_COLORS } from "@/lib/editor/block-colors";

/**
 * The blog, as a contents page rather than a card grid.
 *
 * By the time a reader reaches this section they have already been shown the
 * tutorial folders, the tools bento and the embed panel, so a fourth boxed
 * grid reads as more of the same and the posts stop registering. Numbered
 * rules-and-type rows look like the contents page of a journal, which suits
 * the paper theme the rest of the page is built on and lets the titles carry
 * the section on their own.
 *
 * It also does not depend on cover art. Posts here may or may not have a
 * coverImage, and a grid of tiles where half the pictures are placeholder
 * blocks looks worse than no pictures at all.
 */

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
        // The rule above the first row closes the section header; each row
        // then draws its own rule underneath, so the list is bounded top and
        // bottom however many posts there are.
        <div className="border-t border-border">
          {featured.map((post, i) => {
            const color = tagColor(post.tags[0] ?? post.slug);

            return (
              <ScrollReveal key={post.id} delay={i * 60}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group flex items-start gap-4 border-b border-border py-5 transition-colors hover:bg-surface-card/60 sm:gap-6"
                >
                  <span
                    style={{ color }}
                    className="w-6 shrink-0 pt-0.5 font-mono text-xs tabular-nums opacity-45 transition-opacity group-hover:opacity-100"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="truncate font-display text-lg font-semibold text-ink transition-colors group-hover:text-copper-dark sm:text-xl">
                        {post.title}
                      </h3>
                      <span
                        style={{ color }}
                        className="hidden shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] sm:block"
                      >
                        {post.tags[0] ?? "Article"}
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-baseline justify-between gap-4">
                      {post.excerpt ? (
                        <p className="truncate text-xs leading-relaxed text-ink-soft sm:text-sm">{post.excerpt}</p>
                      ) : (
                        <span />
                      )}

                      <span className="flex shrink-0 items-center gap-1.5 text-[11px] tabular-nums text-slate">
                        {post.publishedAt &&
                          new Date(post.publishedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        <span className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none">
                          →
                        </span>
                      </span>
                    </div>
                  </div>
                </Link>
              </ScrollReveal>
            );
          })}
        </div>
      )}
    </section>
  );
}
