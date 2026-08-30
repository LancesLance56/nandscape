import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";
import { listPublishedPosts } from "@/lib/blog/posts";
import { listPublishedTutorialPages } from "@/lib/tutorials/tutorials";
import { listTutorialTracks, listTutorialTrackTrees } from "@/lib/tutorials/tutorial-tracks";
import { TOOLS } from "@/lib/tools/tools";
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
  { path: "/logic-editor", changeFrequency: "monthly", priority: 0.7 },
  { path: "/tutorials", changeFrequency: "weekly", priority: 0.8 },
  { path: "/blog", changeFrequency: "daily", priority: 0.8 },
  { path: "/community", changeFrequency: "daily", priority: 0.6 },
  { path: "/tools", changeFrequency: "monthly", priority: 0.9 },
  // The embed URLs themselves are noindex (they're the same content as the
  // page they came from), but the page *about* embedding is a landing page in
  // its own right and the thing worth ranking.
  { path: "/embeds", changeFrequency: "monthly", priority: 0.8 },
  { path: "/about", changeFrequency: "yearly", priority: 0.4 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.3 },
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

  const [posts, tutorialPages, tutorialTracks, trackTrees, puzzleRecords, publicProjects] = await Promise.all([
    listPublishedPosts().catch(() => []),
    listPublishedTutorialPages().catch(() => []),
    listTutorialTracks().catch(() => []),
    listTutorialTrackTrees().catch(() => []),
    listPuzzleRecords().catch(() => []),
    listPublicProjects().catch(() => []),
  ]);

  // page slug -> its track slug, so each lesson can be listed at its
  // canonical nested URL rather than the legacy flat one (which redirects).
  const trackByPageSlug = new Map<string, string>();
  for (const track of trackTrees) {
    for (const section of track.sections) {
      for (const page of section.pages) trackByPageSlug.set(page.slug, track.slug);
    }
  }

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

  // Only pages whose track is known get a sitemap entry - the nested URL
  // is the canonical one, and a page with no track has no nested URL to
  // point at yet.
  const tutorialEntries: MetadataRoute.Sitemap = tutorialPages
    .map((page) => ({ page, track: trackByPageSlug.get(page.slug) }))
    .filter((entry): entry is { page: (typeof tutorialPages)[number]; track: string } => Boolean(entry.track))
    .map(({ page, track }) => ({
      url: `${base}/tutorials/${track}/${page.slug}`,
      lastModified: page.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

  // Tool pages are static (defined in code, not the DB) and are the pages
  // most likely to attract an inbound link, so they rank alongside the
  // track hubs rather than below the lessons.
  const toolEntries: MetadataRoute.Sitemap = TOOLS.map((tool) => ({
    url: `${base}/tools/${tool.slug}`,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  // Track landing pages are the broad-topic entry points ("Digital Logic"),
  // so they rank for wider queries than any single lesson and sit high in
  // the internal link graph - worth a higher priority than the lessons.
  const trackEntries: MetadataRoute.Sitemap = tutorialTracks.map((track) => ({
    url: `${base}/tutorials/${track.slug}`,
    changeFrequency: "weekly",
    priority: 0.9,
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

  return [
    ...staticEntries,
    ...postEntries,
    ...toolEntries,
    ...trackEntries,
    ...tutorialEntries,
    ...puzzleEntries,
    ...projectEntries,
  ];
}
