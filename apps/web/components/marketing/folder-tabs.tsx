"use client";

import { useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * The tutorials block as one folder with an index tab per subject.
 *
 * Pick a tab and the folder behind it changes colour and shows that subject's
 * sheet: its sections, the opening lessons of each, and a button straight into
 * lesson 1. Only one subject is ever open, so the block is the same height
 * whichever is picked and nothing on the page below it jumps.
 *
 * The folder's colour is a wash of the subject's brand colour mixed into the
 * page's card colour, so it follows light and dark. Full strength is kept for
 * the small marks - the tab's dot, the margin rule, the button. The sheet
 * keeps its own light palette (--paper-*) in both themes, because a sheet
 * that went dark with the page would stop reading as paper.
 *
 * On a phone the tabs scroll sideways with the next one peeking, and each
 * section lists three lessons rather than six, so one subject is about a
 * screen tall.
 */

export interface FolderLesson {
  title: string;
  href: string;
}

export interface FolderSection {
  slug: string;
  /** Short heading for the section's column. */
  name: string;
  /** Every lesson in the section, not just the previewed ones. */
  count: number;
  /** The opening lessons, in order: up to MAX_SHOWN plus the one after. */
  lessons: FolderLesson[];
}

export interface Folder {
  id: string;
  /** What the tab says. Kept short; the sheet carries the full title. */
  tab: string;
  title: string;
  blurb: string;
  /** Brand colour, and whichever of near-black or white reads on it. */
  color: string;
  ink: string;
  count: number;
  sections: FolderSection[];
}

/** Lessons listed per section: on a phone, and from md up. */
const PHONE_SHOWN = 3;
const MAX_SHOWN = 6;

const wash = (color: string) => `color-mix(in srgb, ${color} 26%, var(--surface-card))`;

function MoreLink({ section, shown, className }: { section: FolderSection; shown: number; className?: string }) {
  const rest = section.count - shown;
  if (rest <= 0) return null;
  // Continue from the first lesson the list left out.
  const next = section.lessons[shown] ?? section.lessons[section.lessons.length - 1];
  return (
    <Link
      href={next.href}
      className={cn(
        "items-center pl-8 text-[13px] font-bold text-paper-accent hover:underline md:pt-2",
        "min-h-10 md:min-h-0",
        className,
      )}
    >
      {rest} more in this section →
    </Link>
  );
}

export function FolderTabs({ folders }: { folders: Folder[] }) {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const folder = folders[active];
  if (!folder) return null;

  // Arrow keys move between tabs, as the tabs pattern expects.
  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (active + step + folders.length) % folders.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  const first = folder.sections[0]?.lessons[0];
  // Lessons are numbered straight through the subject, not per section.
  const starts = folder.sections.map((_, i) => folder.sections.slice(0, i).reduce((n, s) => n + s.count, 0));

  return (
    <div>
      <div
        role="tablist"
        aria-label="Subjects"
        onKeyDown={onKeyDown}
        className="-mx-6 flex items-end gap-1 overflow-x-auto px-6 scrollbar-none sm:mx-0 sm:px-0"
      >
        {folders.map((f, i) => {
          const on = i === active;
          return (
            <button
              key={f.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`folder-tab-${f.id}`}
              aria-selected={on}
              aria-controls="folder-panel"
              tabIndex={on ? 0 : -1}
              onClick={() => setActive(i)}
              className={cn(
                "inline-flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-t-[12px] px-3.5 text-sm transition-[height,background-color,color] duration-200 ease-out sm:gap-2.5 sm:rounded-t-[14px] sm:px-[18px] sm:text-[15px] motion-reduce:transition-none",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-copper",
                on
                  ? "h-[46px] font-extrabold text-ink sm:h-[50px]"
                  : "h-10 bg-surface-2 font-semibold text-ink-soft hover:text-ink sm:h-[42px]",
              )}
              style={on ? { background: wash(f.color) } : undefined}
            >
              <span aria-hidden className="h-2 w-2 shrink-0 rounded-[3px] sm:h-[9px] sm:w-[9px]" style={{ background: f.color }} />
              {f.tab}
              <span className="hidden font-label text-xs font-bold text-slate sm:inline">{f.count}</span>
            </button>
          );
        })}
      </div>

      <div
        id="folder-panel"
        role="tabpanel"
        aria-labelledby={`folder-tab-${folder.id}`}
        className={cn(
          "rounded-[18px] p-2.5 transition-[background-color] duration-200 sm:rounded-[22px] sm:p-4 motion-reduce:transition-none",
          active === 0 && "rounded-tl-none sm:rounded-tl-none",
        )}
        style={{ background: wash(folder.color) }}
      >
        <div
          className="relative flex flex-col gap-[18px] rounded-xl bg-paper py-5 pl-[34px] pr-4 text-paper-ink shadow-[0_1px_2px_rgba(8,7,8,0.08),0_14px_30px_-20px_rgba(8,7,8,0.45)] sm:gap-[22px] sm:rounded-[14px] sm:pb-7 sm:pl-[52px] sm:pr-7 sm:pt-[26px]"
          style={{ "--folder": folder.color } as CSSProperties}
        >
          {/* The margin rule, in the subject's colour. */}
          <span aria-hidden className="absolute inset-y-4 left-4 w-0.5 rounded-sm bg-[var(--folder)] opacity-55 sm:inset-y-[18px] sm:left-7" />

          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3.5">
            <div className="max-w-[40rem]">
              <p className="mb-1 font-label text-[11.5px] font-bold text-paper-muted sm:mb-1.5 sm:text-xs">
                {folder.count} {folder.count === 1 ? "lesson" : "lessons"} · {folder.sections.length}{" "}
                {folder.sections.length === 1 ? "section" : "sections"}
              </p>
              <h3 className="text-[22px] font-extrabold tracking-[-0.02em] sm:text-[26px]">{folder.title}</h3>
              <p className="mt-1.5 text-sm leading-normal text-paper-ink-soft sm:text-[15px]">{folder.blurb}</p>
            </div>
            {first && (
              <Link
                href={first.href}
                className="hidden h-[46px] items-center gap-2 whitespace-nowrap rounded-xl px-5 text-[15px] font-bold transition-[filter] hover:brightness-95 md:inline-flex"
                style={{ background: folder.color, color: folder.ink }}
              >
                Start with lesson 1
                <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
              </Link>
            )}
          </div>

          <div className="grid gap-x-8 gap-y-4 md:grid-cols-[repeat(auto-fit,minmax(230px,1fr))] md:gap-y-2">
            {folder.sections.map((section, si) => {
              const start = starts[si];
              return (
                <div key={section.slug}>
                  <div className="mb-0.5 flex items-baseline justify-between gap-2 border-b border-paper-line pb-1.5 sm:pb-2">
                    <span className="text-xs font-extrabold uppercase tracking-[0.02em] sm:text-[13px]">{section.name}</span>
                    <span className="font-label text-[11.5px] font-bold text-paper-muted sm:text-xs">{section.count}</span>
                  </div>
                  {section.lessons.slice(0, MAX_SHOWN).map((lesson, j) => (
                    <Link
                      key={lesson.href}
                      href={lesson.href}
                      className={cn(
                        "group/lesson min-h-11 items-center gap-3 border-b border-paper-line text-[14.5px] leading-[1.35] text-paper-ink md:min-h-0 md:py-2",
                        j < PHONE_SHOWN ? "flex" : "hidden md:flex",
                      )}
                    >
                      <span className="w-5 shrink-0 font-label text-xs font-bold text-paper-muted">{start + j + 1}</span>
                      <span className="transition-colors group-hover/lesson:text-paper-accent">{lesson.title}</span>
                    </Link>
                  ))}
                  <MoreLink section={section} shown={PHONE_SHOWN} className="flex md:hidden" />
                  <MoreLink section={section} shown={MAX_SHOWN} className="hidden md:inline-flex" />
                </div>
              );
            })}
          </div>

          {first && (
            <Link
              href={first.href}
              className="flex h-12 items-center justify-center rounded-xl text-[15px] font-bold md:hidden"
              style={{ background: folder.color, color: folder.ink }}
            >
              Start with lesson 1
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
