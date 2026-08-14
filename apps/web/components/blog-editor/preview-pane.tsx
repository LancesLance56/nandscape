"use client";

import type { ComponentType, ReactNode } from "react";
import { blockRegistry, type BlockDefinition } from "@/lib/blog-editor/block-registry";
import { useBlogEditorStore } from "@/store/blog-editor-store";
import type { ContentBlock } from "@/types/content-block";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// Matches app/blog/[slug]/page.tsx's max-w-4xl exactly, so the preview is the
// real published width, not whatever width it happens to be given by the
// split/edit/preview layout around it.
function PreviewWidth({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-4xl">{children}</div>;
}

/** Bare title/date/author/cover image markup, mirroring app/blog/[slug]/page.tsx's <article> header exactly. No width wrap of its own - callers already sit inside one. */
function HeaderContent() {
  const metadata = useBlogEditorStore((s) => s.metadata);
  const documentKind = useBlogEditorStore((s) => s.documentKind);
  const date = formatDate(metadata.publishedAt);

  if (documentKind !== "post") {
    // Tutorial pages don't render a date/author line or cover image on the
    // real page (see app/tutorials/[slug]/page.tsx) - this intentionally
    // doesn't invent one just because a post would have it.
    return (
      <h1 className="mb-8 font-display text-3xl font-bold leading-tight text-ink">{metadata.title || "Untitled"}</h1>
    );
  }

  return (
    <>
      <header className="mb-8">
        {(date || metadata.authorName) && (
          <div className="mb-3 flex items-center gap-2 text-[11px] font-medium text-slate">
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
        <img src={metadata.coverImage} alt="" className="mb-8 w-full rounded-2xl border border-border object-cover" />
      )}
    </>
  );
}

/**
 * Standalone header row for split view: the "Live preview" label plus the
 * width-clamped title/date/cover block, as a single element so it can sit
 * in one grid cell (block-list.tsx's per-block grid is one row per block;
 * this is the un-paired row above it, editor side left empty since none of
 * this is edited in BlockList - it's all MetadataPanel, shown separately).
 */
export function PreviewHeader() {
  return (
    <div className="flex flex-col gap-4">
      <span className=" text-[11px] font-semibold text-slate">Live preview</span>
      <PreviewWidth>
        <HeaderContent />
      </PreviewWidth>
    </div>
  );
}

/**
 * A single rendered block, width-clamped on its own. Used as the second
 * grid column of block-list.tsx's per-block row in split view, so it gets a
 * bit of extra top padding to make up for that grid's tight gap-y-0.5
 * (shared with the editor column, which wants to stay dense) - restores
 * roughly the gap-4 breathing room blocks get in the standalone preview
 * below.
 */
export function PreviewBlockItem({ block }: { block: ContentBlock }) {
  const definition = blockRegistry[block.type] as unknown as BlockDefinition;
  const Renderer = definition.Renderer as unknown as ComponentType<{ block: ContentBlock }>;

  return (
    <PreviewWidth>
      <div className="pt-3.5">
        <Renderer block={block} />
      </div>
    </PreviewWidth>
  );
}

export function PreviewPane() {
  const blocks = useBlogEditorStore((s) => s.blocks);

  return (
    <div className="flex flex-col gap-4">
      <span className=" text-[11px] font-semibold text-slate">Live preview</span>
      <PreviewWidth>
        <article>
          <HeaderContent />
          <div className="flex flex-col gap-4">
            {blocks.map((block) => {
              const definition = blockRegistry[block.type] as unknown as BlockDefinition;
              const Renderer = definition.Renderer as unknown as ComponentType<{ block: ContentBlock }>;
              return <Renderer key={block.id} block={block} />;
            })}
          </div>
        </article>
      </PreviewWidth>
    </div>
  );
}
