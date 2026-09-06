/**
 * Every named flowchart preset, in one place.
 *
 * The tutorial widgets look charts up by name from here, so adding a chart to
 * either family makes it available to tutorial content without touching a
 * component. These are the *auto-laid-out* teaching diagrams; the drawing tool
 * at /flowchart has its own templates, because a drawing is a thing somebody
 * placed rather than a thing an engine arranges.
 */

import { SORTING_CHARTS, STARTER_CHART } from "./sorting-charts";
import { BACKTRACKING_CHARTS } from "./backtracking-charts";
import type { FlowchartSpec } from "./types";

export const ALL_CHARTS: Record<string, FlowchartSpec> = {
  ...SORTING_CHARTS,
  ...BACKTRACKING_CHARTS,
};

export { STARTER_CHART };
