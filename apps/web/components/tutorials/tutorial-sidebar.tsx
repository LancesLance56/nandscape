"use client";

import { cn } from "@/lib/cn";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { tutorialPath, type TutorialTrackTree } from "@/types/tutorial";
import { ChevronDown } from "lucide-react";

const OPEN_STORAGE_KEY = "nandscape:tutorial-sidebar-open";

/**
 * Whether the rail is expanded lives in localStorage, which is an external
 * store, so it's read through useSyncExternalStore rather than an effect that
 * calls setState. That keeps the server render (always collapsed, via
 * getServerSnapshot) from mismatching hydration without the extra render an
 * effect-based read would cost.
 *
 * The rail is a hidden-by-default overlay: it opens over the page and never
 * shifts the centred lesson column. "Open" only persists within a page - it
 * closes again on navigation (see the effect below) so a fresh lesson always
 * starts with the reading column unobstructed.
 */
let openListeners: (() => void)[] = [];

function subscribeToOpen(callback: () => void): () => void {
  openListeners.push(callback);
  return () => {
    openListeners = openListeners.filter((l) => l !== callback);
  };
}

/** Anything but an explicit "1" counts as closed, so the default (no stored
 *  value) is hidden. */
function getOpenSnapshot(): boolean {
  return window.localStorage.getItem(OPEN_STORAGE_KEY) === "1";
}

/** No localStorage on the server, and the rail is hidden by default. */
function getOpenServerSnapshot(): boolean {
  return false;
}

function setOpen(value: boolean): void {
  window.localStorage.setItem(OPEN_STORAGE_KEY, value ? "1" : "0");
  for (const listener of openListeners) listener();
}

function PanelIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="12" height="10" rx="2" />
      <path d="M6.5 3v10" />
    </svg>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      // Marks the link a scroll effect elsewhere in this file looks for, so
      // the nav can find "where the reader is" without threading a ref down
      // through every level of the tree.
      data-current-page={active ? "true" : undefined}
      className={`block rounded-lg px-3 py-1.5 text-sm transition-colors ${
        active ? "bg-copper-bg font-semibold text-copper-dark" : "text-ink-soft hover:bg-surface-2 hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
}

/**
 * Finds which section, if any, contains the current page.
 *
 * Returns null on the tutorials index and anywhere else that isn't a specific
 * page, since there is nothing there to be "at" yet - collapsing every
 * section in that case would hide the whole tree for no reason.
 */
function activeSectionId(tracks: TutorialTrackTree[], pathname: string): string | null {
  for (const track of tracks) {
    for (const section of track.sections) {
      for (const page of section.pages) {
        if (tutorialPath(track.slug, page.slug) === pathname) return section.id;
      }
    }
  }
  return null;
}

/**
 * The collapse set a fresh visit to `pathname` should open with: only the
 * section the current page lives in, everything else closed. Recomputed on
 * every navigation rather than merged with whatever the reader had toggled
 * open, so the sidebar always reflects where they are now rather than
 * accumulating every section they have ever glanced into.
 */
function defaultCollapsed(tracks: TutorialTrackTree[], pathname: string): Set<string> {
  const active = activeSectionId(tracks, pathname);
  const collapsed = new Set<string>();
  if (active === null) return collapsed;
  for (const track of tracks) {
    for (const section of track.sections) {
      if (section.id !== active) collapsed.add(section.id);
    }
  }
  return collapsed;
}

/**
 * Scrolls the nav container so the current page's link sits near the top,
 * rather than wherever it happened to fall in a long track. Reads the DOM
 * directly instead of threading a ref onto the active link itself.
 *
 * Sets `scrollTop` directly rather than `scrollIntoView`, which would also be
 * free to scroll an ancestor to satisfy the request - this container has its
 * own scrollbar and nothing outside it should move.
 */
function useScrollToCurrentPage(containerRef: RefObject<HTMLElement | null>, active: boolean, pathname: string) {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    const link = container?.querySelector<HTMLElement>('[data-current-page="true"]');
    if (!container || !link) return;

    const linkTop = link.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
    container.scrollTop = Math.max(0, linkTop - 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- containerRef is stable
  }, [active, pathname]);
}

interface NavListProps {
  tracks: TutorialTrackTree[];
  collapsed: Set<string>;
  onToggle: (sectionId: string) => void;
}

/** The link tree. */
function NavList({ tracks, collapsed, onToggle }: NavListProps): ReactNode {
  return (
    <>
      <NavLink href="/tutorials" label="All tutorials" />

      {tracks
        .filter((track) => track.pageCount > 0)
        .map((track) => (
          <div key={track.id} className="mt-3">
            <Link
              href={`/tutorials/${track.slug}`}
              className="block px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-copper-dark hover:text-copper"
            >
              {track.title}
            </Link>
            {track.sections.map((section) => {
              const open = !collapsed.has(section.id);
              return (
                <div key={section.id} className="mt-1">
                  <button
                    type="button"
                    onClick={() => onToggle(section.id)}
                    aria-expanded={open}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-[11px] font-semibold text-slate hover:text-ink"
                  >
                    {section.title}
                    <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-180")} />
                  </button>
                  {open && (
                    <div className="mt-1 flex flex-col gap-0.5 border-l border-border pl-3">
                      {section.pages.map((page) => (
                        <NavLink key={page.slug} href={tutorialPath(track.slug, page.slug)} label={page.title} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
    </>
  );
}

export function TutorialSidebar({ tracks = [] }: { tracks?: TutorialTrackTree[] }) {
  const pathname = usePathname();
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => defaultCollapsed(tracks, pathname));
  const open = useSyncExternalStore(subscribeToOpen, getOpenSnapshot, getOpenServerSnapshot);

  const navRef = useRef<HTMLElement>(null);
  useScrollToCurrentPage(navRef, open, pathname);

  // Reset the section-collapse set during render (React's documented pattern
  // for state derived from a changing prop) - one render instead of two.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setCollapsedSections(defaultCollapsed(tracks, pathname));
  }

  // Close the rail on navigation. Skipped on the very first run so a hard load
  // doesn't write to storage before the reader has touched anything - the
  // default is already closed.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setOpen(false);
  }, [pathname]);

  // Esc closes it, matching every other overlay on the site.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  return (
    <>
      {/* A tab pinned to the left edge, clear of the fixed navbar. This is the
          only affordance while the rail is closed; it slides out of the way
          when the panel is open, which carries its own close button. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Show tutorial navigation"
        aria-expanded={open}
        className={cn(
          "fixed left-0 top-1/2 z-30 flex -translate-y-1/2 items-center gap-2 rounded-r-xl border border-l-0 border-border bg-surface-card py-3 pl-2 pr-2.5 text-ink-soft shadow-[0_8px_24px_rgba(21,27,24,0.10)] transition hover:text-copper-dark",
          open ? "pointer-events-none -translate-x-full opacity-0" : "opacity-100",
        )}
      >
        <PanelIcon />
        <span className="text-[10px] font-bold uppercase tracking-wide [writing-mode:vertical-rl]">Contents</span>
      </button>

      {/* Backdrop: dims the page on narrow screens where the panel overlaps the
          reading column; on lg+ it's transparent and just there so a click
          anywhere outside closes the rail. */}
      {open && (
        <div
          aria-hidden
          onClick={() => setOpen(false)}
          className="fixed inset-0 top-20 z-30 bg-ink/40 lg:bg-transparent"
        />
      )}

      <aside
        ref={navRef}
        aria-label="Tutorial navigation"
        aria-hidden={!open}
        className={cn(
          "fixed left-0 top-20 bottom-4 z-40 flex w-[19rem] max-w-[86vw] flex-col overflow-y-auto overscroll-contain rounded-r-2xl border border-l-0 border-border bg-surface-card px-4 py-4 shadow-[0_24px_60px_rgba(21,27,24,0.16)] transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "-translate-x-[110%]",
        )}
      >
        <div className="mb-2 flex items-center justify-between pl-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate">Contents</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Hide tutorial navigation"
            title="Hide tutorial navigation"
            className="rounded-md p-1 text-slate transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <PanelIcon />
          </button>
        </div>
        <nav className="flex flex-col gap-1">
          <NavList tracks={tracks} collapsed={collapsedSections} onToggle={toggleSection} />
        </nav>
      </aside>
    </>
  );
}
