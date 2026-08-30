import { getTool } from "@/lib/tools/tools";
import { ALL_CHARTS } from "@/lib/flowchart/charts";
import { getDiagramPreset } from "@/lib/diagrams/diagram-records";
import { getProjectBySlug } from "@/lib/projects/projects";
import {
  CIRCUIT_HEIGHT,
  DEFAULT_HEIGHT,
  FLOWCHART_HEIGHT,
  type EmbedTarget,
  type ResolvedEmbed,
} from "./embeddable";

/**
 * Turning an embed address into something renderable.
 *
 * Split out of embeddable.ts because two of the five kinds read the database,
 * and that import chain ends at `pg`. The URL and snippet helpers next door
 * are used by client components such as the embed builder and the homepage
 * showcase, so while these functions lived beside them, importing
 * `buildEmbedSnippet` pulled a Postgres driver into the browser bundle and the
 * app failed to compile with a "can't resolve util/types" from inside
 * node_modules.
 *
 * Server components import from here; everything else imports from
 * ./embeddable. Nothing in this file may be imported by a component marked
 * "use client".
 */

/** Resolve a target, or null if it does not exist. */
export async function resolveEmbed(
  target: EmbedTarget,
  inlineData?: Record<string, unknown>,
): Promise<ResolvedEmbed | null> {
  switch (target.kind) {
    case "tool":
      return resolveTool(target.id);
    case "flowchart":
      return resolveFlowchart(target.id);
    case "graph":
      return resolveGraph(target.id);
    case "circuit":
      return resolveCircuit(target.id);
    case "widget":
      return resolveWidget(target.id, inlineData);
  }
}

function resolveTool(slug: string): ResolvedEmbed | null {
  const tool = getTool(slug);
  if (!tool) return null;

  return {
    title: tool.title,
    content: { render: "widget", widget: tool.widget, data: tool.widgetData ?? {} },
    sourceHref: `/tools/${tool.slug}`,
    height: tool.embedHeight ?? DEFAULT_HEIGHT,
  };
}

async function resolveFlowchart(slug: string): Promise<ResolvedEmbed | null> {
  // Stored beats compiled-in, for the same reason resolve-block-diagrams
  // orders them this way: the database is the editable copy, and a preset
  // that has been corrected there must not be shadowed by a stale constant.
  const stored = await getStoredPreset(slug, "flowchart");
  if (stored) {
    return {
      title: stored.title,
      content: { render: "widget", widget: "flowchart", data: { chart: stored.spec } },
      sourceHref: "/tools/flowchart-maker",
      height: FLOWCHART_HEIGHT,
    };
  }

  const chart = ALL_CHARTS[slug];
  if (!chart) return null;

  return {
    title: chart.title ?? "Flowchart",
    content: { render: "widget", widget: "flowchart", data: { chart } },
    sourceHref: "/tools/flowchart-maker",
    height: chart.height ?? FLOWCHART_HEIGHT,
  };
}

async function resolveGraph(slug: string): Promise<ResolvedEmbed | null> {
  const stored = await getStoredPreset(slug, "graph");
  if (!stored) return null;

  return {
    title: stored.title,
    content: { render: "widget", widget: "graph-embed", data: { graph: stored.spec } },
    sourceHref: "/tools/graph-algorithm-visualizer",
    height: DEFAULT_HEIGHT,
  };
}

async function resolveCircuit(slug: string): Promise<ResolvedEmbed | null> {
  const project = await getProjectBySlug(slug);
  if (!project || project.visibility === "PRIVATE") return null;

  return {
    title: project.name,
    content: {
      render: "circuit",
      nodes: project.nodes,
      edges: project.edges,
      blocks: project.blocks,
      scopes: project.scopes,
    },
    sourceHref: `/projects/${project.slug}`,
    height: CIRCUIT_HEIGHT,
  };
}

function resolveWidget(key: string, data: Record<string, unknown> | undefined): ResolvedEmbed | null {
  // Not validated against the widget registry, because that would mean
  // importing every widget component here and dragging the whole interactive
  // bundle into the oEmbed endpoint. An unknown key falls through to the
  // renderer, which already shows an "unknown widget" notice.
  if (!key) return null;

  return {
    title: data && typeof data.title === "string" ? data.title : key,
    content: { render: "widget", widget: key, data: data ?? {} },
    sourceHref: "/embeds",
    height: DEFAULT_HEIGHT,
  };
}

/** The database is optional infrastructure for an embed. A preset that cannot
 *  be read falls through to the compiled-in chart instead of erroring the
 *  page. */
async function getStoredPreset(slug: string, kind: "flowchart" | "graph") {
  try {
    const record = await getDiagramPreset(slug);
    return record && record.kind === kind ? record : null;
  } catch {
    return null;
  }
}
