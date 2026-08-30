import { TOOLS } from "@/lib/tools/tools";
import { ALL_CHARTS } from "@/lib/flowchart/charts";
import type { EditorNode, EditorEdge } from "@/types/editor";
import type { SubcircuitBlockDefinition } from "@/types/subcircuit-block";
import type { CircuitScope } from "@/types/scope";

/**
 * The embed vocabulary: parsing paths, building URLs and snippets, and listing
 * the catalog.
 *
 * Everything in this file runs in a browser as well as on the server, and it
 * has to stay that way. The embed builder and the homepage showcase are client
 * components that call `buildEmbedSnippet`, so while the database lookups
 * lived here too, importing a URL helper pulled `pg` into the client bundle
 * and the app stopped compiling. Anything that reads the database belongs in
 * ./resolve.ts instead.
 *
 * Nothing here knows what a K-map or a merge sort is. An embed is a `kind`
 * plus an `id`, and each kind is one small function that turns that id into
 * something the widget registry can already render. So adding a tool to TOOLS,
 * or a widget to the registry in interactive-block.tsx, is enough to make it
 * embeddable. This file needs no edit for either.
 *
 * The kinds, and why each exists:
 *
 * - `tool`      every entry in TOOLS, addressed by its existing slug. This is
 *               the main one, and it is free: a tool already declares which
 *               widget it is and what data to hand it.
 * - `flowchart` the named chart presets (bubble, merge, quick, n-queens and
 *               the rest), plus any flowchart stored in the database. Stored
 *               wins, matching resolve-block-diagrams: a diagram is content,
 *               and an edit to it must not need a deploy.
 * - `graph`     the stored graph presets, same reasoning.
 * - `circuit`   a saved project. Rendered by the circuit stage rather than a
 *               registry widget, because a circuit embed is a bare canvas.
 *               See the `render` discriminant below.
 * - `widget`    the escape hatch: any registry key with its data passed
 *               inline. Covers every widget that is not a headline tool, and
 *               covers new ones before anybody gets round to giving them a
 *               tool page.
 */

/* -------------------------------------------------------------------------- */
/* Kinds                                                                      */
/* -------------------------------------------------------------------------- */

export const EMBED_KINDS = ["tool", "flowchart", "graph", "circuit", "widget"] as const;
export type EmbedKind = (typeof EMBED_KINDS)[number];

export function isEmbedKind(value: string): value is EmbedKind {
  return (EMBED_KINDS as readonly string[]).includes(value);
}

/**
 * A circuit needs its own render path. The circuit widget wraps itself in a
 * card with a title bar and a zoom button, which is not what an embed wants,
 * and keeping the two paths separate is simpler than adding a strip-the-chrome
 * mode to that widget.
 */
export type EmbedContent =
  | { render: "widget"; widget: string; data: Record<string, unknown> }
  | {
      render: "circuit";
      nodes: EditorNode[];
      edges: EditorEdge[];
      blocks?: SubcircuitBlockDefinition[];
      scopes?: CircuitScope[];
    };

export interface ResolvedEmbed {
  title: string;
  content: EmbedContent;
  /** Site-relative path of the page this embed came from, for the credit link. */
  sourceHref: string;
  /** Sensible iframe height for this thing, used by the snippet builder. */
  height: number;
}

/** What the builder and the marketing pages list: the ones worth offering
 *  someone from a menu. Not every embeddable URL is in here, since the
 *  `widget` escape hatch is unbounded. */
export interface EmbedCatalogEntry {
  kind: EmbedKind;
  id: string;
  title: string;
  /** Grouping label for the picker. */
  group: string;
  height: number;
}

export const DEFAULT_HEIGHT = 520;
export const FLOWCHART_HEIGHT = 460;
export const CIRCUIT_HEIGHT = 420;

/* -------------------------------------------------------------------------- */
/* Path parsing                                                               */
/* -------------------------------------------------------------------------- */

export interface EmbedTarget {
  kind: EmbedKind;
  id: string;
}

/**
 * `/embed/<kind>/<id>`, with a one-segment legacy form.
 *
 * `/embed/<slug>` meant a project long before there were other kinds, and
 * those URLs are sitting in other people's pages where they cannot be
 * updated. So a single unprefixed segment still means a circuit.
 */
export function parseEmbedPath(parts: string[]): EmbedTarget | null {
  if (parts.length === 1) return { kind: "circuit", id: parts[0] };
  if (parts.length === 2 && isEmbedKind(parts[0])) return { kind: parts[0], id: parts[1] };
  return null;
}

export function embedPath({ kind, id }: EmbedTarget): string {
  return `/embed/${kind}/${encodeURIComponent(id)}`;
}

/* -------------------------------------------------------------------------- */
/* Inline widget data                                                         */
/* -------------------------------------------------------------------------- */

/**
 * The `widget` kind carries its config in the query string, so it has to
 * survive being a URL. base64url of JSON: no padding, and nothing that needs
 * escaping.
 */
export function encodeEmbedData(data: unknown): string {
  const json = JSON.stringify(data);
  const bytes =
    typeof Buffer !== "undefined"
      ? Buffer.from(json, "utf8").toString("base64")
      : btoa(String.fromCharCode(...new TextEncoder().encode(json)));
  return bytes.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeEmbedData(encoded: string): Record<string, unknown> | null {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const json =
      typeof Buffer !== "undefined"
        ? Buffer.from(base64, "base64").toString("utf8")
        : new TextDecoder().decode(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)));
    const parsed: unknown = JSON.parse(json);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    // A hand-mangled or truncated query string should fail quietly here
    // rather than throw.
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Catalog                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Everything worth offering from a menu, derived rather than listed. A tool
 * added to TOOLS or a chart added to ALL_CHARTS shows up here on its own.
 */
export function embedCatalog(): EmbedCatalogEntry[] {
  const tools: EmbedCatalogEntry[] = TOOLS.map((tool) => ({
    kind: "tool",
    id: tool.slug,
    title: tool.title,
    group: "Tools",
    height: tool.embedHeight ?? DEFAULT_HEIGHT,
  }));

  const charts: EmbedCatalogEntry[] = Object.entries(ALL_CHARTS).map(([id, chart]) => ({
    kind: "flowchart",
    id,
    title: chart.title ?? id,
    group: "Flowcharts",
    height: chart.height ?? FLOWCHART_HEIGHT,
  }));

  return [...tools, ...charts];
}

/* -------------------------------------------------------------------------- */
/* Options                                                                    */
/* -------------------------------------------------------------------------- */

export interface EmbedOptions {
  /** The "Built with Nandscape" link. On by default, since an embed sitting
   *  on someone else's page is a fair place to ask for a link back. Set
   *  `credit=0` to remove it. */
  credit: boolean;
  /** `auto` follows the reader's own system setting, which is what an embed
   *  sitting inside somebody else's dark-mode blog wants. */
  theme: "auto" | "light" | "dark";
}

export const DEFAULT_EMBED_OPTIONS: EmbedOptions = { credit: true, theme: "auto" };

type RawParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseEmbedOptions(params: RawParams): EmbedOptions {
  const credit = firstValue(params.credit);
  const theme = firstValue(params.theme);

  return {
    credit: credit === undefined ? true : credit !== "0" && credit !== "false",
    theme: theme === "light" || theme === "dark" ? theme : "auto",
  };
}

/** The inverse, for building snippet URLs. Only non-default options are
 *  written, so the common snippet stays short enough to read. */
export function embedOptionsQuery(options: EmbedOptions): string {
  const query = new URLSearchParams();
  if (!options.credit) query.set("credit", "0");
  if (options.theme !== "auto") query.set("theme", options.theme);
  const string = query.toString();
  return string ? `?${string}` : "";
}

/* -------------------------------------------------------------------------- */
/* Snippet                                                                    */
/* -------------------------------------------------------------------------- */

export interface SnippetInput {
  origin: string;
  target: EmbedTarget;
  title: string;
  width?: number | "responsive";
  height: number;
  options?: EmbedOptions;
}

export function embedUrl({ origin, target, options }: Pick<SnippetInput, "origin" | "target" | "options">): string {
  return `${origin}${embedPath(target)}${embedOptionsQuery(options ?? DEFAULT_EMBED_OPTIONS)}`;
}

/**
 * The iframe tag people paste. It is plain HTML with no script tag and nothing
 * to install, because that is what a CMS or a static site generator will
 * accept without argument.
 */
export function buildEmbedSnippet({
  origin,
  target,
  title,
  width = 640,
  height,
  options = DEFAULT_EMBED_OPTIONS,
}: SnippetInput): string {
  const src = embedUrl({ origin, target, options });
  const sizing =
    width === "responsive"
      ? `style="width:100%;border:0" height="${height}"`
      : `width="${width}" height="${height}" style="border:0"`;

  return (
    `<iframe src="${src}" ${sizing} ` +
    `title="${escapeAttribute(title)}" loading="lazy" ` +
    `allow="clipboard-write" referrerpolicy="no-referrer-when-downgrade"></iframe>`
  );
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* -------------------------------------------------------------------------- */
/* oEmbed target mapping                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Which public page maps to which embed, for the oEmbed endpoint.
 *
 * oEmbed consumers hand us the URL a person pasted, which is the human page
 * rather than the embed, and expect the embed HTML back. This is that lookup.
 * It is also why a tool page carries a
 * `<link rel="alternate" type="application/json+oembed">`: with that tag,
 * pasting a Nandscape tool link into WordPress or Notion gives the live tool.
 */
export function embedTargetForPath(pathname: string): EmbedTarget | null {
  const parts = pathname.replace(/^\/+|\/+$/g, "").split("/");

  if (parts[0] === "tools" && parts[1]) return { kind: "tool", id: parts[1] };
  if (parts[0] === "projects" && parts[1]) return { kind: "circuit", id: parts[1] };
  if (parts[0] === "embed") return parseEmbedPath(parts.slice(1));

  return null;
}
