"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { TutorialNavTree, TutorialTrackTree } from "@/types/tutorial";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={`block rounded-lg px-3 py-1.5 text-sm transition-colors ${
        active ? "bg-copper-bg font-semibold text-copper-dark" : "text-ink-soft hover:bg-surface-2 hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
}

interface NavListProps {
  tree: TutorialNavTree;
  tracks: TutorialTrackTree[];
  collapsed: Set<string>;
  onToggle: (sectionId: string) => void;
}

/** The actual link tree, shared by the mobile collapsible panel and the
 *  desktop fixed rail below so the two don't drift out of sync. */
function NavList({ tree, tracks, collapsed, onToggle }: NavListProps): ReactNode {
  // Sections that belong to a track render under that track's heading
  // below; anything left over (a section with no track yet) still needs a
  // home, so it falls through to the flat list underneath.
  const trackedSectionIds = new Set(tracks.flatMap((t) => t.sections.map((s) => s.id)));
  const looseSections = tree.sections.filter((s) => !trackedSectionIds.has(s.id));

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
                    <ChevronIcon open={open} />
                  </button>
                  {open && (
                    <div className="mt-1 flex flex-col gap-0.5 border-l border-border pl-3">
                      {section.pages.map((page) => (
                        <NavLink key={page.slug} href={`/tutorials/${page.slug}`} label={page.title} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

      {tree.standalone.map((page) => (
        <NavLink key={page.slug} href={`/tutorials/${page.slug}`} label={page.title} />
      ))}

      {looseSections.map((section) => {
        const open = !collapsed.has(section.id);
        return (
          <div key={section.id} className="mt-2">
            <button
              type="button"
              onClick={() => onToggle(section.id)}
              aria-expanded={open}
              className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-[11px] font-semibold text-slate hover:text-ink"
            >
              {section.title}
              <ChevronIcon open={open} />
            </button>
            {open && (
              <div className="mt-1 flex flex-col gap-0.5 border-l border-border pl-3">
                {section.pages.map((page) => (
                  <NavLink key={page.slug} href={`/tutorials/${page.slug}`} label={page.title} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

export function TutorialSidebar({
  tree,
  tracks = [],
}: {
  tree: TutorialNavTree;
  tracks?: TutorialTrackTree[];
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  // Below lg the sidebar collapses into a toggleable panel instead of the
  // fixed rail - there's no room for a permanent 256px column and readable
  // tutorial text on a phone-width screen. Closed by default there.
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Reset during render rather than in an effect (React's recommended
  // pattern for "state derived from a prop change") - collapses the two
  // renders an effect-based reset would cause into one.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  const toggle = (sectionId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  return (
    <>
      {/* Reserves the rail's horizontal space in the flex row at lg+ (the
          actual rail below is `fixed`, so it no longer occupies flex space
          on its own) so <main> keeps the same left offset it always had.
          Below lg this *is* the sidebar: the toggle button plus an inline
          collapsible panel, in normal document flow. */}
      <div className="lg:w-64 lg:shrink-0">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          aria-expanded={mobileOpen}
          className="flex w-full items-center justify-between rounded-xl border border-border bg-surface-card px-4 py-3 text-sm font-semibold text-ink lg:hidden"
        >
          Contents
          <ChevronIcon open={mobileOpen} />
        </button>

        <nav
          className={`${mobileOpen ? "flex" : "hidden"} mt-2 max-h-[60vh] w-full flex-col gap-1 overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface-card px-3 py-3 lg:hidden`}
        >
          <NavList tree={tree} tracks={tracks} collapsed={collapsed} onToggle={toggle} />
        </nav>
      </div>

      {/* Desktop: pinned to the viewport instead of `sticky` within the flex
          row, so it can't partially unstick and trail the page scroll once
          the row's bottom edge nears the viewport (what a `sticky` rail
          does once the content below it runs out of room - visible as the
          nav "scrolling along with the page a little" near the bottom of a
          long tutorial). The outer layer re-runs the page's own
          mx-auto/max-w-330/px-* centering across the full viewport width so
          the rail lands at the exact spot it would have in-flow, without
          hand-computing a pixel `left` offset; it's pointer-events-none so
          it never blocks clicks over the content beside it, and only the
          rail itself re-enables pointer events. */}
      <div className="pointer-events-none fixed inset-x-0 top-32 bottom-6 z-10 hidden lg:block">
        <div className="mx-auto h-full max-w-330 px-4 sm:px-10">
          <nav className="pointer-events-auto flex h-full w-64 flex-col gap-1 overflow-y-auto overscroll-contain py-4">
            <NavList tree={tree} tracks={tracks} collapsed={collapsed} onToggle={toggle} />
          </nav>
        </div>
      </div>
    </>
  );
}
