import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { buildContentMetadata } from "@/lib/seo/metadata";
import type { TutorialTrackTree } from "@/types/tutorial";

export function trackMetadata(track: TutorialTrackTree): Metadata {
  return buildContentMetadata({
    title: `${track.title} Tutorials`,
    seoTitle: `${track.title} Tutorials: Free Interactive Lessons`,
    seoDescription:
      track.description ??
      `Free ${track.title} tutorials with interactive visualisations you can step through.`,
    path: `/tutorials/${track.slug}`,
    type: "website",
  });
}

/**
 * A track's landing page: every section in the track with its lessons
 * listed under it. This is the layer that was missing - previously
 * /tutorials redirected straight into the first lesson, so there was no
 * page that described a subject as a whole, for a reader or for a crawler
 * looking for something to rank against a broad query.
 */
export function TrackLanding({ track }: { track: TutorialTrackTree }) {
  const sections = track.sections.filter((s) => s.pages.length > 0);
  const firstLesson = sections[0]?.pages[0];

  return (
    <div>
      <BreadcrumbJsonLd
        items={[
          { name: "Tutorials", path: "/tutorials" },
          { name: track.title, path: `/tutorials/${track.slug}` },
        ]}
      />

      <nav aria-label="Breadcrumb" className="mb-3 text-xs text-slate">
        <Link href="/tutorials" className="hover:text-copper-dark">
          Tutorials
        </Link>
        <span className="mx-1.5 text-border-strong">/</span>
        <span className="text-ink-soft">{track.title}</span>
      </nav>

      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold leading-tight text-ink">{track.title}</h1>
        {track.description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">{track.description}</p>
        )}
        <p className="mt-3 text-xs text-slate">
          {track.pageCount} {track.pageCount === 1 ? "lesson" : "lessons"} across {sections.length}{" "}
          {sections.length === 1 ? "section" : "sections"}
        </p>
        {firstLesson && (
          <Link
            href={`/tutorials/${track.slug}/${firstLesson.slug}`}
            className="mt-5 inline-block rounded-xl bg-copper px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-copper-dark"
          >
            Start with {firstLesson.title} →
          </Link>
        )}
      </header>

      <div className="flex flex-col gap-8">
        {sections.map((section) => (
          <section key={section.id}>
            <h2 className="mb-3 font-display text-lg font-bold text-ink">{section.title}</h2>
            <ol className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface-card">
              {section.pages.map((page, i) => (
                <li key={page.slug}>
                  <Link
                    href={`/tutorials/${track.slug}/${page.slug}`}
                    className="group flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-surface-2/70"
                  >
                    <span className="w-5 shrink-0 text-right text-[11px] text-border-strong">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-medium text-ink group-hover:text-copper-dark">
                      {page.title}
                    </span>
                    <span className="shrink-0 text-[11px] text-border-strong transition-transform group-hover:translate-x-0.5">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
