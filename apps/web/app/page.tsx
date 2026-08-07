import {Hero} from "@/components/hero";
import {Navbar} from "@/components/navbar";
import {FeatureStrip} from "@/components/marketing/feature-strip";
import {PuzzlesShowcase} from "@/components/marketing/puzzles-showcase";
import {TutorialsShowcase} from "@/components/marketing/tutorials-showcase";
import {BlogShowcase} from "@/components/marketing/blog-showcase";
import {SiteGradient} from "@/components/site-gradient";
import {ScrollReveal} from "@/components/scroll-reveal";
import {listPublishedPosts} from "@/lib/blog/posts";
import type {PostSummary} from "@/types/blog";

export const revalidate = 60;

export default async function Home() {
  // Defensive: the homepage should render even if the DB isn't reachable
  // (e.g. first boot, local dev without postgres running yet).
  let posts: PostSummary[] = [];
  try {
    posts = await listPublishedPosts();
  } catch {
    posts = [];
  }

  return (
    <>
      <SiteGradient/>
      <Navbar/>
      <main className="relative mx-auto max-w-330 px-6 sm:px-10">
        <Hero/>
          <FeatureStrip/>
          <PuzzlesShowcase/>
          <TutorialsShowcase/>
          <BlogShowcase posts={posts}/>
      </main>
    </>
  );
}