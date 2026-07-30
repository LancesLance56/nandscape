import Link from "next/link";
import type { PostSummary } from "@/types/blog";
import { ScrollReveal } from "@/components/scroll-reveal";

export function BlogShowcase({ posts }: { posts: PostSummary[] }) {
  const featured = posts.slice(0, 5);

  return (
    <section className="py-20">
      <ScrollReveal className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 font-mono text-sm font-medium text-copper-dark">
            <span className="h-1.75 w-1.75 rounded-full bg-copper" />
            Nandscape Blogs
          </div>
          <h2 className="font-display text-3xl font-semibold text-ink">Read Articles About CS</h2>
        </div>
        <Link
          href="/blog"
          className="hidden shrink-0 rounded-xl border border-border-strong/70 bg-surface-card/80 px-4 py-2 text-sm font-semibold text-ink backdrop-blur-sm transition-all hover:border-ink-soft hover:shadow-md active:scale-[0.97] sm:block"
        >
          Read the blog -{">"}
        </Link>
      </ScrollReveal>

      <ScrollReveal delay={80} className="overflow-hidden rounded-2xl border border-border/70 bg-surface-card/85 font-mono backdrop-blur-sm">
        {featured.length === 0 && (
          <p className="px-5 py-6 text-sm text-ink-soft">Nothing published yet,  check back soon.</p>
        )}

        {featured.map((post, i) => (
          <Link
            key={post.id}
            href={`/blog/${post.slug}`}
            className="group flex items-center gap-4 border-b border-border/60 px-5 py-3.5 text-sm transition-colors last:border-b-0 hover:bg-surface-2/70"
          >
            <span className="w-6 shrink-0 text-right text-[11px] text-border-strong">
              {String(i + 1).padStart(2, "0")}
            </span>

            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-signal-green transition-shadow group-hover:shadow-[0_0_0_4px_var(--signal-green-bg)]"
              aria-hidden="true"
            />

            <span className="min-w-0 flex-1 truncate font-sans text-[13px] font-semibold text-ink group-hover:text-copper-dark">
              {post.title}
            </span>

            {post.tags.length > 0 && (
              <span className="hidden shrink-0 text-[11px] text-slate sm:block">
                {post.tags.slice(0, 2).join(" · ")}
              </span>
            )}

            <span className="shrink-0 text-[11px] text-border-strong transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        ))}
      </ScrollReveal>

      <Link
        href="/blog"
        className="mt-4 flex items-center justify-center rounded-xl border border-border-strong/70 bg-surface-card/80 px-4 py-2.5 text-sm font-semibold text-ink backdrop-blur-sm transition-all hover:border-ink-soft hover:shadow-md active:scale-[0.97] sm:hidden"
      >
        Read the blog →
      </Link>
    </section>
  );
}
