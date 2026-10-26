/**
 * The subjects the tools are filed under.
 *
 * Its own module, apart from tools.ts, so a client component can colour a
 * tool by its subject without shipping every tool's SEO copy and FAQ along
 * with it.
 */
export type ToolGroup = "logic" | "numbers" | "algorithms" | "diagrams";

/**
 * The subjects, in filter order, each in one of the four brand colours.
 * `ink` is whichever of near-black or white reads on that colour.
 */
export const TOOL_GROUPS: Record<ToolGroup, { label: string; color: string; ink: string }> = {
  logic: { label: "Logic", color: "#ff751a", ink: "#1d1f22" },
  numbers: { label: "Numbers", color: "#fdca40", ink: "#1d1f22" },
  algorithms: { label: "Algorithms", color: "#3772ff", ink: "#ffffff" },
  diagrams: { label: "Diagrams", color: "#2f8a57", ink: "#ffffff" },
};
