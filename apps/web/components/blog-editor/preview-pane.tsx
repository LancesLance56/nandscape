"use client";

import type { ComponentType } from "react";
import { blockRegistry, type BlockDefinition } from "@/lib/blog-editor/block-registry";
import { useBlogEditorStore } from "@/store/blog-editor-store";
import type { ContentBlock } from "@/types/content-block";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function PreviewPane() {
  const blocks = useBlogEditorStore((s) => s.blocks);
  const metadata = useBlogEditorStore((s) => s.metadata);
  const documentKind = useBlogEditorStore((s) => s.documentKind);
  const date = formatDate(metadata.publishedAt);

  return (
    <div className="flex flex-col gap-4">
      <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate">Live preview</span>

      {/* Matches app/blog/[slug]/page.tsx's max-w-4xl exactly, so this preview
          is the real published width, not whatever width this pane happens
          to be given by the split/edit/preview layout around it. */}
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <article>
          {documentKind === "post" ? (
            // Mirrors app/blog/[slug]/page.tsx's <article> header exactly -
            // date/author line, title, then cover image.
            <>
              <header className="mb-8">
                {(date || metadata.authorName) && (
                  <div className="mb-3 flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-wider text-slate">
                    {date && <span>{date}</span>}
                    {metadata.authorName && (
                      <>
                        {date && <span className="text-border-strong">·</span>}
                        <span>{metadata.authorName}</span>
                      </>
                    )}
                  </div>
                )}
                <h1 className="font-display text-3xl font-bold leading-tight text-ink lg:text-4xl">
                  {metadata.title || "Untitled"}
                </h1>
              </header>
              {metadata.coverImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={metadata.coverImage}
                  alt=""
                  className="mb-8 w-full rounded-2xl border border-border object-cover"
                />
              )}
            </>
          ) : (
            // Tutorial pages don't render a date/author line or cover image
            // on the real page (see app/tutorials/[slug]/page.tsx) - this
            // intentionally doesn't invent one just because a post would
            // have it.
            <h1 className="mb-8 font-display text-3xl font-bold leading-tight text-ink">
              {metadata.title || "Untitled"}
            </h1>
          )}

          <div className="flex flex-col gap-4">
            {blocks.map((block) => {
              const definition = blockRegistry[block.type] as unknown as BlockDefinition;
              const Renderer = definition.Renderer as unknown as ComponentType<{ block: ContentBlock }>;
              return <Renderer key={block.id} block={block} />;
            })}
          </div>
        </article>
      </div>
    </div>
  );
}
