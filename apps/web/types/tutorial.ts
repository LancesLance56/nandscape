import type { ContentBlock } from "./content-block";
import type { SeoFields } from "./blog";

export type { SeoFields };

export type TutorialStatus = "draft" | "published" | "archived";

export interface TutorialTrack {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  position: number;
}

export interface TutorialSection {
  id: string;
  slug: string;
  title: string;
  position: number;
  trackId: string | null;
}

/** A track with everything under it, for the /tutorials directory and for a
 *  track's own landing page. */
export interface TutorialTrackTree extends TutorialTrack {
  sections: TutorialNavSection[];
  /** Total published pages across this track's sections - the count the
   *  directory card shows. */
  pageCount: number;
}

export interface NewTutorialTrackInput {
  slug: string;
  title: string;
  description?: string;
  position?: number;
}

export type UpdateTutorialTrackInput = Partial<NewTutorialTrackInput>;

export interface TutorialPageSummary extends SeoFields {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  authorName: string | null;
  status: TutorialStatus;
  tags: string[];
  sectionId: string | null;
  position: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TutorialPage extends TutorialPageSummary {
  body: ContentBlock[];
}

export interface TutorialNavPage {
  slug: string;
  title: string;
}

export interface TutorialNavSection {
  id: string;
  slug: string;
  title: string;
  pages: TutorialNavPage[];
}

export interface TutorialNavTree {
  standalone: TutorialNavPage[];
  sections: TutorialNavSection[];
}

export interface NewTutorialSectionInput {
  slug: string;
  title: string;
  position?: number;
  trackId?: string | null;
  /** Seed-file convenience: resolved to `trackId` by the API so a section
   *  file can name its track without knowing the generated UUID,  same
   *  pattern as a tutorial page's `sectionSlug`. */
  trackSlug?: string;
}

export type UpdateTutorialSectionInput = Partial<NewTutorialSectionInput>;

export interface NewTutorialPageInput {
  slug: string;
  title: string;
  excerpt?: string;
  coverImage?: string;
  authorName?: string;
  status?: TutorialStatus;
  body?: ContentBlock[];
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  keywords?: string[];
  sectionId?: string | null;
  position?: number;
  publishedAt?: string | null;
}

export type UpdateTutorialPageInput = Partial<NewTutorialPageInput>;