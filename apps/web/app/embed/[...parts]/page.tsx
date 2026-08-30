import type { Metadata } from "next";
import { ReactFlowProvider } from "@xyflow/react";
import { InteractiveBlockView } from "@/components/content/blocks/interactive/interactive-block";
import { CircuitStage } from "@/components/content/blocks/circuit/circuit-stage";
import { EmbedShell } from "@/components/embeds/embed-shell";
import { siteUrl } from "@/lib/site-url";
import { decodeEmbedData, parseEmbedPath, parseEmbedOptions } from "@/lib/embeds/embeddable";
import { resolveEmbed } from "@/lib/embeds/resolve";

/**
 * One route for every embed on the site.
 *
 * A catch-all rather than a route per kind. `/embed/<projectSlug>` predates
 * the other kinds and is sitting in other people's pages, so it has to keep
 * working alongside `/embed/tool/x`, and Next will not let `[slug]` and
 * `[kind]` share a segment. It also means a new kind is a case in resolveEmbed
 * instead of a new file.
 *
 * Nothing here knows what any particular tool is. It parses a path, asks the
 * registry what that resolves to, and renders either a widget or a circuit
 * canvas.
 */

export const metadata: Metadata = {
  // Embeds are the same content as the page they came from. Indexing them
  // would put the two in competition for one query, and the embed is the
  // weaker result: an iframe with no heading or surrounding explanation.
  robots: { index: false, follow: false },
};

export const revalidate = 60;

interface PageProps {
  params: Promise<{ parts: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function Unavailable({ message }: { message: string }) {
  return (
    <div className="flex h-screen items-center justify-center px-6 text-center text-sm text-slate">{message}</div>
  );
}

export default async function EmbedPage({ params, searchParams }: PageProps) {
  const { parts } = await params;
  const query = await searchParams;

  const target = parseEmbedPath(parts);
  if (!target) return <Unavailable message="This embed address isn't valid." />;

  const inline = typeof query.data === "string" ? (decodeEmbedData(query.data) ?? undefined) : undefined;

  let resolved;
  try {
    resolved = await resolveEmbed(target, inline);
  } catch {
    // A tool embed must not go blank because the database is unreachable.
    // Most kinds never touch it, and the ones that do already fall back.
    return <Unavailable message="This embed couldn't be loaded right now." />;
  }

  if (!resolved) {
    return <Unavailable message="This isn't available for embedding." />;
  }

  const options = parseEmbedOptions(query);
  const sourceUrl = `${siteUrl()}${resolved.sourceHref}`;
  const isCircuit = resolved.content.render === "circuit";

  return (
    <EmbedShell options={options} title={resolved.title} sourceUrl={sourceUrl} bleed={isCircuit}>
      {resolved.content.render === "circuit" ? (
        <ReactFlowProvider>
          <CircuitStage
            nodes={resolved.content.nodes}
            edges={resolved.content.edges}
            blocks={resolved.content.blocks}
            scopes={resolved.content.scopes}
            allowScrollZoom
          />
        </ReactFlowProvider>
      ) : (
        <InteractiveBlockView
          block={{
            id: `embed-${target.kind}-${target.id}`,
            type: "interactive",
            widget: resolved.content.widget,
            data: resolved.content.data,
          }}
        />
      )}
    </EmbedShell>
  );
}
