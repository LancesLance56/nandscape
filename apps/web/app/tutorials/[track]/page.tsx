import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import {
  getTrackSlugForPage,
  getTutorialTrackTree,
  listTutorialTracks,
} from "@/lib/tutorials/tutorial-tracks";
import { TrackLanding, trackMetadata } from "./track-landing";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ track: string }>;
}

export async function generateStaticParams() {
  try {
    const tracks = await listTutorialTracks();
    return tracks.map((t) => ({ track: t.slug }));
  } catch {
    return [];
  }
}

/**
 * Lessons used to live at /tutorials/<page>, flat. Anything already
 * indexed, linked from an older article, or bookmarked still points there,
 * so a flat slug that turns out to be a lesson gets a 308 to its nested
 * home rather than a 404. permanentRedirect (not redirect) is what tells a
 * crawler to transfer the old URL's ranking to the new one.
 */
async function redirectLegacyLessonUrl(slug: string): Promise<never> {
  const trackSlug = await getTrackSlugForPage(slug);
  if (trackSlug) permanentRedirect(`/tutorials/${trackSlug}/${slug}`);
  notFound();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { track } = await params;
  const tree = await getTutorialTrackTree(track);
  return tree ? trackMetadata(tree) : {};
}

export default async function TutorialTrackPage({ params }: PageProps) {
  const { track } = await params;

  const tree = await getTutorialTrackTree(track);
  if (!tree) await redirectLegacyLessonUrl(track);

  return <TrackLanding track={tree!} />;
}
