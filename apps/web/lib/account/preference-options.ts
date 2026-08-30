import type { PuzzleDifficulty } from "@/types/puzzle";

/**
 * The shape and the limits of a reader's dashboard settings.
 *
 * Split from `preferences.ts` because that module opens a Postgres pool, and
 * the settings form is a client component: importing a constant from it would
 * pull `pg` into the browser bundle. Nothing here touches the database, so both
 * sides can import it.
 */

export interface UserPreferences {
  /** Slug of the tutorial track the reader is working through. */
  focusTrackSlug: string | null;
  /** Lessons and quizzes they mean to finish in a week. */
  weeklyGoal: number;
  preferredDifficulty: PuzzleDifficulty | null;
  /** Project ids, in the order the reader pinned them. */
  pinnedProjectIds: string[];
  /** Ids of overview cards this reader has turned off. */
  hiddenWidgets: string[];
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  focusTrackSlug: null,
  weeklyGoal: 3,
  preferredDifficulty: null,
  pinnedProjectIds: [],
  hiddenWidgets: [],
};

/**
 * The overview cards a reader can turn off.
 *
 * Stored as the *hidden* set, so a card added here later is visible to everyone
 * by default rather than staying invisible until each person opts in (see the
 * schema comment on `hidden_widgets`).
 */
export const OVERVIEW_WIDGETS = [
  { id: "goal", label: "Weekly goal", description: "Progress against the target you set." },
  { id: "continue", label: "Up next", description: "The next lesson in your focus track." },
  { id: "activity", label: "Activity heatmap", description: "A year of lessons and quizzes." },
  { id: "tracks", label: "Track progress", description: "How far through each track you are." },
  { id: "puzzles", label: "Try next", description: "Unsolved puzzles at your difficulty." },
  { id: "circuits", label: "Your circuits", description: "Pinned and recent saved circuits." },
] as const;

export type OverviewWidgetId = (typeof OVERVIEW_WIDGETS)[number]["id"];

export const WIDGET_IDS = new Set<string>(OVERVIEW_WIDGETS.map((widget) => widget.id));

/** The goal is a denominator: zero would divide by it, and a hundred would
 *  leave the meter permanently empty and useless. */
export const MIN_WEEKLY_GOAL = 1;
export const MAX_WEEKLY_GOAL = 20;

/** How many circuits one reader may pin. A dashboard section that can grow
 *  without bound stops being a shortlist. */
export const MAX_PINNED_PROJECTS = 4;
