import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { SiteGradient } from "@/components/site-gradient";
import { PostListItem } from "@/components/blog/post-list-item";
import { BlogSidebar } from "@/components/blog/blog-sidebar";
import { listPublishedPosts } from "@/lib/blog/posts";
import type { PostSummary } from "@/types/blog";

export const metadata: Metadata = {
  title: "Blog,  Nandscape",
  description: "Notes on logic gates, puzzles, and building Nandscape.",
};

export const revalidate = 60;

export default async function BlogIndexPage() {
  // Defensive: this page has no dynamic segment, so Next tries to statically
  // render it at build time, when the DB may not be reachable yet (e.g.
  // building the Docker image before postgres is networked in).
  let posts: PostSummary[] = [];
  try {
    posts = await listPublishedPosts();
  } catch {
    posts = [];
  }

  return (
    <>
      <SiteGradient />
      <Navbar />
      <main className="relative pb-24">
        <section className="px-6 pb-30 pt-52 sm:px-10">
          <div className="relative z-10 mx-auto max-w-2xl text-center">
            <div className="mb-5 flex items-center justify-center gap-2 font-mono text-sm font-medium text-copper-dark">
              <span className="h-1.75 w-1.75 rounded-full bg-copper" />
              Nandscape blog
            </div>
            <h1 className="font-display text-5xl font-semibold leading-tight text-ink sm:text-6xl">
              Short Blog Tutorials
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-ink-soft">
              Notes on logic gates, puzzles, and building Nandscape.
            </p>
          </div>
        </section>

        <div className="relative z-10 mx-auto max-w-330 px-6 sm:px-10">
          {posts.length === 0 ? (
            <p className="text-sm text-ink-soft">Nothing published yet,  check back soon.</p>
          ) : (
            <div className="grid grid-cols-1 gap-x-16 gap-y-12 lg:grid-cols-[1fr_320px]">
              <div className="flex flex-col gap-10">
                {posts.map((post) => (
                  <PostListItem key={post.id} post={post} />
                ))}
              </div>
              <BlogSidebar posts={posts} />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
