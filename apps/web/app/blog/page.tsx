import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { PostCard } from "@/components/blog/post-card";
import { listPublishedPosts } from "@/lib/blog/posts";

export const metadata: Metadata = {
  title: "Blog,  Nandscape",
  description: "Notes on logic gates, puzzles, and building Nandscape.",
};

export const revalidate = 60;

export default async function BlogIndexPage() {
  const posts = await listPublishedPosts();

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-330 px-6 pb-24 pt-32 sm:px-10">
        <div className="mb-10 max-w-2xl">
          <div className="mb-3 flex items-center gap-2 font-mono text-sm font-medium text-copper-dark">
            <span className="h-1.75 w-1.75 rounded-full bg-copper" />
            Nandscape blog
          </div>
          <h1 className="font-display text-4xl font-semibold leading-tight text-ink">Short Blog Tutorials</h1>
        </div>

        {posts.length === 0 ? (
          <p className="text-sm text-ink-soft">Nothing published yet,  check back soon.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
