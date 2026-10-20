"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { tutorialPath, type TutorialTrackTree } from "@/types/tutorial";

/**
 * The tutorials directory as a book's contents page: every section down the
 * left, the chosen section's lessons on the right, and previous / next that
 * walk the sections in book order - across track boundaries, so the last
 * section of one track leads straight into the first of the next.
 *
 * Every section's lesson list is in the markup, not just the selected one; the
 * others are `hidden`. A crawler (or a reader without JavaScript) therefore
 * still reaches every lesson from this page, which the old long-list directory
 * guaranteed and a click-to-reveal panel would otherwise lose.
 */

interface FlatSection {
  id: string;
  /** "1.2": track number, then section number within it. */
  idx: string;
  title: string;
  trackNum: string;
  trackTitle: string;
  lessons: { href: string; title: string }[];
}

function lessonCount(n: number) {
  return `${n} ${n === 1 ? "lesson" : "lessons"}`;
}

export function ContentsBrowser({ tracks }: { tracks: TutorialTrackTree[] }) {
  // One flat, book-ordered list, built once - the nav, the panel and the pager
  // all read from it, so their numbering can never disagree.
  const { groups, flat } = useMemo(() => {
    const flat: FlatSection[] = [];
    const groups = tracks.map((track, ti) => {
      const trackNum = String(ti + 1).padStart(2, "0");
      const sections = track.sections
        .filter((s) => s.pages.length > 0)
        .map((section, si) => {
          const entry: FlatSection = {
            id: section.id,
            idx: `${ti + 1}.${si + 1}`,
            title: section.title,
            trackNum,
            trackTitle: track.title,
            lessons: section.pages.map((page) => ({
              href: tutorialPath(page.trackSlug ?? track.slug, page.slug),
              title: page.title,
            })),
          };
          flat.push(entry);
          return entry;
        });
      return { id: track.id, slug: track.slug, num: trackNum, title: track.title, total: track.pageCount, sections };
    });
    return { groups, flat };
  }, [tracks]);

  const [currentId, setCurrentId] = useState<string | null>(flat[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const at = Math.max(0, flat.findIndex((s) => s.id === currentId));
  const prev = flat[at - 1] ?? null;
  const next = flat[at + 1] ?? null;

  // "/" jumps to the search box, as the hint in it says - unless the reader is
  // already typing somewhere.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return [];
    return flat.flatMap((section) =>
      section.lessons
        .map((lesson, i) => ({ ...lesson, n: `${section.idx}.${i + 1}`, section }))
        .filter((lesson) => lesson.title.toLowerCase().includes(q) || lesson.section.title.toLowerCase().includes(q)),
    );
  }, [flat, q]);

  function pick(id: string) {
    setCurrentId(id);
    setQuery("");
    // The lesson pane scrolls on its own; a new section starts at its top.
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    // Once the two panes have stacked (narrow screens), the lessons are below
    // the whole section list - take the reader to them rather than leave the
    // click looking like it did nothing.
    const panel = panelRef.current;
    if (panel && window.matchMedia("(max-width: 1023px)").matches) {
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  const sectionCount = flat.length;
  const lessonTotal = flat.reduce((n, s) => n + s.lessons.length, 0);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6 pb-8">
        <div className="min-w-0 flex-[1_1_520px]">
          <p className="font-label text-[11px] uppercase tracking-[0.14em] text-slate">Tutorials</p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-none tracking-tight text-ink sm:text-[2.75rem]">
            Contents
          </h1>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-label text-xs text-ink-soft">
            <span>
              <span className="text-ink">{groups.length}</span> {groups.length === 1 ? "track" : "tracks"}
            </span>
            <span>
              <span className="text-ink">{sectionCount}</span> {sectionCount === 1 ? "section" : "sections"}
            </span>
            <span>
              <span className="text-ink">{lessonTotal}</span> {lessonTotal === 1 ? "lesson" : "lessons"}
            </span>
          </div>
        </div>

        <label className="flex h-11 w-full flex-[0_1_400px] cursor-text items-center gap-3 rounded-xl border border-border-strong bg-surface-card pl-4 pr-3 text-slate transition-colors focus-within:border-copper">
          <Search aria-hidden className="h-4 w-4 shrink-0" />
          <span className="sr-only">Search lessons</span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Look something up, e.g. Dijkstra"
            className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-slate"
          />
          <kbd className="rounded-md border border-border-strong px-1.5 py-0.5 font-label text-xs text-slate">/</kbd>
        </label>
      </div>

      {/* Two panes on one ruled card. The 1px gap over a border-coloured
          background is the divider, so it follows the panes when they wrap
          onto two rows instead of needing a separate rule per layout. */}
      {/* Bounded rather than as long as the longest section: side by side the
          card is a fixed height (shorter on a short screen) and each pane
          scrolls on its own; stacked, each pane gets its own cap instead. */}
      <div className="flex flex-wrap gap-px overflow-hidden rounded-2xl border border-border bg-border lg:h-[min(40rem,calc(100dvh-11rem))] lg:flex-nowrap">
        <nav
          aria-label="Sections"
          className="max-h-80 min-w-0 flex-[1_1_300px] overflow-y-auto overscroll-contain bg-surface-card px-2.5 pb-3 pt-1 lg:max-h-none"
        >
          {groups.map((track, ti) => (
            <div key={track.id} className={cn(ti > 0 && "mt-3 border-t border-border")}>
              <h2 className="m-0 flex items-baseline gap-3 px-3 pb-2 pt-3.5">
                <span className="font-label text-xs font-medium text-copper">{track.num}</span>
                <span className="flex-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink">
                  {track.title}
                </span>
                <span className="font-label text-xs text-slate">{track.total}</span>
              </h2>

              <div className="flex flex-col gap-0.5">
                {track.sections.map((section) => {
                  const on = !q && section.id === flat[at]?.id;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      aria-current={on ? "true" : undefined}
                      onClick={() => pick(section.id)}
                      className={cn(
                        "grid min-h-10 w-full grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors",
                        on ? "bg-surface-2" : "hover:bg-surface-2/60",
                      )}
                    >
                      <span className={cn("font-label text-[11px]", on ? "text-copper" : "text-slate")}>{section.idx}</span>
                      <span className={cn("text-sm leading-snug", on ? "font-medium text-ink" : "text-ink-soft")}>
                        {section.title}
                      </span>
                      <span className="font-label text-[11px] text-slate">{section.lessons.length}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <section
          ref={panelRef}
          aria-label={q ? "Search results" : "Lessons"}
          className="flex max-h-[32rem] min-w-0 flex-[2_1_460px] scroll-mt-24 flex-col bg-surface lg:max-h-none"
        >
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-7 sm:px-8">
            {q ? (
              <>
                <p className="font-label text-xs text-slate">Search</p>
                <h2 className="mt-2.5 font-display text-[1.75rem] font-semibold leading-tight tracking-tight text-ink">
                  “{query.trim()}”
                </h2>
                <p className="mt-2 font-label text-xs text-slate">{lessonCount(results.length)}</p>
                {results.length === 0 ? (
                  <p className="mt-6 text-sm text-ink-soft">No lesson matches that. Try a broader word.</p>
                ) : (
                  <ol className="mt-5 list-none p-0">
                    {results.map((lesson) => (
                      <LessonRow key={lesson.href} n={lesson.n} href={lesson.href} title={lesson.title} />
                    ))}
                  </ol>
                )}
              </>
            ) : (
              flat.map((section) => (
                <article
                  key={section.id}
                  hidden={section.id !== flat[at]?.id}
                  aria-labelledby={`sec-${section.id}`}
                  // The display class has to follow `hidden` too: a bare `flex`
                  // outranks the attribute's UA display:none and shows them all.
                  className={cn("flex-col", section.id === flat[at]?.id ? "flex" : "hidden")}
                >
                  <p className="flex flex-wrap gap-x-2.5 gap-y-1.5 font-label text-xs text-slate">
                    <span className="text-copper">{section.trackNum}</span>
                    <span>{section.trackTitle}</span>
                    <span aria-hidden>/</span>
                    <span>Section {section.idx}</span>
                  </p>
                  <h2
                    id={`sec-${section.id}`}
                    className="mt-2.5 font-display text-[1.75rem] font-semibold leading-tight tracking-tight text-ink"
                  >
                    {section.title}
                  </h2>
                  <p className="mt-2 font-label text-xs text-slate">{lessonCount(section.lessons.length)}</p>
  
                  <ol className="mt-5 list-none p-0">
                    {section.lessons.map((lesson, i) => (
                      <LessonRow key={lesson.href} n={`${section.idx}.${i + 1}`} href={lesson.href} title={lesson.title} />
                    ))}
                  </ol>
                </article>
              ))
            )}
          </div>

          {/* Outside the scroll region, so the way on is always in view. */}
          {!q && (prev || next) && (
            <div className="flex shrink-0 justify-between gap-3 border-t border-border px-4 py-2 sm:px-6">
              {prev && (
                <PagerButton
                  label={`Previous section: ${prev.idx} ${prev.title}`}
                  onClick={() => pick(prev.id)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </PagerButton>
              )}
              {next && (
                <PagerButton
                  label={`Next section: ${next.idx} ${next.title}`}
                  onClick={() => pick(next.id)}
                  className="ml-auto"
                >
                  <ArrowRight className="h-5 w-5" />
                </PagerButton>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function LessonRow({ n, href, title }: { n: string; href: string; title: string }) {
  return (
    <li>
      <Link
        href={href}
        className="group grid grid-cols-[48px_minmax(0,1fr)_16px] items-center gap-3 px-1 py-3.5 transition-colors"
      >
        <span className="font-label text-[11px] text-slate">{n}</span>
        <span className="text-[15px] leading-normal text-ink-soft transition-colors group-hover:text-copper">{title}</span>
        <ArrowRight
          aria-hidden
          className="h-3.5 w-3.5 text-copper opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        />
      </Link>
    </li>
  );
}

function PagerButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "grid h-10 w-10 place-items-center rounded-full text-ink-soft transition-colors hover:bg-surface-2 hover:text-copper",
        className,
      )}
    >
      {children}
    </button>
  );
}
