"use client";

import { cn } from "@/lib/cn";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { tutorialPath, type TutorialTrackTree } from "@/types/tutorial";
import { ChevronDown } from "lucide-react";

const COLLAPSE_STORAGE_KEY = "nandscape:tutorial-sidebar-collapsed";

/**
 * The collapsed preference lives in localStorage, which is an external
 * store, so it's read through useSyncExternalStore rather than an effect
 * that calls setState. That's what keeps the server render (always
 * expanded, via getServerSnapshot) from mismatching hydration, without the
 * extra render an effect-based read would cost.
 */
let collapseListeners: (() => void)[] = [];

function subscribeToCollapse(callback: () => void): () => void {
  collapseListeners.push(callback);
  return () => {
    collapseListeners = collapseListeners.filter((l) => l !== callback);
  };
}

function getCollapseSnapshot(): boolean {
  return window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1";
}

/** There is no localStorage on the server, and no user preference to
 *  honour yet, so the rail always renders expanded there. */
function getCollapseServerSnapshot(): boolean {
  return false;
}

function setCollapsed(value: boolean): void {
  window.localStorage.setItem(COLLAPSE_STORAGE_KEY, value ? "1" : "0");
  for (const listener of collapseListeners) listener();
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
 * Scrolls a nav container so the current page's link sits near the top,
 * rather than wherever it happened to fall in a long track. Reads the DOM
 * directly instead of threading a ref onto the active link itself, since
 * NavList is shared between the mobile panel and the desktop rail and either
 * one might be the container that needs scrolling.
 *
 * Sets `scrollTop` directly rather than `scrollIntoView`, which would also be
 * free to scroll an ancestor (the whole page) to satisfy the request - this
 * container has its own scrollbar and nothing outside it should move.
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

/** The link tree, shared by the mobile panel and the desktop rail so the
 *  two can't drift apart. */
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
                        <NavLink
                          key={page.slug}
                          href={tutorialPath(track.slug, page.slug)}
                          label={page.title}
                        />
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const railCollapsed = useSyncExternalStore(
    subscribeToCollapse,
    getCollapseSnapshot,
    getCollapseServerSnapshot,
  );

  const toggleRail = () => setCollapsed(!railCollapsed);

  // Reset during render rather than in an effect (React's documented
  // pattern for state derived from a changing prop) - one render instead
  // of two. A fresh page means a fresh default collapse set too, so
  // whatever the reader had opened elsewhere folds back up and the section
  // they just navigated into opens in its place.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
    setCollapsedSections(defaultCollapsed(tracks, pathname));
  }

  const desktopNavRef = useRef<HTMLElement>(null);
  const mobileNavRef = useRef<HTMLElement>(null);
  useScrollToCurrentPage(desktopNavRef, !railCollapsed, pathname);
  useScrollToCurrentPage(mobileNavRef, mobileOpen, pathname);

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
      {/* Mobile: a plain collapsible panel in normal flow. */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          aria-expanded={mobileOpen}
          className="flex w-full items-center justify-between rounded-xl border border-border bg-surface-card px-4 py-3 text-sm font-semibold text-ink"
        >
          Contents
          <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", mobileOpen && "rotate-180")} />
        </button>

        <nav
          ref={mobileNavRef}
          className={`${mobileOpen ? "flex" : "hidden"} mt-2 max-h-[60vh] w-full flex-col gap-1 overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface-card px-3 py-3`}
        >
          <NavList tracks={tracks} collapsed={collapsedSections} onToggle={toggleSection} />
        </nav>
      </div>

      {/* Desktop: sticky rather than fixed. Fixed took the rail out of
          flow entirely, so it floated over whatever it happened to be on
          top of - which is how it ended up covering the footer. Sticky
          keeps it in the flex row, so it scrolls away naturally when the
          page runs out, and `top`/`max-h`/`overflow-y-auto` still give it
          its own independent scrollbar while a lesson is on screen. */}
      {railCollapsed ? (
        <button
          type="button"
          onClick={toggleRail}
          aria-label="Show tutorial navigation"
          title="Show tutorial navigation"
          className="sticky top-32 hidden shrink-0 rounded-lg border border-border bg-surface-card p-2 text-ink-soft transition-colors hover:text-copper-dark lg:block"
        >
          <PanelIcon />
        </button>
      ) : (
        <aside
          ref={desktopNavRef}
          className="sticky top-32 hidden max-h-[calc(100vh-10rem)] w-64 shrink-0 flex-col overflow-y-auto overscroll-contain pb-4 lg:flex"
        >
          <div className="mb-1 flex items-center justify-between pl-3">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate">Contents</span>
            <button
              type="button"
              onClick={toggleRail}
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
      )}
    </>
  );
}
