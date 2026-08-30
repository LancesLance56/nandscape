import { query } from "@/lib/db/client";
import { difficultyFromPrisma, difficultyToPrisma } from "@/types/puzzle";
import {
  DEFAULT_PREFERENCES,
  MAX_PINNED_PROJECTS,
  MAX_WEEKLY_GOAL,
  MIN_WEEKLY_GOAL,
  WIDGET_IDS,
  type UserPreferences,
} from "./preference-options";

// Re-exported so a server module can reach the whole preferences API through
// one import; the client imports these straight from ./preference-options,
// which carries no database dependency.
export {
  DEFAULT_PREFERENCES,
  MAX_PINNED_PROJECTS,
  MAX_WEEKLY_GOAL,
  MIN_WEEKLY_GOAL,
  OVERVIEW_WIDGETS,
} from "./preference-options";
export type { OverviewWidgetId, UserPreferences } from "./preference-options";

/**
 * The knobs that make the reader's dashboard theirs.
 *
 * Every field here changes what the dashboard *computes*, not just how it
 * looks: the focus track picks which lessons "continue where you left off"
 * reads, the weekly goal is the denominator of the goal meter, the preferred
 * difficulty filters the puzzle suggestions, and the pins choose which circuits
 * come first. Personalisation that only reordered decoration would not be worth
 * a table.
 *
 * A missing row means defaults, not an error. Nobody has a row until they
 * change something, so the read path has to work for every user on the site
 * from the moment they sign up - see `DEFAULT_PREFERENCES` and the lazy upsert
 * in `saveUserPreferences`.
 */

interface PreferenceRow {
  focus_track_slug: string | null;
  weekly_goal: number;
  preferred_difficulty: "EASY" | "MEDIUM" | "HARD" | "EXPERT" | null;
  pinned_project_ids: string[] | null;
  hidden_widgets: string[] | null;
  [key: string]: unknown;
}

export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const rows = await query<PreferenceRow>(
    `SELECT focus_track_slug, weekly_goal, preferred_difficulty, pinned_project_ids, hidden_widgets
       FROM user_preferences
      WHERE "userId" = $1`,
    [userId],
  );

  const row = rows[0];
  if (!row) return DEFAULT_PREFERENCES;

  return {
    focusTrackSlug: row.focus_track_slug,
    weeklyGoal: clampGoal(row.weekly_goal),
    preferredDifficulty: row.preferred_difficulty
      ? difficultyFromPrisma(row.preferred_difficulty)
      : null,
    pinnedProjectIds: row.pinned_project_ids ?? [],
    // Filter on read as well as write: a widget removed from the app in a later
    // release leaves its id behind in everyone's row, and carrying it around
    // forever would slowly turn this column into a graveyard.
    hiddenWidgets: (row.hidden_widgets ?? []).filter((id) => WIDGET_IDS.has(id)),
  };
}

function clampGoal(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_PREFERENCES.weeklyGoal;
  return Math.min(MAX_WEEKLY_GOAL, Math.max(MIN_WEEKLY_GOAL, Math.round(parsed)));
}

/**
 * Validate a partial update from the browser.
 *
 * Returns the fields that were both present and legal. Anything malformed is
 * dropped rather than rejected: this is a settings form, not a payment, and a
 * stale client sending a widget id that no longer exists should have the rest
 * of its save applied instead of a 422 the reader cannot act on.
 */
export function sanitizePreferences(input: unknown): Partial<UserPreferences> {
  if (typeof input !== "object" || input === null) return {};
  const body = input as Record<string, unknown>;
  const patch: Partial<UserPreferences> = {};

  if ("focusTrackSlug" in body) {
    const slug = body.focusTrackSlug;
    patch.focusTrackSlug =
      typeof slug === "string" && /^[a-z0-9-]{1,80}$/.test(slug) ? slug : null;
  }

  if ("weeklyGoal" in body) patch.weeklyGoal = clampGoal(body.weeklyGoal);

  if ("preferredDifficulty" in body) {
    const value = body.preferredDifficulty;
    patch.preferredDifficulty =
      value === "easy" || value === "medium" || value === "hard" || value === "expert"
        ? value
        : null;
  }

  if (Array.isArray(body.pinnedProjectIds)) {
    patch.pinnedProjectIds = Array.from(
      new Set(body.pinnedProjectIds.filter((id): id is string => typeof id === "string" && id.length <= 64)),
    ).slice(0, MAX_PINNED_PROJECTS);
  }

  if (Array.isArray(body.hiddenWidgets)) {
    patch.hiddenWidgets = Array.from(
      new Set(body.hiddenWidgets.filter((id): id is string => typeof id === "string" && WIDGET_IDS.has(id))),
    );
  }

  return patch;
}

/**
 * Write a partial update, creating the row if this is the reader's first save.
 *
 * One statement rather than a read-then-write. Two saves racing - the goal
 * changed on one tab while a pin is toggled on another - would otherwise let
 * the slower request write back the values it read before the faster one
 * landed, silently undoing it.
 *
 * The list of fields the caller actually sent travels as `$7` rather than being
 * inferred from NULLs, because two of these columns are nullable *values*:
 * a NULL `focus_track_slug` means "no focus track", which is a real setting and
 * not the same as "leave the focus track alone".
 */
export async function saveUserPreferences(
  userId: string,
  patch: Partial<UserPreferences>,
): Promise<UserPreferences> {
  const touched = Object.keys(patch);

  const rows = await query<PreferenceRow>(
    `INSERT INTO user_preferences (
       "userId", focus_track_slug, weekly_goal, preferred_difficulty,
       pinned_project_ids, hidden_widgets, created_at, updated_at
     )
     VALUES (
       $1,
       $2,
       COALESCE($3::int, ${DEFAULT_PREFERENCES.weeklyGoal}),
       $4::"Difficulty",
       COALESCE($5::text[], ARRAY[]::text[]),
       COALESCE($6::text[], ARRAY[]::text[]),
       now(), now()
     )
     ON CONFLICT ("userId") DO UPDATE SET
       focus_track_slug = CASE WHEN 'focusTrackSlug' = ANY($7::text[])
                               THEN EXCLUDED.focus_track_slug
                               ELSE user_preferences.focus_track_slug END,
       weekly_goal = CASE WHEN 'weeklyGoal' = ANY($7::text[])
                          THEN EXCLUDED.weekly_goal
                          ELSE user_preferences.weekly_goal END,
       preferred_difficulty = CASE WHEN 'preferredDifficulty' = ANY($7::text[])
                                   THEN EXCLUDED.preferred_difficulty
                                   ELSE user_preferences.preferred_difficulty END,
       pinned_project_ids = CASE WHEN 'pinnedProjectIds' = ANY($7::text[])
                                 THEN EXCLUDED.pinned_project_ids
                                 ELSE user_preferences.pinned_project_ids END,
       hidden_widgets = CASE WHEN 'hiddenWidgets' = ANY($7::text[])
                             THEN EXCLUDED.hidden_widgets
                             ELSE user_preferences.hidden_widgets END,
       updated_at = now()
     RETURNING focus_track_slug, weekly_goal, preferred_difficulty, pinned_project_ids, hidden_widgets`,
    [
      userId,
      patch.focusTrackSlug ?? null,
      patch.weeklyGoal ?? null,
      patch.preferredDifficulty ? difficultyToPrisma(patch.preferredDifficulty) : null,
      patch.pinnedProjectIds ?? null,
      patch.hiddenWidgets ?? null,
      touched,
    ],
  );

  const row = rows[0];
  if (!row) return DEFAULT_PREFERENCES;

  return {
    focusTrackSlug: row.focus_track_slug,
    weeklyGoal: clampGoal(row.weekly_goal),
    preferredDifficulty: row.preferred_difficulty
      ? difficultyFromPrisma(row.preferred_difficulty)
      : null,
    pinnedProjectIds: row.pinned_project_ids ?? [],
    hiddenWidgets: (row.hidden_widgets ?? []).filter((id) => WIDGET_IDS.has(id)),
  };
}
