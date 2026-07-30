import type { ContentBlock } from "./content-block";

export type TutorialStatus = "draft" | "published" | "archived";

export interface TutorialSection {
  id: string;
  slug: string;
  title: string;
  position: number;
}

export interface TutorialPageSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
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
  sectionId?: string | null;
  position?: number;
  publishedAt?: string | null;
}

export type UpdateTutorialPageInput = Partial<NewTutorialPageInput>;