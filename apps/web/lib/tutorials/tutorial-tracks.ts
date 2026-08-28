import { query } from "@/lib/db/client";
import type {
  NewTutorialTrackInput,
  TutorialNavPage,
  TutorialTrack,
  TutorialTrackTree,
  UpdateTutorialTrackInput,
} from "@/types/tutorial";

interface TutorialTrackRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  position: number;
  [key: string]: unknown;
}

function toTrack(row: TutorialTrackRow): TutorialTrack {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    position: row.position,
  };
}

const COLUMNS = `id, slug, title, description, position`;

export async function listTutorialTracks(): Promise<TutorialTrack[]> {
  const rows = await query<TutorialTrackRow>(
    `SELECT ${COLUMNS} FROM tutorial_tracks ORDER BY position ASC, title ASC`,
  );
  return rows.map(toTrack);
}

export async function getTutorialTrackBySlug(slug: string): Promise<TutorialTrack | null> {
  const rows = await query<TutorialTrackRow>(
    `SELECT ${COLUMNS} FROM tutorial_tracks WHERE slug = $1 LIMIT 1`,
    [slug],
  );
  return rows[0] ? toTrack(rows[0]) : null;
}

export async function createTutorialTrack(input: NewTutorialTrackInput): Promise<TutorialTrack> {
  const rows = await query<TutorialTrackRow>(
    `INSERT INTO tutorial_tracks (slug, title, description, position)
     VALUES ($1, $2, $3, $4)
     RETURNING ${COLUMNS}`,
    [input.slug, input.title, input.description ?? null, input.position ?? 0],
  );
  return toTrack(rows[0]);
}

export async function updateTutorialTrack(
  slug: string,
  patch: UpdateTutorialTrackInput,
): Promise<TutorialTrack | null> {
  const columnMap: Record<string, unknown> = {
    slug: patch.slug,
    title: patch.title,
    description: patch.description,
    position: patch.position,
  };

  const entries = Object.entries(columnMap).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return getTutorialTrackBySlug(slug);

  const setClauses = entries.map(([col], i) => `${col} = $${i + 2}`);
  const values = entries.map(([, value]) => value);

  const rows = await query<TutorialTrackRow>(
    `UPDATE tutorial_tracks SET ${setClauses.join(", ")} WHERE slug = $1 RETURNING ${COLUMNS}`,
    [slug, ...values],
  );
  return rows[0] ? toTrack(rows[0]) : null;
}

export async function deleteTutorialTrack(slug: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `DELETE FROM tutorial_tracks WHERE slug = $1 RETURNING id`,
    [slug],
  );
  return rows.length > 0;
}

interface TrackTreeRow {
  track_id: string;
  track_slug: string;
  track_title: string;
  track_description: string | null;
  track_position: number;
  section_id: string | null;
  section_slug: string | null;
  section_title: string | null;
  page_slug: string | null;
  page_title: string | null;
  [key: string]: unknown;
}

/**
 * The whole published library, grouped track -> section -> page, in one
 * query. Drives both the /tutorials directory and each track's landing
 * page; a LEFT JOIN throughout so a track with no sections (or a section
 * with no published pages yet) still appears rather than silently vanishing
 * from the directory.
 */
export async function listTutorialTrackTrees(): Promise<TutorialTrackTree[]> {
  const rows = await query<TrackTreeRow>(
    `SELECT
       t.id AS track_id, t.slug AS track_slug, t.title AS track_title,
       t.description AS track_description, t.position AS track_position,
       s.id AS section_id, s.slug AS section_slug, s.title AS section_title,
       p.slug AS page_slug, p.title AS page_title
     FROM tutorial_tracks t
     LEFT JOIN tutorial_sections s ON s.track_id = t.id
     LEFT JOIN tutorial_pages p ON p.section_id = s.id AND p.status = 'published'
     ORDER BY t.position ASC, t.title ASC, s.position ASC, s.title ASC, p.position ASC, p.title ASC`,
  );

  const tracks = new Map<string, TutorialTrackTree>();

  for (const row of rows) {
    let track = tracks.get(row.track_id);
    if (!track) {
      track = {
        id: row.track_id,
        slug: row.track_slug,
        title: row.track_title,
        description: row.track_description,
        position: row.track_position,
        sections: [],
        pageCount: 0,
      };
      tracks.set(row.track_id, track);
    }

    if (!row.section_id) continue;
    let section = track.sections.find((s) => s.id === row.section_id);
    if (!section) {
      section = {
        id: row.section_id,
        slug: row.section_slug!,
        title: row.section_title!,
        pages: [],
      };
      track.sections.push(section);
    }

    if (!row.page_slug) continue;
    section.pages.push({ slug: row.page_slug, title: row.page_title!, trackSlug: row.track_slug });
    track.pageCount += 1;
  }

  return Array.from(tracks.values());
}

export async function getTutorialTrackTree(slug: string): Promise<TutorialTrackTree | null> {
  const trees = await listTutorialTrackTrees();
  return trees.find((t) => t.slug === slug) ?? null;
}

/**
 * The lesson before and after `pageSlug` within its track, walking the track
 * as one flat sequence across section boundaries (sections and pages are
 * already returned in `position` order by listTutorialTrackTrees). Either end
 * is null at the first / last lesson. Drives the "Previous / Next" pager so a
 * reader finishing a page always has somewhere to go.
 */
export async function getAdjacentTutorialPages(
  trackSlug: string,
  pageSlug: string,
): Promise<{ prev: TutorialNavPage | null; next: TutorialNavPage | null }> {
  const tree = await getTutorialTrackTree(trackSlug);
  if (!tree) return { prev: null, next: null };

  const pages = tree.sections.flatMap((s) => s.pages);
  const index = pages.findIndex((p) => p.slug === pageSlug);
  if (index === -1) return { prev: null, next: null };

  return {
    prev: index > 0 ? pages[index - 1] : null,
    next: index < pages.length - 1 ? pages[index + 1] : null,
  };
}

/**
 * The track a given lesson lives under. Used to turn a legacy flat URL
 * (/tutorials/<page>) into its current nested one, so links published
 * before the restructure - including anything already indexed or linked
 * from elsewhere - keep resolving instead of 404ing.
 */
export async function getTrackSlugForPage(pageSlug: string): Promise<string | null> {
  const rows = await query<{ track_slug: string | null }>(
    `SELECT t.slug AS track_slug
     FROM tutorial_pages p
     JOIN tutorial_sections s ON s.id = p.section_id
     JOIN tutorial_tracks t ON t.id = s.track_id
     WHERE p.slug = $1
     LIMIT 1`,
    [pageSlug],
  );
  return rows[0]?.track_slug ?? null;
}
