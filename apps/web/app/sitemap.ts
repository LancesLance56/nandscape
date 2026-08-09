import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";
import { listPublishedPosts } from "@/lib/blog/posts";
import { listPublishedTutorialPages } from "@/lib/tutorials/tutorials";
import { listPuzzleRecords } from "@/lib/puzzles/puzzle-records";
import { listPublicProjects } from "@/lib/projects/projects";

// Same freshness window the listing pages themselves use (see e.g.
// app/page.tsx) - the sitemap shouldn't need to be more up to date than the
// pages it's describing, and matching them means this adds no extra DB load
// beyond what those pages already cost.
export const revalidate = 60;

const STATIC_ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/puzzles", changeFrequency: "weekly", priority: 0.9 },
  { path: "/nandbox", changeFrequency: "monthly", priority: 0.7 },
  { path: "/tutorials", changeFrequency: "weekly", priority: 0.8 },
  { path: "/blog", changeFrequency: "daily", priority: 0.8 },
  { path: "/community", changeFrequency: "daily", priority: 0.6 },
  { path: "/about", changeFrequency: "monthly", priority: 0.4 },
];

/**
 * Native Next.js dynamic sitemap - queries the DB on every request (subject
 * to `revalidate` above), so a new post/tutorial page/circuit shows up
 * without a rebuild. Replaces next-sitemap, which only ever reflected
 * whatever existed in the DB at the last `next build` (it ran as a
 * postbuild script against the built output, not a live route) - fine for a
 * site with no user-generated content, wrong once posts/circuits are
 * created after deploy.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const [posts, tutorialPages, puzzleRecords, publicProjects] = await Promise.all([
    listPublishedPosts().catch(() => []),
    listPublishedTutorialPages().catch(() => []),
    listPuzzleRecords().catch(() => []),
    listPublicProjects().catch(() => []),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${base}${path}`,
    changeFrequency,
    priority,
  }));

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${base}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const tutorialEntries: MetadataRoute.Sitemap = tutorialPages.map((page) => ({
    url: `${base}/tutorials/${page.slug}`,
    lastModified: page.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // listPuzzles() (used by the /puzzles listing itself) discards
  // createdAt/updatedAt by the time it returns PuzzleSpec - pulling the
  // records directly here instead, purely for lastModified.
  const puzzleEntries: MetadataRoute.Sitemap = puzzleRecords.map((puzzle) => ({
    url: `${base}/puzzles/${puzzle.slug}`,
    lastModified: puzzle.updatedAt,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // UNLISTED projects are deliberately excluded here, same as they're
  // excluded from listPublicProjects()'s own /community listing -
  // "unlisted" means reachable only via direct link, not discoverable.
  const projectEntries: MetadataRoute.Sitemap = publicProjects.map((project) => ({
    url: `${base}/projects/${project.slug}`,
    lastModified: project.updatedAt,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticEntries, ...postEntries, ...tutorialEntries, ...puzzleEntries, ...projectEntries];
}
