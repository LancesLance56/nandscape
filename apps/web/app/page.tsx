import {Hero} from "@/components/hero";
import {Navbar} from "@/components/navbar";
import { Footer } from "@/components/footer";
import {FeatureStrip} from "@/components/marketing/feature-strip";
import {LiveDemo} from "@/components/marketing/live-demo";
import {PuzzlesShowcase} from "@/components/marketing/puzzles-showcase";
import {TutorialsShowcase} from "@/components/marketing/tutorials-showcase";
import {EmbedsShowcase} from "@/components/marketing/embeds-showcase";
import {ToolsBento} from "@/components/marketing/tools-bento";
import {BlogShowcase} from "@/components/marketing/blog-showcase";
import {SiteGradient} from "@/components/site-gradient";
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
          <TutorialsShowcase/>
          <ToolsBento/>
          <EmbedsShowcase/>
          <LiveDemo/>
          <FeatureStrip/>
          <PuzzlesShowcase/>
          <BlogShowcase posts={posts}/>
      </main>
      <Footer />
    </>
  );
}