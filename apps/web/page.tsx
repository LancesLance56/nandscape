import {Hero} from "@/components/hero";
import {Navbar} from "@/components/navbar";
import {FeatureStrip} from "@/components/marketing/feature-strip";
import {PuzzlesShowcase} from "@/components/marketing/puzzles-showcase";
import {BlogShowcase} from "@/components/marketing/blog-showcase";
import {listPublishedPosts} from "@/lib/blog/posts";
import type {PostSummary} from "@/types/blog";

export default async function Home() {
  let posts: PostSummary[] = [];
  try {
    posts = await listPublishedPosts();
  } catch {
    posts = [];
  }

  return (
    <>
      <Navbar/>
      <main className="mx-auto max-w-330 px-6 sm:px-10">
        <Hero/>
        <FeatureStrip/>
        <PuzzlesShowcase/>
        <BlogShowcase posts={posts}/>
      </main>
    </>
  );
}
