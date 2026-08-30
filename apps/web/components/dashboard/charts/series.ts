import type { ChartSeries } from "./chart-card";

/**
 * The categorical slots, assigned once.
 *
 * Colour follows the entity, never its rank: lessons are copper on every chart
 * on every page, whether or not they happen to be the biggest series that week.
 * Defining them here rather than at each call site is what guarantees that -
 * a chart cannot accidentally hand quizzes the lessons colour because it
 * listed them in a different order.
 *
 * The hexes themselves live in dashboard.css as `--series-*`, so light and dark
 * swap in one place. Their validation - the lightness band, the chroma floor,
 * the CVD separation of every adjacent pair against each mode's own surface -
 * is recorded in the comment beside them there.
 */
export const SERIES = {
  activity: [
    { key: "lessons", label: "Lessons", color: "var(--series-lessons)" },
    { key: "quizzes", label: "Quizzes", color: "var(--series-quizzes)" },
    { key: "puzzles", label: "Puzzles", color: "var(--series-puzzles)" },
  ],
  /** One series, so the chart renders no legend - its title already says what
   *  is plotted, and a one-swatch box would only restate it. */
  signups: [{ key: "signups", label: "Sign-ups", color: "var(--series-lessons)" }],
} satisfies Record<string, ChartSeries[]>;
